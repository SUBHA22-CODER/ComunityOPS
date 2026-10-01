import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { executeApproval, rejectApproval } from "@/lib/approvals";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");
    const status = searchParams.get("status");

    const approvals = await prisma.approval.findMany({
      where: {
        ...(programId ? { programId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        program: true,
        requester: true,
        approver: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ approvals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { approvalId, action, userId = "admin", reason } = body;

    if (!approvalId || !action) {
      return NextResponse.json(
        { error: "approvalId and action (approve | reject) are required" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      const result = await executeApproval(approvalId, userId);
      return NextResponse.json({ success: true, result });
    } else if (action === "reject") {
      const result = await rejectApproval(approvalId, userId, reason);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
