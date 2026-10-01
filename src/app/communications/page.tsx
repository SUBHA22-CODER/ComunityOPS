"use client";

import { useState, useEffect } from "react";
import {
  Send,
  Mail,
  MessageSquare,
  ShieldAlert,
  Play,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Plus,
  RefreshCw,
} from "lucide-react";

export default function CommunicationsPage() {
  const [data, setData] = useState<any>({
    campaigns: [],
    outboxStats: { queued: 0, processing: 0, sent: 0, failed: 0, dead: 0 },
    recentDeliveries: [],
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("EMAIL");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    fetchCommsData();
  }, []);

  async function fetchCommsData() {
    setLoading(true);
    try {
      const res = await fetch("/api/communications");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function createCampaign() {
    if (!name || !body) return;
    try {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_campaign",
          programId: data.campaigns[0]?.programId || "cmd_program",
          name,
          channel,
          subject,
          body,
        }),
      });
      if (res.ok) {
        setIsComposeOpen(false);
        setName("");
        setSubject("");
        setBody("");
        fetchCommsData();
      }
    } catch (err) {
      alert("Error creating campaign: " + err);
    }
  }

  async function requestSendCampaign(campaignId: string) {
    try {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send",
          campaignId,
          programId: data.campaigns[0]?.programId || "cmd_program",
        }),
      });
      const json = await res.json();
      if (json.approvalRequired) {
        setApprovalMessage(
          `Approval gate created (ID: ${json.approvalId}) for ${json.diffSummary?.recipientCount} recipients. An admin or program manager must approve before bulk send starts.`
        );
        fetchCommsData();
      }
    } catch (err) {
      alert("Error initiating send: " + err);
    }
  }

  async function triggerProcessOutbox() {
    setProcessing(true);
    try {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process_outbox" }),
      });
      if (res.ok) {
        fetchCommsData();
      }
    } catch (err) {
      alert("Error processing outbox: " + err);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Send className="h-6 w-6 text-emerald-400" />
            Transactional Outbox Communications
          </h1>
          <p className="text-xs text-slate-400">
            Idempotent batch messaging via Email and Discord with token bucket rate limiting and DLQ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerProcessOutbox}
            disabled={processing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-emerald-400 ${processing ? "animate-spin" : ""}`} />
            Flush Outbox Worker
          </button>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </button>
        </div>
      </div>

      {approvalMessage && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-center gap-3 text-xs text-amber-200">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
          <span>{approvalMessage}</span>
        </div>
      )}

      {/* Outbox Queue Telemetry */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Queued</span>
            <Clock className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{data.outboxStats?.queued || 0}</div>
          <p className="text-[10px] text-slate-500">Ready to dispatch</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Processing</span>
            <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{data.outboxStats?.processing || 0}</div>
          <p className="text-[10px] text-slate-500">SKIP LOCKED</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Sent Successfully</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{data.outboxStats?.sent || 0}</div>
          <p className="text-[10px] text-slate-500">Delivered</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Retrying</span>
            <Clock className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{data.outboxStats?.failed || 0}</div>
          <p className="text-[10px] text-slate-500">Exp. backoff</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Dead Letter (DLQ)</span>
            <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">{data.outboxStats?.dead || 0}</div>
          <p className="text-[10px] text-slate-500">Max attempts exceeded</p>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-white text-sm">Campaigns</h2>
          <span className="text-xs text-slate-400">Transactional Outbox Protected</span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-medium">
              <th className="p-3.5">Campaign Name</th>
              <th className="p-3.5">Channel</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-center">Progress</th>
              <th className="p-3.5">Idempotency Key</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {data.campaigns?.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No campaigns created yet. Click &quot;Create Campaign&quot; to begin.
                </td>
              </tr>
            ) : (
              data.campaigns?.map((camp: any) => (
                <tr key={camp.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-white">{camp.name}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-sm">
                      {camp.subject || camp.body?.slice(0, 40)}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5 font-medium text-slate-300">
                      {camp.channel === "DISCORD" ? (
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                      ) : (
                        <Mail className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                      <span>{camp.channel}</span>
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        camp.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : camp.status === "PENDING_APPROVAL"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      {camp.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-mono text-[11px]">
                    {camp.sentCount} / {camp.totalRecipients || 12}
                  </td>
                  <td className="p-3.5 font-mono text-[10px] text-slate-500">
                    {camp.idempotencyKey.slice(0, 18)}...
                  </td>
                  <td className="p-3.5 text-right">
                    {camp.status === "DRAFT" ? (
                      <button
                        onClick={() => requestSendCampaign(camp.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                        Send (Approval Gate)
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">Dispatched</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card max-w-lg w-full p-6 space-y-4 shadow-2xl border-emerald-500/30">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail className="h-5 w-5 text-emerald-400" />
              Compose Bulk Campaign
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Campaign Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mentor Hours Reminder"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="EMAIL">Email (Resend/SendGrid/SES)</option>
                  <option value="DISCORD">Discord Bot / Webhook</option>
                </select>
              </div>

              {channel === "EMAIL" && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Subject</label>
                  <input
                    type="text"
                    placeholder="Subject line..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Message Content (use &#123;&#123;name&#125;&#125; for recipient template interpolation)
                </label>
                <textarea
                  rows={4}
                  placeholder="Hello {{name}}, welcome to the program..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsComposeOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createCampaign}
                disabled={!name || !body}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-600/30 disabled:opacity-50"
              >
                Create Campaign Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
