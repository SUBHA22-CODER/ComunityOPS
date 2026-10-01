import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { optimizeTeamFormation } from "@/lib/optimizer-client";
import { requestApproval } from "@/lib/approvals";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");

    const teams = await prisma.team.findMany({
      where: programId ? { programId } : undefined,
      include: {
        members: {
          include: {
            participant: true,
          },
        },
        submissions: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ teams });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, programId, minTeamSize = 3, maxTeamSize = 5, userId = "admin" } = body;

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    // Action 1: GENERATE (Preview optimization without mutating state)
    if (action === "generate") {
      const participants = await prisma.participant.findMany({
        where: { programId, status: "ACTIVE" },
      });

      const participantInputs = participants.map((p) => ({
        id: p.id,
        name: p.name,
        skills: p.skills ? p.skills.split(",").map((s) => s.trim()) : [],
        role: p.rolePref,
        timezone: p.timezone,
        conflictIds: p.conflictIds ? p.conflictIds.split(",") : [],
      }));

      const result = await optimizeTeamFormation({
        participants: participantInputs,
        minTeamSize,
        maxTeamSize,
      });

      return NextResponse.json({
        preview: true,
        teams: result.teams,
        unassigned: result.unassigned,
        status: result.status,
        executionTimeMs: result.executionTimeMs,
      });
    }

    // Action 2: COMMIT_DRAFT (Saves draft teams)
    if (action === "commit_draft") {
      const { formedTeams } = body;
      if (!Array.isArray(formedTeams)) {
        return NextResponse.json({ error: "formedTeams is required" }, { status: 400 });
      }

      // Clear existing draft teams
      await prisma.team.deleteMany({
        where: { programId, status: "DRAFT" },
      });

      for (const t of formedTeams) {
        const team = await prisma.team.create({
          data: {
            programId,
            name: t.name,
            status: "DRAFT",
            techStack: t.skillCoverage ? t.skillCoverage.join(", ") : "",
            timezoneAvg: t.timezoneSpread || 0,
            optimizerNotes: t.explainability,
          },
        });

        for (const memberId of t.memberIds) {
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              participantId: memberId,
              role: "Member",
            },
          });
        }
      }

      return NextResponse.json({ success: true, count: formedTeams.length });
    }

    // Action 3: REQUEST_PUBLISH (Requires Approval Gate)
    if (action === "publish") {
      const draftTeams = await prisma.team.findMany({
        where: { programId, status: "DRAFT" },
        include: { members: { include: { participant: true } } },
      });

      if (draftTeams.length === 0) {
        return NextResponse.json(
          { error: "No draft teams found to publish" },
          { status: 400 }
        );
      }

      const diffSummary = {
        action: "Publish Formed Teams",
        teamsCount: draftTeams.length,
        totalParticipants: draftTeams.reduce((sum, t) => sum + t.members.length, 0),
        teams: draftTeams.map((t) => ({
          name: t.name,
          membersCount: t.members.length,
          members: t.members.map((m) => m.participant.name),
        })),
      };

      const approval = await requestApproval({
        programId,
        actionType: "PUBLISH_TEAMS",
        targetType: "Team",
        targetId: programId,
        requestedBy: userId,
        diffSummary,
      });

      return NextResponse.json({
        approvalRequired: true,
        approvalId: approval.id,
        message: "Publishing teams requires approval gate confirmation",
        diffSummary,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
