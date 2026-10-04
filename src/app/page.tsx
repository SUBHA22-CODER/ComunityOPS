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
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Lock,
  Workflow,
  Cpu,
  ShieldCheck,
  Zap,
  Compass,
} from "lucide-react";
import HeroHeading from "@/components/HeroHeading";

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
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { actor: true },
    }),
  ]);

  const totalDelivered = campaigns.reduce((acc, c) => acc + c.sentCount, 0);

  return (
    <div className="space-y-12 animate-in-fluid">
      {/* Apple-style Hero Showcase */}
      <section className="relative overflow-hidden rounded-[2rem] apple-card p-8 sm:p-12 md:p-16 border border-black/5 dark:border-white/10 transition-all">
        {/* Subtle Apple Ambient Glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          {/* Apple Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Community Operations, Perfected.</span>
          </div>

          {/* Hero Heading */}
          <HeroHeading />

          {/* Subheading */}
          <p className="text-base sm:text-lg text-[#6e6e73] dark:text-[#a1a1a6] font-normal leading-relaxed max-w-2xl">
            A remarkably fair, automated operations system for hackathons, cohorts, and developer communities.
            We eliminate judge bias, build balanced teams automatically, prevent duplicate messages,
            and issue verifiable digital certificates.
          </p>

          {/* Apple-style CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/judging"
              className="apple-btn-primary px-6 py-3 text-sm inline-flex items-center gap-2 shadow-sm font-semibold"
            >
              <span>Explore Judging Center</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>

            <Link
              href="/approvals"
              className="apple-btn-secondary px-6 py-3 text-sm inline-flex items-center gap-2 font-semibold"
            >
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <span>Safety Checks ({pendingApprovals.length})</span>
            </Link>
          </div>

          {/* Subtle Live Status Badges */}
          <div className="pt-4 flex flex-wrap items-center gap-2.5 text-xs text-[#6e6e73] dark:text-[#86868b]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/5 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Bias-Free Judging: Active
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/5 font-medium">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Team Solver: Online
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/5 font-medium">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              Digital Certificates: Ready
            </span>
          </div>
        </div>
      </section>

      {/* Non-Tech Explainer: How It Works */}
      <section className="apple-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-base sm:text-lg font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
            How CommunityOps Works (Simple 4-Step Flow)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono uppercase tracking-wider">
              Step 01
            </span>
            <h3 className="font-bold text-[#1d1d1f] dark:text-white text-sm">Collect Applications</h3>
            <p className="text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed">
              Auto-sync applicant responses from Typeform, Google Forms, or Discord via n8n workflows.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 font-mono uppercase tracking-wider">
              Step 02
            </span>
            <h3 className="font-bold text-[#1d1d1f] dark:text-white text-sm">Match Balanced Teams</h3>
            <p className="text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed">
              Smart algorithms pair complementary skills (devs, designers, AI) and align timezones.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5">
            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 font-mono uppercase tracking-wider">
              Step 03
            </span>
            <h3 className="font-bold text-[#1d1d1f] dark:text-white text-sm">Score Fairly</h3>
            <p className="text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed">
              Math balances harsh vs. lenient judges so participants are never unfairly penalized.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1.5">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono uppercase tracking-wider">
              Step 04
            </span>
            <h3 className="font-bold text-[#1d1d1f] dark:text-white text-sm">Issue Verified Awards</h3>
            <p className="text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed">
              Participants receive tamper-proof certificates with real scannable QR codes for LinkedIn.
            </p>
          </div>
        </div>
      </section>

      {/* Pending Safety Approvals Banner */}
      {pendingApprovals.length > 0 && (
        <section className="rounded-3xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-xs font-bold text-amber-900 dark:text-amber-300 tracking-wide uppercase font-mono">
                Two-Person Safety Lock • {pendingApprovals.length} Action(s) Waiting For Sign-off
              </h2>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Action: <span className="font-semibold">{pendingApprovals[0].actionType}</span> requested by {pendingApprovals[0].requester?.name || "Program Lead"}.
              </p>
            </div>
          </div>
          <Link
            href="/approvals"
            className="apple-btn-primary bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 shrink-0 shadow-sm inline-flex items-center gap-2"
          >
            <span>Review & Approve</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}

      {/* Key Numbers & Activity Counters */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[
          { label: "Participants", value: participantsCount, sub: "Accepted Cohort", icon: Users, color: "text-blue-600 dark:text-blue-400" },
          { label: "Formed Teams", value: teamsCount, sub: "Skills Balanced", icon: Layers, color: "text-purple-600 dark:text-purple-400" },
          { label: "Submissions", value: submissionsCount, sub: "Fairly Scored", icon: Scale, color: "text-sky-600 dark:text-sky-400" },
          { label: "Sent Messages", value: totalDelivered, sub: "Zero Duplicates", icon: Send, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Digital Certs", value: certificatesCount, sub: "QR-Verified", icon: Award, color: "text-amber-600 dark:text-amber-400" },
          { label: "Safety Checks", value: pendingApprovals.length, sub: "Needs 2nd Peer", icon: Lock, color: "text-rose-600 dark:text-rose-400" },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="apple-card p-5 space-y-2"
            >
              <div className="flex items-center justify-between text-[#6e6e73] dark:text-[#86868b] text-xs font-medium">
                <span>{item.label}</span>
                <Icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight font-mono">
                {item.value}
              </div>
              <div className="text-[10px] font-mono text-[#86868b] uppercase tracking-wider">
                {item.sub}
              </div>
            </div>
          );
        })}
      </section>

      {/* Apple-style Feature Bento */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
            Explore Operations Hub
          </h2>
          <p className="text-xs text-[#6e6e73] dark:text-[#86868b]">
            Transparent, auditable operational tools for leaders and participants
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Judging Engine */}
          <Link
            href="/judging"
            className="group apple-card p-6 sm:p-7 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center justify-between">
                  <span>1. Fair Judging Engine</span>
                  <ArrowUpRight className="h-4 w-4 text-[#86868b] group-hover:text-blue-600 transition-colors" />
                </h3>
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  Calibrates strict vs. easy judges
                </span>
              </div>
              <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed">
                Applies mathematical Z-score normalization to ensure every submission receives an impartial, bias-free evaluation.
              </p>
            </div>
            <div className="pt-3 border-t border-black/5 dark:border-white/10 text-[11px] font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Judging Engine Ready</span>
            </div>
          </Link>

          {/* Team Matchmaker */}
          <Link
            href="/teams"
            className="group apple-card p-6 sm:p-7 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors flex items-center justify-between">
                  <span>2. Smart Team Matchmaker</span>
                  <ArrowUpRight className="h-4 w-4 text-[#86868b] group-hover:text-purple-600 transition-colors" />
                </h3>
                <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400">
                  Balances skills and timezones
                </span>
              </div>
              <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed">
                Google OR-Tools solver algorithm combines designers, developers, and AI engineers across compatible timezones (±3h).
              </p>
            </div>
            <div className="pt-3 border-t border-black/5 dark:border-white/10 text-[11px] font-mono text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Constraint Matcher Online</span>
            </div>
          </Link>

          {/* Outbox & n8n */}
          <Link
            href="/communications"
            className="group apple-card p-6 sm:p-7 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                  <span>3. Outbox & Automated Alerts</span>
                  <ArrowUpRight className="h-4 w-4 text-[#86868b] group-hover:text-emerald-600 transition-colors" />
                </h3>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  Reliable multi-channel messages
                </span>
              </div>
              <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed">
                Transactional outbox architecture with n8n workflow integration ensures zero lost messages and zero duplicate blasts.
              </p>
            </div>
            <div className="pt-3 border-t border-black/5 dark:border-white/10 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Messaging Bridge Active</span>
            </div>
          </Link>

          {/* Digital Certificates */}
          <Link
            href="/certificates"
            className="group apple-card p-6 sm:p-7 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center justify-between">
                  <span>4. Digital Certificates & QR</span>
                  <ArrowUpRight className="h-4 w-4 text-[#86868b] group-hover:text-amber-600 transition-colors" />
                </h3>
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Tamper-proof verifiable proof
                </span>
              </div>
              <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed">
                Ed25519 cryptographic certificates with public verification pages and scannable QR codes for LinkedIn and resumes.
              </p>
            </div>
            <div className="pt-3 border-t border-black/5 dark:border-white/10 text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Certificates Signed & Verifiable</span>
            </div>
          </Link>

          {/* Two-Person Safety Checks */}
          <Link
            href="/approvals"
            className="group apple-card p-6 sm:p-7 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors flex items-center justify-between">
                  <span>5. Two-Person Safety Checks</span>
                  <ArrowUpRight className="h-4 w-4 text-[#86868b] group-hover:text-rose-600 transition-colors" />
                </h3>
                <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  Prevents accidental publishing
                </span>
              </div>
              <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed">
                Two-person authorization gates safeguard all irreversible actions: publishing winners, results, and batch communications.
              </p>
            </div>
            <div className="pt-3 border-t border-black/5 dark:border-white/10 text-[11px] font-mono text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Safety Guards Enabled</span>
            </div>
          </Link>

          {/* Public Verification Showcase */}
          <Link
            href="/verify/COPS_HACK26_WIN01"
            className="group apple-card p-6 sm:p-7 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-2xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#1d1d1f] dark:text-[#f5f5f7] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors flex items-center justify-between">
                  <span>Public QR Verification Demo</span>
                  <ArrowUpRight className="h-4 w-4 text-[#86868b] group-hover:text-sky-600 transition-colors" />
                </h3>
                <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                  Scan live with your phone
                </span>
              </div>
              <p className="text-xs text-[#6e6e73] dark:text-[#a1a1a6] leading-relaxed">
                Test the public certificate verification interface for hackathon winner Devon Reed with instant QR code scanning.
              </p>
            </div>
            <div className="pt-3 border-t border-black/5 dark:border-white/10 text-[11px] font-mono text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <span>View Public Cert &rarr;</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Audit Log / History */}
      <section className="apple-card p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Recent Activity & Audit Trail
            </h2>
          </div>
          <Link
            href="/approvals"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Full History</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-black/5 dark:divide-white/5">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-full font-mono font-medium text-[10px] bg-black/[0.04] dark:bg-white/[0.08] text-[#1d1d1f] dark:text-white border border-black/5 dark:border-white/5">
                  {log.action}
                </span>
                <span className="text-xs text-[#6e6e73] dark:text-[#a1a1a6]">
                  Target: <span className="text-[#1d1d1f] dark:text-white font-medium">{log.targetType}</span>
                </span>
              </div>
              <div className="flex items-center gap-4 text-[#86868b] font-mono text-[11px]">
                <span>By: {log.actor?.name || "System"}</span>
                <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
