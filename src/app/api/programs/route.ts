import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const programs = await prisma.program.findMany({
      include: {
        _count: {
          select: {
            participants: true,
            teams: true,
            submissions: true,
            approvals: true,
            certificates: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ programs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, slug, description, teamSizeMin = 3, teamSizeMax = 5 } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const program = await prisma.program.create({
      data: {
        name,
        slug,
        description,
        teamSizeMin,
        teamSizeMax,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        programId: program.id,
        action: "PROGRAM_CREATED",
        targetType: "Program",
        targetId: program.id,
        diff: JSON.stringify({ name, slug }),
      },
    });

    return NextResponse.json({ program }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
