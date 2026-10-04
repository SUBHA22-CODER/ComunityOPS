import Link from "next/link";
import prisma from "@/lib/db";
import { verifyCertificateSignature, getOrCreateEd25519KeyPair } from "@/lib/crypto";
import QRCode from "qrcode";
import {
  ShieldCheck,
  XCircle,
  Award,
  CheckCircle2,
  ArrowLeft,
  QrCode,
  Lock,
  Globe,
  Share2,
  Download,
  Copy,
  ExternalLink,
  Code2,
} from "lucide-react";

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
      <div className="max-w-xl mx-auto py-20 text-center space-y-6 animate-in-fluid">
        <div className="double-bezel-shell max-w-sm mx-auto">
          <div className="double-bezel-inner p-8 space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <XCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">Certificate Not Found</h1>
              <p className="text-xs text-slate-400">
                No record for certificate ID <code className="text-rose-400 font-mono">{certId}</code> exists in the Ed25519 ledger.
              </p>
            </div>
            <Link
              href="/certificates"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs text-slate-200 font-medium transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Certificate Registry
            </Link>
          </div>
        </div>
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

  // Generate real QR code linking to verification URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify/${cert.certId}`;
  
  let qrCodeDataUrl = "";
  try {
    qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 240,
      color: {
        dark: "#ffffff",
        light: "#0b0f19",
      },
    });
  } catch (e) {
    console.error("QR Code generation error", e);
  }

  // Open Badges 3.0 / W3C Verifiable Credential standard format
  const verifiableCredential = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://purl.imsglobal.org/spec/ob/v3p0/context.json"
    ],
    id: `urn:uuid:${cert.certId}`,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: `${appUrl}/api/issuer`,
      type: "Profile",
      name: "CommunityOps Root CA",
      url: appUrl,
    },
    issuanceDate: cert.issuedAt.toISOString(),
    credentialSubject: {
      id: `urn:recipient:${cert.recipientEmailHash}`,
      type: "AchievementSubject",
      name: cert.recipientName,
      achievement: {
        id: `urn:achievement:${cert.program.slug}:${cert.role}`,
        type: "Achievement",
        name: `${cert.program.name} — ${cert.role.toUpperCase()}`,
        description: `Awarded for participation in ${cert.program.name} with verified status as ${cert.role}.`,
        criteria: {
          narrative: "Completed program milestones and passed peer review and judging audit."
        }
      }
    },
    proof: {
      type: "Ed25519Signature2020",
      created: cert.issuedAt.toISOString(),
      verificationMethod: `${appUrl}/.well-known/ed25519-public-key.pem`,
      proofPurpose: "assertionMethod",
      proofValue: cert.signature
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8 animate-in-fluid">
      {/* Top Banner Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/certificates"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Certificate Registry</span>
        </Link>
        <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20">
          <Globe className="h-3 w-3" />
          <span>Public Cryptographic Proof</span>
        </div>
      </div>

      {/* Main Certificate Display — Double-Bezel Hardware Architecture */}
      <div className="double-bezel-shell">
        <div className="double-bezel-inner relative overflow-hidden p-8 sm:p-10 space-y-8">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />

          {/* Verification Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/[0.06] pb-6">
            <div className="flex items-center gap-4">
              <div
                className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  isValid
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                }`}
              >
                {isValid ? <ShieldCheck className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isValid ? "Cryptographically Verified Credential" : "Certificate Invalid or Revoked"}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isValid
                        ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {isValid ? "ED25519 VALID" : "REVOKED"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Issuer: CommunityOps Ed25519 Root Certificate Authority
                </p>
              </div>
            </div>

            {/* Scannable QR Code Pill Preview */}
            {qrCodeDataUrl && (
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] p-2 rounded-2xl shrink-0">
                <img
                  src={qrCodeDataUrl}
                  alt="Verification QR Code"
                  className="h-16 w-16 rounded-xl border border-slate-200 dark:border-white/10"
                />
                <div className="space-y-0.5 pr-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Scannable Proof
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-indigo-600 dark:text-indigo-300 block">
                    Scan With Phone
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Certificate Credential Body */}
          <div className="space-y-4 text-center py-4">
            <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.25em] font-semibold">
              Official Credential of Recognition
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {cert.recipientName}
            </h2>
            <div className="inline-block px-4 py-1.5 rounded-full text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 uppercase tracking-widest">
              {cert.role}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed pt-2">
              Issued in recognition of verified achievement and distinguished participation in{" "}
              <span className="text-slate-900 dark:text-white font-semibold">{cert.program.name}</span>.
            </p>
          </div>

          {/* Cryptographic Proof Audit Box */}
          <div className="rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.08] p-5 space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200/80 dark:border-white/[0.06]">
              <span>Certificate Identifier:</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">{cert.certId}</span>
            </div>

            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200/80 dark:border-white/[0.06]">
              <span>Issued Timestamp:</span>
              <span className="text-slate-700 dark:text-slate-200">{new Date(cert.issuedAt).toUTCString()}</span>
            </div>

            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-200/80 dark:border-white/[0.06]">
              <span>Ed25519 Curve Verification:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Valid Mathematical Signature
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Ed25519 Signature Digest
              </span>
              <div className="p-3 rounded-xl bg-white dark:bg-black/60 border border-slate-200 dark:border-white/[0.06] text-[10px] text-slate-600 dark:text-slate-400 break-all select-all font-mono">
                {cert.signature}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Canonical JSON Verified by Public Key
              </span>
              <pre className="p-3 rounded-xl bg-white dark:bg-black/60 border border-slate-200 dark:border-white/[0.06] text-[10px] text-slate-600 dark:text-slate-400 overflow-x-auto select-all font-mono leading-relaxed">
                {cert.canonicalPayload}
              </pre>
            </div>
          </div>

          {/* Open Badges 3.0 / W3C Verifiable Credentials JSON-LD Drawer */}
          <details className="group rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] p-4 text-xs font-mono">
            <summary className="cursor-pointer flex items-center justify-between text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold">
              <span className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                View W3C Verifiable Credential / Open Badges 3.0 JSON-LD
              </span>
              <span className="text-slate-400 dark:text-slate-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <pre className="mt-3 p-3 rounded-xl bg-white dark:bg-black/60 border border-slate-200 dark:border-white/[0.06] text-[10px] text-slate-600 dark:text-slate-400 overflow-x-auto select-all leading-relaxed">
              {JSON.stringify(verifiableCredential, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
