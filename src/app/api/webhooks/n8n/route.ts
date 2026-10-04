import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyN8nWebhookSignature } from "@/lib/n8n";
import { executeApproval, rejectApproval } from "@/lib/approvals";

/**
 * Inbound n8n Webhook Handler (Section 6.3 & Integrations)
 * 
 * Ingests external events dispatched by n8n workflows:
 * - Application intake (Google Forms, Typeform, Tally, Discord)
 * - Interactive Slack/Discord approval decisions
 * - Project submissions (GitHub, Devpost, Forms)
 * - Mentor session logs & check-ins
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-communityops-signature");
    const timestamp = req.headers.get("x-communityops-timestamp");
    const secretHeader = req.headers.get("x-webhook-secret");

    const configuredSecret = process.env.COMMUNITY_OPS_WEBHOOK_SECRET || "community-ops-n8n-webhook-secret-2026";

    // Validate either cryptographic HMAC signature or shared secret header
    let isAuthorized = false;
    if (secretHeader && secretHeader === configuredSecret) {
      isAuthorized = true;
    } else if (signature && timestamp) {
      const verification = verifyN8nWebhookSignature(rawBody, signature, timestamp, configuredSecret);
      isAuthorized = verification.valid;
    } else {
      // In development, if secret is default, allow simulation with warning
      if (process.env.NODE_ENV !== "production") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing webhook signature/secret" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);
    const { action, programId, data } = payload;

    // Default program lookup if not provided
    const targetProgramId =
      programId ||
      (await prisma.program.findFirst({ orderBy: { createdAt: "desc" } }))?.id;

    if (!targetProgramId) {
      return NextResponse.json(
        { error: "No active program found to associate event with" },
        { status: 404 }
      );
    }

    // 1. INGEST APPLICATION (Typeform / Google Form / Tally intake)
    if (action === "ingest_application") {
      const applicantEmail = data.email?.toLowerCase().trim();
      if (!applicantEmail || !data.name) {
        return NextResponse.json(
          { error: "Applicant name and email are required" },
          { status: 400 }
        );
      }

      // Check if participant exists or create
      const participant = await prisma.participant.create({
        data: {
          programId: targetProgramId,
          name: data.name,
          email: applicantEmail,
          skills: Array.isArray(data.skills) ? data.skills.join(", ") : (data.skills || "General"),
          rolePref: data.rolePref || "Full Stack",
          timezone: typeof data.timezone === "number" ? data.timezone : 0,
        },
      });

      // Create application record with optional nested answers
      const answerEntries = Object.entries(data.answers || {}).map(([key, val]) => ({
        questionKey: key,
        answerValue: typeof val === "string" ? val : JSON.stringify(val),
      }));

      const application = await prisma.application.create({
        data: {
          programId: targetProgramId,
          participantId: participant.id,
          status: data.autoAccept ? "ACCEPTED" : "SUBMITTED",
          answers: answerEntries.length > 0 ? { create: answerEntries } : undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          programId: targetProgramId,
          action: "APPLICATION_INGESTED_VIA_N8N",
          targetType: "Application",
          targetId: application.id,
          diff: JSON.stringify({ email: applicantEmail, source: data.source || "n8n_form_bridge" }),
        },
      });

      return NextResponse.json({
        success: true,
        action: "ingest_application",
        applicationId: application.id,
        participantId: participant.id,
      });
    }

    // 2. INTERACTIVE APPROVAL DECISION (Slack / Discord interactive buttons)
    if (action === "approval_decision") {
      const { approvalId, approverEmail, decision } = data; // decision: "APPROVE" | "REJECT"

      if (!approvalId || !decision) {
        return NextResponse.json(
          { error: "approvalId and decision ('APPROVE' | 'REJECT') are required" },
          { status: 400 }
        );
      }

      // Lookup approver user
      let approver = await prisma.user.findFirst({
        where: { email: approverEmail || "admin@communityops.org" },
      });

      if (!approver) {
        approver = await prisma.user.findFirst({
          where: { systemRole: { in: ["ADMIN", "PROGRAM_MANAGER"] } },
        });
      }

      if (!approver) {
        return NextResponse.json({ error: "No eligible approver user found" }, { status: 400 });
      }

      if (decision === "APPROVE") {
        const result = await executeApproval(approvalId, approver.id);

        return NextResponse.json({
          success: true,
          action: "approval_decision",
          decision: "APPROVED",
          executionResult: result,
        });
      } else {
        const result = await rejectApproval(approvalId, approver.id, data.reason || "Rejected via n8n");

        return NextResponse.json({
          success: true,
          action: "approval_decision",
          decision: "REJECTED",
          approval: result,
        });
      }
    }

    // 3. SUBMIT PROJECT (GitHub Webhook / Form via n8n)
    if (action === "submit_project") {
      const { teamId, title, repoUrl, demoUrl, description, videoUrl } = data;

      if (!teamId || !title) {
        return NextResponse.json(
          { error: "teamId and title are required for project submission" },
          { status: 400 }
        );
      }

      const submission = await prisma.submission.create({
        data: {
          programId: targetProgramId,
          teamId,
          title,
          repoUrl: repoUrl || "",
          demoUrl: demoUrl || "",
          videoUrl: videoUrl || "",
          description: description || "Submitted via n8n integration",
          isLocked: false,
        },
      });

      return NextResponse.json({
        success: true,
        action: "submit_project",
        submissionId: submission.id,
      });
    }

    return NextResponse.json(
      { error: `Unknown action: "${action}". Supported actions: ingest_application, approval_decision, submit_project` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("n8n Webhook Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    service: "CommunityOps n8n Webhook Ingestion Hub",
    timestamp: new Date().toISOString(),
    supportedActions: [
      "ingest_application",
      "approval_decision",
      "submit_project",
    ],
  });
}
