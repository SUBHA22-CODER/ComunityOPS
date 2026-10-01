import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyCertificateSignature, getOrCreateEd25519KeyPair } from "@/lib/crypto";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ certId: string }> }
) {
  try {
    const { certId } = await params;

    const cert = await prisma.certificate.findUnique({
      where: { certId },
      include: {
        program: true,
        revocations: true,
      },
    });

    if (!cert) {
      return NextResponse.json(
        {
          valid: false,
          error: "CERTIFICATE_NOT_FOUND",
          message: `No certificate exists with ID: ${certId}`,
        },
        { status: 404 }
      );
    }

    // Cryptographic signature verification using Ed25519 public key
    const keypair = getOrCreateEd25519KeyPair();
    const signatureValid = verifyCertificateSignature(
      cert.canonicalPayload,
      cert.signature,
      keypair.publicKey
    );

    const isRevoked = cert.isRevoked || cert.revocations.length > 0;
    const isValid = signatureValid && !isRevoked;

    return NextResponse.json({
      valid: isValid,
      cert_id: cert.certId,
      recipient_name: cert.recipientName,
      recipient_email_hash: cert.recipientEmailHash,
      program: cert.program.name,
      role: cert.role,
      issued_at: cert.issuedAt.toISOString(),
      revoked: isRevoked,
      revocation_reason: isRevoked ? cert.revocations[0]?.reason : null,
      signature_verified: signatureValid,
      signature: cert.signature,
      public_key: keypair.publicKey,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
