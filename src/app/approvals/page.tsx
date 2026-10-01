"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  FileDiff,
  AlertTriangle,
  History,
  Lock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [apprRes, auditRes] = await Promise.all([
        fetch("/api/approvals"),
        fetch("/api/audit"),
      ]);
      const apprJson = await apprRes.json();
      const auditJson = await auditRes.json();
      setApprovals(apprJson.approvals || []);
      setAuditLogs(auditJson.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprovalAction(approvalId: string, action: "approve" | "reject") {
    setActionLoading(approvalId);
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId,
          action,
          userId: "admin",
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert("Action failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setActionLoading(null);
    }
  }

  const pendingList = approvals.filter((a) => a.status === "pending");
  const historyList = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-rose-400" />
          Approval Gates & Immutable Audit Trail
        </h1>
        <p className="text-xs text-slate-400">
          Enforces two-party verification on irreversible actions: Publishing Teams, Results, Bulk Sends, and Certificates (Pillar 5)
        </p>
      </div>

      {/* Pending Gates Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            Pending Approval Requests ({pendingList.length})
          </h2>
          <span className="text-xs text-slate-400 font-mono">Requires Admin / PM Sign-off</span>
        </div>

        {pendingList.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="h-8 w-8 text-emerald-400/50 mx-auto mb-2" />
            No pending approval requests. All systems operating smoothly.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingList.map((appr) => {
              let diffObj: any = {};
              try {
                diffObj = JSON.parse(appr.diff);
              } catch (e) {
                diffObj = { raw: appr.diff };
              }

              return (
                <div
                  key={appr.id}
                  className="glass-card p-6 border-amber-500/40 bg-amber-950/10 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {appr.actionType}
                        </span>
                        <h3 className="font-bold text-white text-sm">
                          {diffObj.action || appr.actionType}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">
                        Requested by{" "}
                        <span className="text-slate-200 font-medium">
                          {appr.requester?.name || "Program Manager"}
                        </span>{" "}
                        on {new Date(appr.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleApprovalAction(appr.id, "reject")}
                        disabled={actionLoading === appr.id}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprovalAction(appr.id, "approve")}
                        disabled={actionLoading === appr.id}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {actionLoading === appr.id ? "Executing..." : "Approve & Execute Irreversible Action"}
                      </button>
                    </div>
                  </div>

                  {/* Dry Run Diff Snapshot */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <FileDiff className="h-4 w-4 text-indigo-400" />
                      <span>Dry-Run Diff Snapshot</span>
                    </div>
                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                      {JSON.stringify(diffObj, null, 2)}
                    </pre>
                  </div>

                  <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between pt-1">
                    <span>Idempotency Key: {appr.idempotencyKey}</span>
                    <span>State: PENDING_APPROVAL</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolved Approvals History */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <History className="h-4 w-4 text-slate-400" />
          Approval History & Resolutions
        </h2>

        <div className="glass-card overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-medium">
                <th className="p-3.5">Action Type</th>
                <th className="p-3.5">Requested By</th>
                <th className="p-3.5">Resolved By</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {historyList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500">
                    No past approval history yet.
                  </td>
                </tr>
              ) : (
                historyList.map((appr) => (
                  <tr key={appr.id} className="hover:bg-slate-900/40">
                    <td className="p-3.5 font-semibold text-white">{appr.actionType}</td>
                    <td className="p-3.5 text-slate-300">{appr.requester?.name || "User"}</td>
                    <td className="p-3.5 text-slate-300">{appr.approver?.name || "System"}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          appr.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {appr.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-[11px] text-slate-500">
                      {new Date(appr.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Audit Log Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Append-Only Immutable Audit Log Stream
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {auditLogs.length} events logged
          </span>
        </div>

        <div className="glass-card divide-y divide-slate-800/80 overflow-hidden text-xs">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {log.action}
                  </span>
                  <span className="text-white font-medium">
                    Target: {log.targetType} {log.targetId ? `(${log.targetId})` : ""}
                  </span>
                </div>
                {log.diff && (
                  <p className="text-[11px] font-mono text-slate-400 truncate max-w-xl">
                    {log.diff}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px] shrink-0">
                <span>{log.actor?.name || "System"}</span>
                <span>{new Date(log.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
