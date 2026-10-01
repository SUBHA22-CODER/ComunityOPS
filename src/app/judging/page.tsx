"use client";

import { useState, useEffect } from "react";
import {
  Scale,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Award,
  HelpCircle,
  X,
  CheckCircle2,
  TrendingUp,
  FileText,
} from "lucide-react";

export default function JudgingPage() {
  const [data, setData] = useState<any>({
    submissions: [],
    rubrics: [],
    conflicts: [],
    results: [],
  });
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  // Scorecard modal state
  const [selectedScorecard, setSelectedScorecard] = useState<any | null>(null);
  const [loadingScorecard, setLoadingScorecard] = useState(false);

  useEffect(() => {
    fetchJudgingData();
  }, []);

  async function fetchJudgingData() {
    setLoading(true);
    try {
      const res = await fetch("/api/judging");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function computeNormalization() {
    setComputing(true);
    setApprovalMessage(null);
    try {
      const res = await fetch("/api/judging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "compute",
          programId: data.submissions[0]?.programId || "cmd_program",
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        fetchJudgingData();
      }
    } catch (err) {
      alert("Failed to compute normalization: " + err);
    } finally {
      setComputing(false);
    }
  }

  async function requestPublishResults() {
    try {
      const res = await fetch("/api/judging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          programId: data.submissions[0]?.programId || "cmd_program",
        }),
      });
      const resData = await res.json();
      if (resData.approvalRequired) {
        setApprovalMessage(
          `Approval gate created (ID: ${resData.approvalId}). An admin or program manager must approve before leaderboard and final ranks are made public.`
        );
      }
    } catch (err) {
      alert("Failed to request publish: " + err);
    }
  }

  async function openScorecard(submissionId: string) {
    setLoadingScorecard(true);
    setSelectedScorecard(null);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/scorecard`);
      const json = await res.json();
      setSelectedScorecard(json.scorecard);
    } catch (err) {
      alert("Error loading scorecard: " + err);
    } finally {
      setLoadingScorecard(false);
    }
  }

  const defaultRubric = data.rubrics?.[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Scale className="h-6 w-6 text-indigo-400" />
            Judging Engine & Bias Normalization
          </h1>
          <p className="text-xs text-slate-400">
            Z-score judge calibration ($z = (x - \mu)/\sigma$), conflict-of-interest filters, and explainable scorecards
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={computeNormalization}
            disabled={computing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {computing ? "Normalizing Scores..." : "Run Z-Score Normalization"}
          </button>
          <button
            onClick={requestPublishResults}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-all"
          >
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Publish Leaderboard (Approval Gate)
          </button>
        </div>
      </div>

      {approvalMessage && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-center gap-3 text-xs text-amber-200">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
          <span>{approvalMessage}</span>
        </div>
      )}

      {/* Rubric Weights & Active COI Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5 md:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-white text-sm">
              Active Evaluation Rubric: {defaultRubric?.name || "Standard Rubric"}
            </h2>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              v{defaultRubric?.version || 1}.0
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {defaultRubric?.criteria?.map((c: any) => (
              <div key={c.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 font-medium truncate">{c.name}</div>
                <div className="text-lg font-bold text-white font-mono">
                  {Math.round(c.weight * 100)}%
                </div>
                <div className="text-[10px] text-slate-500">Max: {c.maxScore} pts</div>
              </div>
            ))}
          </div>
        </div>

        {/* Conflicts of Interest Card */}
        <div className="glass-card p-5 space-y-3 border-amber-500/30 bg-amber-950/10">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <AlertTriangle className="h-4 w-4" />
            <h3>Conflict of Interest Guard</h3>
          </div>
          <p className="text-xs text-slate-400">
            Automated conflict detection prevents assigned scores from biased relationships:
          </p>
          <div className="space-y-2">
            {data.conflicts?.map((coi: any) => (
              <div
                key={coi.id}
                className="p-2.5 rounded-lg bg-slate-900 border border-amber-500/20 text-xs space-y-0.5"
              >
                <div className="font-semibold text-amber-200">
                  {coi.judge?.name} ⊘ Team {coi.team?.name}
                </div>
                <div className="text-[11px] text-slate-400 italic">{coi.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Official Leaderboard & Explainability Trigger */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-sm">Computed Leaderboard (Normalized Z-Scores vs Raw)</h2>
            <p className="text-xs text-slate-400">
              Ranks are mathematically determined by standardized deviation above judge means
            </p>
          </div>
          <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Z-Score Calibrated
          </span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-medium">
              <th className="p-3.5">Rank</th>
              <th className="p-3.5">Submission & Team</th>
              <th className="p-3.5 text-center">Raw Avg Score</th>
              <th className="p-3.5 text-center">Normalized Total (Z-Score)</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 text-right">Explainability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {data.results?.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No normalized results computed yet. Click &quot;Run Z-Score Normalization&quot; to calculate.
                </td>
              </tr>
            ) : (
              data.results?.map((res: any) => (
                <tr key={res.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="p-3.5 font-bold font-mono text-sm text-indigo-400">
                    #{res.rank}
                  </td>
                  <td className="p-3.5">
                    <div className="font-semibold text-white">{res.submission.title}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Team: {res.submission.team.name}
                    </div>
                  </td>
                  <td className="p-3.5 text-center font-mono text-slate-300">
                    {res.rawTotal?.toFixed(2)} / 10
                  </td>
                  <td className="p-3.5 text-center font-mono font-bold text-emerald-400 text-sm">
                    {res.normalizedTotal >= 0 ? `+${res.normalizedTotal?.toFixed(3)}` : res.normalizedTotal?.toFixed(3)}σ
                  </td>
                  <td className="p-3.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        res.isPublished
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {res.isPublished ? "PUBLISHED" : "DRAFT"}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => openScorecard(res.submissionId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium text-xs transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View Scorecard
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Explainable Scorecard Modal */}
      {(selectedScorecard || loadingScorecard) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-2xl border-indigo-500/40">
            {loadingScorecard ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Generating mathematical explainability breakdown...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider">
                      Explainable Scorecard • Section 6.1.5
                    </span>
                    <h3 className="text-lg font-bold text-white">{selectedScorecard.submissionTitle}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedScorecard(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[11px] text-slate-400">Raw Average Score</div>
                    <div className="text-xl font-bold text-white font-mono">
                      {selectedScorecard.rawAverage} / 10
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30">
                    <div className="text-[11px] text-indigo-300">Normalized Total (Z-Score)</div>
                    <div className="text-xl font-bold text-indigo-400 font-mono">
                      {selectedScorecard.normalizedTotal}σ
                    </div>
                  </div>
                </div>

                {/* Mathematical formulas */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
                  <div className="font-semibold text-slate-300">Normalization Mechanics:</div>
                  {selectedScorecard.mathExplanation.map((line: string, i: number) => (
                    <p key={i} className="text-slate-400 font-mono text-[11px] leading-relaxed">
                      • {line}
                    </p>
                  ))}
                </div>

                {/* Scores by criterion */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                    Criterion Breakdown & Judge Calibrations
                  </h4>
                  {selectedScorecard.scoresByCriterion.map((crit: any) => (
                    <div
                      key={crit.criterionId}
                      className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">{crit.criterionName}</span>
                        <span className="font-mono text-slate-400 text-[11px]">
                          Weight: {Math.round(crit.weight * 100)}% • Z-Avg: {crit.normalizedAverage}σ
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {crit.judgeScores.map((js: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]"
                          >
                            <div>
                              <span className="font-medium text-slate-200">{js.judgeName}:</span>{" "}
                              <span className="text-slate-400 font-mono">
                                raw {js.rawScore} (judge mean={js.judgeMean}, σ={js.judgeStdDev})
                              </span>
                              {js.comment && (
                                <p className="text-[10px] text-slate-500 italic mt-0.5">
                                  &quot;{js.comment}&quot;
                                </p>
                              )}
                            </div>
                            <span className="font-mono font-bold text-emerald-400 text-xs">
                              z={js.zScore >= 0 ? `+${js.zScore}` : js.zScore}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedScorecard.conflictsExcluded?.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                    <div className="font-semibold text-amber-300">Excluded Under Conflict of Interest:</div>
                    {selectedScorecard.conflictsExcluded.map((c: any, i: number) => (
                      <p key={i} className="text-amber-200/80 text-[11px]">
                        • {c.judgeName} ({c.reason})
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
