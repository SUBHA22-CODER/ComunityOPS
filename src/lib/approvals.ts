import prisma from "./db";
import { enqueueOutboxEvent } from "./outbox-worker";
import { signCertificatePayload, generateCertificateId, hashEmail } from "./crypto";

/**
 * Approval Gates on Irreversible Actions (Section 6.5)
 * 
 * Supports:
 * - PUBLISH_TEAMS
 * - PUBLISH_RESULTS
 * - BULK_SEND
 * - ISSUE_CERTIFICATES
 */

export type ActionType =
  | "PUBLISH_TEAMS"
  | "PUBLISH_RESULTS"
  | "BULK_SEND"
  | "ISSUE_CERTIFICATES";

export interface CreateApprovalRequest {
  programId: string;
  actionType: ActionType;
  targetType: string;
  targetId: string;
  requestedBy: string;
  diffSummary: Record<string, any>;
  expiresInHours?: number;
}

/**
 * Requests an approval for an irreversible action
 */
export async function requestApproval(params: CreateApprovalRequest) {
  const idempotencyKey = `appr_${params.actionType}_${params.targetId}_${Date.now()}`;
  const expiresAt = new Date(
    Date.now() + (params.expiresInHours || 48) * 3600 * 1000
  );

  const approval = await prisma.approval.create({
    data: {
      programId: params.programId,
      actionType: params.actionType,
      targetType: params.targetType,
      targetId: params.targetId,
      requestedBy: params.requestedBy,
      status: "pending",
      diff: JSON.stringify(params.diffSummary),
      idempotencyKey,
      expiresAt,
    },
  });

  // Record in audit log
  await prisma.auditLog.create({
    data: {
      programId: params.programId,
      actorId: params.requestedBy,
      action: `APPROVAL_REQUESTED_${params.actionType}`,
      targetType: params.targetType,
      targetId: params.targetId,
      diff: JSON.stringify(params.diffSummary),
    },
  });

  return approval;
}

/**
 * Approves and executes the approved action
 */
export async function executeApproval(
  approvalId: string,
  approvedByUserId: string
) {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
    include: { program: true },
  });

  if (!approval) {
    throw new Error("Approval request not found");
  }

  if (approval.status !== "pending") {
    throw new Error(`Cannot approve: current status is ${approval.status}`);
  }

  if (approval.expiresAt && approval.expiresAt < new Date()) {
    await prisma.approval.update({
      where: { id: approvalId },
      data: { status: "expired" },
    });
    throw new Error("Approval request has expired");
  }

  // Update status to approved
  await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: "approved",
      approvedBy: approvedByUserId,
      updatedAt: new Date(),
    },
  });

  const diffData = JSON.parse(approval.diff);
  let executionResult = null;

  // Execute the corresponding irreversible action
  try {
    switch (approval.actionType) {
      case "PUBLISH_TEAMS": {
        // Mark all teams in program as PUBLISHED
        await prisma.team.updateMany({
          where: { programId: approval.programId, status: "DRAFT" },
          data: { status: "PUBLISHED" },
        });
        executionResult = { message: "Teams successfully published to participants" };
        break;
      }

      case "PUBLISH_RESULTS": {
        // Mark all results in program as published
        await prisma.result.updateMany({
          where: { programId: approval.programId },
          data: { isPublished: true, publishedAt: new Date() },
        });
        executionResult = { message: "Judging results and leaderboard published" };
        break;
      }

      case "BULK_SEND": {
        // Fetch campaign and queue outbox events
        const campaign = await prisma.commCampaign.findUnique({
          where: { id: approval.targetId },
        });

        if (campaign) {
          const participants = await prisma.participant.findMany({
            where: { programId: approval.programId, status: "ACTIVE" },
          });

          for (const p of participants) {
            await enqueueOutboxEvent({
              aggregateType: "CAMPAIGN",
              aggregateId: campaign.id,
              eventType: campaign.channel === "DISCORD" ? "SEND_DISCORD" : "SEND_EMAIL",
              payload: {
                campaignId: campaign.id,
                recipientEmail: p.email,
                recipientName: p.name,
                subject: campaign.subject || "Community Update",
                body: campaign.body.replace("{{name}}", p.name),
              },
              idempotencyKey: `bulk_${campaign.id}_${p.id}`,
            });
          }

          await prisma.commCampaign.update({
            where: { id: campaign.id },
            data: {
              status: "QUEUED",
              totalRecipients: participants.length,
            },
          });
        }
        executionResult = { message: "Bulk campaign queued in outbox for delivery" };
        break;
      }

      case "ISSUE_CERTIFICATES": {
        // Generate signed Ed25519 certificates for specified recipients
        const recipients = diffData.recipients || [];
        const issuedCerts = [];

        for (const r of recipients) {
          const certId = generateCertificateId("COPS");
          const issuedAt = new Date().toISOString();
          const emailHash = hashEmail(r.email);

          const payload = {
            cert_id: certId,
            recipient_name: r.name,
            recipient_email_hash: emailHash,
            program: approval.program.name,
            role: r.role || "participant",
            issued_at: issuedAt,
            template_version: "1.0",
            revoked: false,
          };

          const { signatureHex, canonicalJson } = signCertificatePayload(payload);

          const cert = await prisma.certificate.create({
            data: {
              programId: approval.programId,
              certId,
              recipientName: r.name,
              recipientEmailHash: emailHash,
              role: r.role || "participant",
              signature: signatureHex,
              canonicalPayload: canonicalJson,
              issuedAt: new Date(issuedAt),
            },
          });
          issuedCerts.push(cert);
        }

        executionResult = {
          message: `Issued ${issuedCerts.length} verifiable Ed25519 certificates`,
          count: issuedCerts.length,
        };
        break;
      }
    }

    // Write to audit log
    await prisma.auditLog.create({
      data: {
        programId: approval.programId,
        actorId: approvedByUserId,
        action: `EXECUTED_${approval.actionType}`,
        targetType: approval.targetType,
        targetId: approval.targetId,
        diff: JSON.stringify(executionResult),
      },
    });

    return { success: true, executionResult };
  } catch (err: any) {
    console.error("Failed to execute approved action:", err);
    throw err;
  }
}

/**
 * Rejects an approval request
 */
export async function rejectApproval(approvalId: string, rejectedByUserId: string, reason?: string) {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
  });

  if (!approval) throw new Error("Approval not found");

  await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: "rejected",
      approvedBy: rejectedByUserId,
      updatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      programId: approval.programId,
      actorId: rejectedByUserId,
      action: `REJECTED_${approval.actionType}`,
      targetType: approval.targetType,
      targetId: approval.targetId,
      diff: JSON.stringify({ rejectionReason: reason || "Rejected by manager/admin" }),
    },
  });

  return { success: true };
}
