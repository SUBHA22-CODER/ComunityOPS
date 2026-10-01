import Link from "next/link";
import prisma from "@/lib/db";
import {
  Users,
  Layers,
  Scale,
  Send,
  Award,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Lock,
} from "lucide-react";

export const revalidate = 0; // Dynamic on request

export default async function DashboardPage() {
  const [
    program,
    participantsCount,
    teamsCount,
    submissionsCount,
    pendingApprovals,
    certificatesCount,
    campaigns,
    auditLogs,
  ] = await Promise.all([
    prisma.program.findFirst({
      orderBy: { createdAt: "desc" },
    }),
    prisma.participant.count(),
    prisma.team.count(),
    prisma.submission.count(),
    prisma.approval.findMany({
      where: { status: "pending" },
      include: { requester: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.certificate.count(),
    prisma.commCampaign.findMany({
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { actor: true },
    }),
  ]);

  const totalDelivered = campaigns.reduce((acc, c) => acc + c.sentCount, 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero / Program Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 border border-indigo-500/20 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Modular Monolith • 5 High-Ceiling Technical Pillars</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {program?.name || "CommunityOps Operations Center"}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Deterministic, auditable, and repeatable community operations. Running judge Z-score normalization, OR-Tools constraint team formation, transactional outbox messaging, verifiable Ed25519 certificates, and irreversible approval gates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/judging"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              <Scale className="h-4 w-4" />
              Judging Center
            </Link>
            <Link
              href="/approvals"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-all"
            >
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              Approval Gates ({pendingApprovals.length})
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Approval Gate Alert Banner */}
      {pendingApprovals.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-amber-200">
                Action Required: {pendingApprovals.length} Irreversible Action(s) Awaiting Approval Gate
              </h2>
              <p className="text-xs text-amber-300/80">
                Latest: {pendingApprovals[0].actionType} requested by {pendingApprovals[0].requester?.name || "Program Manager"}.
              </p>
            </div>
          </div>
          <Link
            href="/approvals"
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
          >
            Review Diff & Approve
          </Link>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Participants</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{participantsCount}</div>
          <p className="text-[11px] text-slate-400">Accepted applicants</p>
        </div>

        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Formed Teams</span>
            <Layers className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{teamsCount}</div>
          <p className="text-[11px] text-emerald-400">Constraint-optimized</p>
        </div>

        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Submissions</span>
            <Scale className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{submissionsCount}</div>
          <p className="text-[11px] text-slate-400">Z-score normalized</p>
        </div>

        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Outbox Messages</span>
            <Send className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalDelivered}</div>
          <p className="text-[11px] text-slate-400">100% idempotent</p>
        </div>

        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Verifiable Certs</span>
            <Award className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{certificatesCount}</div>
          <p className="text-[11px] text-slate-400">Signed with Ed25519</p>
        </div>

        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Approval Gates</span>
            <Lock className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white">{pendingApprovals.length}</div>
          <p className="text-[11px] text-amber-400">Pending review</p>
        </div>
      </div>

      {/* The 5 High-Ceiling Technical Pillars Interactive Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Five High-Ceiling Technical Pillars
            </h2>
            <p className="text-xs text-slate-400">
              Deterministic architectures ensuring fairness, explainability, and safety
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Pillar 1 */}
          <Link
            href="/judging"
            className="group glass-card p-6 space-y-4 hover:border-indigo-500/50 hover:bg-slate-900/90 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                <span>1. Judging Engine & Normalization</span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Judge-bias calibration via Z-scores (z = (x - μ) / σ), rubric weighting, conflict-of-interest detection, and explainable scorecards.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-indigo-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Z-Score Calibrator Active</span>
            </div>
          </Link>

          {/* Pillar 2 */}
          <Link
            href="/teams"
            className="group glass-card p-6 space-y-4 hover:border-purple-500/50 hover:bg-slate-900/90 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors flex items-center justify-between">
                <span>2. Constrained Optimization</span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                OR-Tools CP-SAT solver for balanced team formation and Hungarian bipartite matching for mentor allocations.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-purple-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>OR-Tools CP-SAT Ready</span>
            </div>
          </Link>

          {/* Pillar 3 */}
          <Link
            href="/communications"
            className="group glass-card p-6 space-y-4 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Send className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors flex items-center justify-between">
                <span>3. Transactional Outbox Pattern</span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bulk email and Discord dispatch with idempotency keys, exponential backoff retries, token bucket rate limits, and DLQ.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Outbox Worker Operational</span>
            </div>
          </Link>

          {/* Pillar 4 */}
          <Link
            href="/certificates"
            className="group glass-card p-6 space-y-4 hover:border-amber-500/50 hover:bg-slate-900/90 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Award className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-amber-300 transition-colors flex items-center justify-between">
                <span>4. Verifiable Certificates</span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ed25519 cryptographic signing of canonical JSON payloads, UUIDv7 identifiers, and public verification endpoint without trusting DB alone.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Ed25519 Signer Ready</span>
            </div>
          </Link>

          {/* Pillar 5 */}
          <Link
            href="/approvals"
            className="group glass-card p-6 space-y-4 hover:border-rose-500/50 hover:bg-slate-900/90 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-rose-300 transition-colors flex items-center justify-between">
                <span>5. Approval Gates</span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Guards on irreversible actions: publish teams, publish results, bulk sends, and certificate issuance with dry-run diffs.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-rose-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Gates Active</span>
            </div>
          </Link>

          {/* Public Verification Link */}
          <Link
            href="/verify/COPS_HACK26_WIN01"
            className="group glass-card p-6 space-y-4 hover:border-sky-500/50 hover:bg-slate-900/90 transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white group-hover:text-sky-300 transition-colors flex items-center justify-between">
                <span>Public Verification Demo</span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Test the public certificate verification interface with live cryptographic validation of winner Devon Reed&apos;s certificate.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800 text-[11px] font-mono text-sky-400 flex items-center gap-1.5">
              <span>View /verify/:certId</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Immutable Audit Log Preview */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-white">Immutable Audit Log Activity</h2>
          </div>
          <Link
            href="/approvals"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
          >
            View full log &rarr;
          </Link>
        </div>

        <div className="divide-y divide-slate-800 text-xs">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded font-mono font-medium text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                  {log.action}
                </span>
                <span className="text-slate-300">
                  Target: <span className="text-slate-400">{log.targetType}</span>
                </span>
              </div>
              <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
                <span>{log.actor?.name || "System"}</span>
                <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
