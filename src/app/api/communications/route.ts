import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { processOutboxBatch } from "@/lib/outbox-worker";
import { requestApproval } from "@/lib/approvals";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");

    const campaigns = await prisma.commCampaign.findMany({
      where: programId ? { programId } : undefined,
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const outboxStats = {
      queued: await prisma.outboxEvent.count({ where: { status: "queued" } }),
      processing: await prisma.outboxEvent.count({ where: { status: "processing" } }),
      sent: await prisma.outboxEvent.count({ where: { status: "sent" } }),
      failed: await prisma.outboxEvent.count({ where: { status: "failed" } }),
      dead: await prisma.outboxEvent.count({ where: { status: "dead" } }),
    };

    const recentDeliveries = await prisma.messageDelivery.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ campaigns, outboxStats, recentDeliveries });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, programId, userId = "admin" } = body;

    // Action 1: PROCESS_OUTBOX_BATCH
    if (action === "process_outbox") {
      const stats = await processOutboxBatch(15);
      return NextResponse.json({ success: true, stats });
    }

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    // Action 2: CREATE_CAMPAIGN
    if (action === "create_campaign") {
      const { name, channel = "EMAIL", subject, body: content } = body;

      const campaign = await prisma.commCampaign.create({
        data: {
          programId,
          name,
          channel,
          subject,
          body: content,
          idempotencyKey: `camp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          status: "DRAFT",
        },
      });

      return NextResponse.json({ campaign });
    }

    // Action 3: REQUEST_SEND (Approval Gate)
    if (action === "send") {
      const { campaignId } = body;
      const campaign = await prisma.commCampaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }

      const activeParticipants = await prisma.participant.findMany({
        where: { programId, status: "ACTIVE" },
      });

      const diffSummary = {
        action: `Bulk Send Campaign "${campaign.name}" via ${campaign.channel}`,
        campaignId: campaign.id,
        channel: campaign.channel,
        subject: campaign.subject,
        recipientCount: activeParticipants.length,
        recipientsSample: activeParticipants.slice(0, 5).map((p) => p.email),
      };

      const approval = await requestApproval({
        programId,
        actionType: "BULK_SEND",
        targetType: "CommCampaign",
        targetId: campaign.id,
        requestedBy: userId,
        diffSummary,
      });

      await prisma.commCampaign.update({
        where: { id: campaign.id },
        data: { status: "PENDING_APPROVAL" },
      });

      return NextResponse.json({
        approvalRequired: true,
        approvalId: approval.id,
        diffSummary,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
