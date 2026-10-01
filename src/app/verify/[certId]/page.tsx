import Link from "next/link";
import prisma from "@/lib/db";
import { verifyCertificateSignature, getOrCreateEd25519KeyPair } from "@/lib/crypto";
import { ShieldCheck, XCircle, Award, CheckCircle2, ArrowLeft, QrCode, Lock, Globe } from "lucide-react";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ certId: string }>;
}) {
  const { certId } = await params;

  const cert = await prisma.certificate.findUnique({
    where: { certId },
    include: {
      program: true,
      revocations: true,
    },
  });

  if (!cert) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-6 animate-fadeIn">
        <div className="h-16 w-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <XCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Certificate Not Found</h1>
          <p className="text-sm text-slate-400">
            No certificate with ID <code className="text-rose-400 font-mono">{certId}</code> could be located in the registry.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to CommunityOps
        </Link>
      </div>
    );
  }

  // Cryptographically verify signature
  const keypair = getOrCreateEd25519KeyPair();
  const signatureVerified = verifyCertificateSignature(
    cert.canonicalPayload,
    cert.signature,
    keypair.publicKey
  );
  const isRevoked = cert.isRevoked || cert.revocations.length > 0;
  const isValid = signatureVerified && !isRevoked;

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <Link
          href="/certificates"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Certificate Registry
        </Link>
        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
          <Globe className="h-3 w-3" />
          Public Verification Endpoint
        </span>
      </div>

      {/* Main Certificate Card */}
      <div className="relative overflow-hidden rounded-2xl glass-card p-8 border-indigo-500/30 shadow-2xl space-y-8 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950">
        {/* Verification Status Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                isValid
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
              }`}
            >
              {isValid ? <ShieldCheck className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">
                  {isValid ? "Cryptographically Verified Certificate" : "Certificate Invalid / Revoked"}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isValid
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {isValid ? "VERIFIED" : "REVOKED"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Signed by CommunityOps Ed25519 Root Certificate Authority
              </p>
            </div>
          </div>

          <div className="h-10 w-10 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-300">
            <QrCode className="h-5 w-5" />
          </div>
        </div>

        {/* Certificate Credential Body */}
        <div className="space-y-6 text-center py-2">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-widest">
              Official Award of Recognition
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {cert.recipientName}
            </h2>
            <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mt-1 uppercase tracking-wide">
              {cert.role}
            </div>
          </div>

          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            In recognition of outstanding performance and contribution to{" "}
            <span className="text-white font-semibold">{cert.program.name}</span>.
          </p>
        </div>

        {/* Cryptographic Details & Proof */}
        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] border-b border-slate-800/80 pb-2">
            <span>Certificate ID:</span>
            <span className="text-amber-400 font-bold">{cert.certId}</span>
          </div>

          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] border-b border-slate-800/80 pb-2">
            <span>Issued Date:</span>
            <span className="text-slate-200">
              {new Date(cert.issuedAt).toUTCString()}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] border-b border-slate-800/80 pb-2">
            <span>Ed25519 Signature Verified:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Valid Cryptographic Proof
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <div className="text-[10px] text-slate-500 font-mono uppercase">
              Ed25519 Signature Hash (Hex)
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-400 break-all select-all">
              {cert.signature}
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <div className="text-[10px] text-slate-500 font-mono uppercase">
              Canonical JSON Payload Verified
            </div>
            <pre className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-400 overflow-x-auto select-all">
              {cert.canonicalPayload}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
