import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");

    const applications = await prisma.application.findMany({
      where: programId ? { programId } : undefined,
      include: {
        participant: true,
        answers: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ applications });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { programId, applicants } = body;

    if (!programId || !Array.isArray(applicants)) {
      return NextResponse.json(
        { error: "programId and applicants array are required" },
        { status: 400 }
      );
    }

    const createdParticipants = [];

    for (const applicant of applicants) {
      const { name, email, skills = "", rolePref = "Full Stack", timezone = 0, bio = "" } = applicant;
      if (!name || !email) continue;

      const participant = await prisma.participant.upsert({
        where: {
          programId_email: {
            programId,
            email,
          },
        },
        update: {
          name,
          skills: Array.isArray(skills) ? skills.join(", ") : skills,
          rolePref,
          timezone: Number(timezone) || 0,
          bio,
        },
        create: {
          programId,
          name,
          email,
          skills: Array.isArray(skills) ? skills.join(", ") : skills,
          rolePref,
          timezone: Number(timezone) || 0,
          bio,
          status: "ACTIVE",
        },
      });

      // Ensure application record exists
      await prisma.application.create({
        data: {
          programId,
          participantId: participant.id,
          status: "ACCEPTED",
        },
      });

      createdParticipants.push(participant);
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        programId,
        action: "APPLICATIONS_IMPORTED",
        targetType: "Application",
        diff: JSON.stringify({ count: createdParticipants.length }),
      },
    });

    return NextResponse.json({
      success: true,
      importedCount: createdParticipants.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
