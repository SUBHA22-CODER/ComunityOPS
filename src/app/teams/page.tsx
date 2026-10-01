"use client";

import { useState, useEffect } from "react";
import {
  Layers,
  Sparkles,
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  Globe,
  Sliders,
  Award,
  ArrowRight,
} from "lucide-react";

export default function TeamsPage() {
  const [activeTab, setActiveTab] = useState<"teams" | "mentors">("teams");
  const [teams, setTeams] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Optimizer parameters
  const [minTeamSize, setMinTeamSize] = useState(3);
  const [maxTeamSize, setMaxTeamSize] = useState(4);
  const [optimizing, setOptimizing] = useState(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
    fetchMentors();
  }, []);

  async function fetchTeams() {
    setLoading(true);
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      setTeams(data.teams || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMentors() {
    try {
      const res = await fetch("/api/mentors");
      const data = await res.json();
      setMentors(data.mentors || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function runOptimizationPreview() {
    setOptimizing(true);
    setApprovalMessage(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          programId: teams[0]?.programId || "cmd_program",
          minTeamSize,
          maxTeamSize,
        }),
      });
      const data = await res.json();
      setPreviewResult(data);
    } catch (err) {
      alert("Optimization failed: " + err);
    } finally {
      setOptimizing(false);
    }
  }

  async function commitDraft() {
    if (!previewResult) return;
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit_draft",
          programId: teams[0]?.programId || "cmd_program",
          formedTeams: previewResult.teams,
        }),
      });
      if (res.ok) {
        setPreviewResult(null);
        fetchTeams();
      }
    } catch (err) {
      alert("Error committing draft: " + err);
    }
  }

  async function requestPublishTeams() {
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          programId: teams[0]?.programId || "cmd_program",
        }),
      });
      const data = await res.json();
      if (data.approvalRequired) {
        setApprovalMessage(
          `Approval gate created (ID: ${data.approvalId}). An admin or program manager must approve before teams are visible to participants.`
        );
      }
    } catch (err) {
      alert("Error requesting publish: " + err);
    }
  }

  async function runMentorMatching() {
    try {
      const res = await fetch("/api/mentors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "match",
          programId: teams[0]?.programId || "cmd_program",
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchMentors();
      }
    } catch (err) {
      alert("Mentor matching error: " + err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-purple-400" />
            Constrained Optimization Engine
          </h1>
          <p className="text-xs text-slate-400">
            Form balanced teams and match mentors using OR-Tools CP-SAT and bipartite matching (Pillars 2 & 5)
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab("teams")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "teams"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Team Formation
          </button>
          <button
            onClick={() => setActiveTab("mentors")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "mentors"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Mentor Matching
          </button>
        </div>
      </div>

      {approvalMessage && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-center gap-3 text-xs text-amber-200">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
          <span>{approvalMessage}</span>
        </div>
      )}

      {activeTab === "teams" ? (
        <div className="space-y-6">
          {/* Optimization Controls Box */}
          <div className="glass-card p-5 space-y-4 border-purple-500/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Sliders className="h-4 w-4 text-purple-400" />
                  <span>Min Team Size:</span>
                  <input
                    type="number"
                    min={2}
                    max={6}
                    value={minTeamSize}
                    onChange={(e) => setMinTeamSize(parseInt(e.target.value, 10))}
                    className="w-14 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 font-mono text-center text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span>Max Team Size:</span>
                  <input
                    type="number"
                    min={3}
                    max={8}
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(parseInt(e.target.value, 10))}
                    className="w-14 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 font-mono text-center text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={runOptimizationPreview}
                  disabled={optimizing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-md shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  {optimizing ? "Solving Constraints..." : "Run CP-SAT Dry Run Preview"}
                </button>

                <button
                  onClick={requestPublishTeams}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-all"
                >
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  Request Publish (Approval Gate)
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-3 flex flex-wrap items-center gap-4">
              <span>Constraints: 1 team/participant</span>
              <span>•</span>
              <span>Maximized skill entropy & role balance</span>
              <span>•</span>
              <span>Min-cost timezone delta</span>
              <span>•</span>
              <span>Zero conflict pairs</span>
            </div>
          </div>

          {/* Dry Run Preview Box (if solver ran) */}
          {previewResult && (
            <div className="glass-card p-6 border-indigo-500/40 bg-indigo-950/20 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    Solver Preview ({previewResult.status})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Solved in {previewResult.executionTimeMs?.toFixed(1)}ms • {previewResult.teams.length} teams formed
                  </p>
                </div>
                <button
                  onClick={commitDraft}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm"
                >
                  Commit as Draft Teams
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {previewResult.teams.map((t: any) => (
                  <div key={t.teamIndex} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-300 text-xs">{t.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {t.memberIds.length} members
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 italic">{t.explainability}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {t.skillCoverage.slice(0, 4).map((s: string, idx: number) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Formed Teams */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              <div className="col-span-3 text-center p-8 text-slate-500 text-xs">
                Loading formed teams...
              </div>
            ) : teams.length === 0 ? (
              <div className="col-span-3 text-center p-8 text-slate-500 text-xs">
                No teams formed yet. Run the solver above to generate initial teams!
              </div>
            ) : (
              teams.map((team) => (
                <div key={team.id} className="glass-card p-5 space-y-3 border-slate-800 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">{team.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          team.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {team.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {team.optimizerNotes || "Formed via constrained optimization"}
                    </p>

                    <div className="pt-2">
                      <div className="text-[11px] font-medium text-slate-400 mb-1.5">Members ({team.members.length}):</div>
                      <div className="space-y-1">
                        {team.members.map((m: any) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between text-xs px-2.5 py-1 rounded bg-slate-900/60 border border-slate-800/80"
                          >
                            <span className="text-slate-200 font-medium">
                              {m.participant.name} {m.isLead && "👑"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              UTC {m.participant.timezone >= 0 ? `+${m.participant.timezone}` : m.participant.timezone}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{team.techStack ? team.techStack.split(",").length : 0} Tech Tags</span>
                    <span>Tz delta: {team.timezoneAvg?.toFixed(1)}h</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Mentor Matching Tab */
        <div className="space-y-6">
          <div className="glass-card p-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white text-sm">Bipartite Hungarian Mentor Allocator</h2>
              <p className="text-xs text-slate-400">
                Minimizes domain expertise mismatch + timezone divergence within mentor capacity constraints
              </p>
            </div>
            <button
              onClick={runMentorMatching}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition-all"
            >
              Run Bipartite Matching
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {mentors.map((m) => (
              <div key={m.id} className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">{m.name}</h3>
                    <p className="text-xs text-slate-400">{m.email}</p>
                  </div>
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                    Capacity: {m.assignments.length}/{m.capacity} Teams
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400">Expertise Tags:</div>
                  <div className="flex flex-wrap gap-1">
                    {m.expertise.split(",").map((exp: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                        {exp.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-300">Assigned Teams:</div>
                  {m.assignments.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No teams assigned yet.</p>
                  ) : (
                    m.assignments.map((asgn: any) => (
                      <div
                        key={asgn.id}
                        className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-white">
                          <span>Team {asgn.team.name}</span>
                          <span className="text-emerald-400 font-mono text-[11px]">
                            {asgn.matchScore}% Match
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic">
                          {asgn.explainability || "Optimized based on tech stack affinity"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
