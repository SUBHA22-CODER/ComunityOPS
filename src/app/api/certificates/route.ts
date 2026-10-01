import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getOrCreateEd25519KeyPair } from "@/lib/crypto";
import { requestApproval } from "@/lib/approvals";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");

    const certificates = await prisma.certificate.findMany({
      where: programId ? { programId } : undefined,
      include: {
        program: true,
        revocations: true,
      },
      orderBy: { issuedAt: "desc" },
    });

    const keypair = getOrCreateEd25519KeyPair();

    return NextResponse.json({
      certificates,
      publicKeyPem: keypair.publicKey,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, programId, userId = "admin" } = body;

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    // Action 1: REQUEST_ISSUE (Requires Approval Gate)
    if (action === "issue") {
      const { role = "participant", recipientFilter = "ALL" } = body;

      const participants = await prisma.participant.findMany({
        where: { programId, status: "ACTIVE" },
      });

      const recipients = participants.map((p) => ({
        name: p.name,
        email: p.email,
        role,
      }));

      const diffSummary = {
        action: `Issue Verifiable Ed25519 Certificates (${role.toUpperCase()})`,
        count: recipients.length,
        role,
        recipientFilter,
        recipients,
      };

      const approval = await requestApproval({
        programId,
        actionType: "ISSUE_CERTIFICATES",
        targetType: "Certificate",
        targetId: programId,
        requestedBy: userId,
        diffSummary,
      });

      return NextResponse.json({
        approvalRequired: true,
        approvalId: approval.id,
        diffSummary,
      });
    }

    // Action 2: REVOKE
    if (action === "revoke") {
      const { certificateId, reason = "Manual admin revocation" } = body;

      const cert = await prisma.certificate.findUnique({
        where: { id: certificateId },
      });

      if (!cert) {
        return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
      }

      await prisma.certificate.update({
        where: { id: certificateId },
        data: { isRevoked: true },
      });

      await prisma.certificateRevocation.create({
        data: {
          certificateId,
          reason,
          revokedBy: userId,
        },
      });

      await prisma.auditLog.create({
        data: {
          programId,
          action: "CERTIFICATE_REVOKED",
          targetType: "Certificate",
          targetId: cert.certId,
          diff: JSON.stringify({ reason, certId: cert.certId }),
        },
      });

      return NextResponse.json({ success: true, certId: cert.certId });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
