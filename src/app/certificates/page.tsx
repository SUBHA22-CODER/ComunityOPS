"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  ShieldCheck,
  ShieldAlert,
  Key,
  ExternalLink,
  Ban,
  CheckCircle2,
  Plus,
} from "lucide-react";

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [publicKeyPem, setPublicKeyPem] = useState("");
  const [loading, setLoading] = useState(true);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [role, setRole] = useState("participant");
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCerts();
  }, []);

  async function fetchCerts() {
    setLoading(true);
    try {
      const res = await fetch("/api/certificates");
      const json = await res.json();
      setCertificates(json.certificates || []);
      setPublicKeyPem(json.publicKeyPem || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function requestIssueCertificates() {
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "issue",
          programId: certificates[0]?.programId || "cmd_program",
          role,
        }),
      });
      const data = await res.json();
      if (data.approvalRequired) {
        setIsIssueModalOpen(false);
        setApprovalMessage(
          `Approval gate created (ID: ${data.approvalId}). An admin or program manager must approve before cryptographic Ed25519 signing begins.`
        );
      }
    } catch (err) {
      alert("Error requesting issuance: " + err);
    }
  }

  async function revokeCertificate(certId: string) {
    const reason = prompt("Enter revocation reason (e.g. Disqualified or Plagiarism):");
    if (!reason) return;

    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke",
          certificateId: certId,
          reason,
          programId: certificates[0]?.programId || "cmd_program",
        }),
      });
      if (res.ok) {
        fetchCerts();
      }
    } catch (err) {
      alert("Revocation failed: " + err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-400" />
            Verifiable Certificates Engine
          </h1>
          <p className="text-xs text-slate-400">
            Cryptographically signed using Ed25519 keypairs with canonical JSON hashing and public verification endpoint
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md shadow-amber-600/30 transition-all"
          >
            <Plus className="h-4 w-4" />
            Issue Certificates (Approval Gate)
          </button>
        </div>
      </div>

      {approvalMessage && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-center gap-3 text-xs text-amber-200">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
          <span>{approvalMessage}</span>
        </div>
      )}

      {/* Public Key Card */}
      <div className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-amber-500/20 bg-amber-950/10">
        <div className="flex items-center gap-3">
          <Key className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <div className="font-semibold text-xs text-amber-200">
              Authority Ed25519 Public Verification Key
            </div>
            <p className="text-[11px] text-slate-400">
              Anyone with this public key can independently verify certificate authenticity without querying our database.
            </p>
          </div>
        </div>
        <div className="font-mono text-[10px] text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 truncate max-w-sm">
          {publicKeyPem.split("\n")[1] || "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."}
        </div>
      </div>

      {/* Certificates Registry Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-white text-sm">Issued Certificates Registry</h2>
          <span className="text-xs text-slate-400 font-mono">
            {certificates.length} Total Registered
          </span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-medium">
              <th className="p-3.5">Certificate ID</th>
              <th className="p-3.5">Recipient</th>
              <th className="p-3.5">Role</th>
              <th className="p-3.5">Ed25519 Signature</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Verification & Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {certificates.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No certificates issued yet.
                </td>
              </tr>
            ) : (
              certificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-amber-400 text-xs">
                    {cert.certId}
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-white">{cert.recipientName}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">
                      hash: {cert.recipientEmailHash.slice(0, 16)}...
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wide">
                      {cert.role}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[10px] text-slate-500 truncate max-w-[140px]">
                    {cert.signature.slice(0, 20)}...
                  </td>
                  <td className="p-3.5">
                    {cert.isRevoked ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        REVOKED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="h-3 w-3" />
                        VALID
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/verify/${cert.certId}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Verify Public
                      </Link>

                      {!cert.isRevoked && (
                        <button
                          onClick={() => revokeCertificate(cert.id)}
                          title="Revoke certificate"
                          className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Issue Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card max-w-md w-full p-6 space-y-4 shadow-2xl border-amber-500/30">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              Issue Verifiable Certificates
            </h2>
            <p className="text-xs text-slate-400">
              Certificates are signed with Ed25519 private keys. Issuance is an irreversible action requiring Approval Gate review.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Recipient Category</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-white outline-none focus:border-amber-500"
                >
                  <option value="winner">Winners / Finalists</option>
                  <option value="participant">All Active Participants</option>
                  <option value="mentor">Mentors</option>
                  <option value="judge">Judges</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsIssueModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={requestIssueCertificates}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md shadow-amber-600/30"
              >
                Request Issuance (Approval Gate)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
