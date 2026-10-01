import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { optimizeMentorMatching } from "@/lib/optimizer-client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");

    const mentors = await prisma.mentor.findMany({
      where: programId ? { programId } : undefined,
      include: {
        assignments: {
          include: {
            team: true,
          },
        },
      },
    });

    return NextResponse.json({ mentors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = "match", programId } = body;

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    if (action === "match") {
      const teams = await prisma.team.findMany({
        where: { programId },
      });

      const mentors = await prisma.mentor.findMany({
        where: { programId },
      });

      if (teams.length === 0 || mentors.length === 0) {
        return NextResponse.json(
          { error: "Both teams and mentors must exist in this program" },
          { status: 400 }
        );
      }

      const teamInputs = teams.map((t) => ({
        id: t.id,
        name: t.name,
        techStack: t.techStack ? t.techStack.split(",").map((s) => s.trim()) : [],
        timezone: Math.round(t.timezoneAvg || 0),
      }));

      const mentorInputs = mentors.map((m) => ({
        id: m.id,
        name: m.name,
        expertise: m.expertise ? m.expertise.split(",").map((s) => s.trim()) : [],
        capacity: m.capacity,
        timezone: m.timezone,
      }));

      const result = await optimizeMentorMatching({
        teams: teamInputs,
        mentors: mentorInputs,
      });

      // Persist assignments
      for (const match of result.matches) {
        await prisma.mentorAssignment.upsert({
          where: {
            teamId_mentorId: {
              teamId: match.teamId,
              mentorId: match.mentorId,
            },
          },
          update: {
            matchScore: match.overlapScore,
            explainability: match.explainability,
            status: "CONFIRMED",
          },
          create: {
            programId,
            teamId: match.teamId,
            mentorId: match.mentorId,
            matchScore: match.overlapScore,
            explainability: match.explainability,
            status: "CONFIRMED",
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          programId,
          action: "MENTORS_MATCHED",
          targetType: "MentorAssignment",
          diff: JSON.stringify({ matchesCount: result.matches.length }),
        },
      });

      return NextResponse.json({
        success: true,
        matches: result.matches,
        unmatchedTeams: result.unmatchedTeams,
        status: result.status,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
