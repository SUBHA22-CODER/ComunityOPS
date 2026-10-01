import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { buildExplainableScorecard, NormalizedScoreDetail } from "@/lib/judging-engine";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        team: true,
        program: true,
        results: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const normalizedScores = await prisma.normalizedScore.findMany({
      where: { submissionId },
      include: {
        criterion: true,
      },
    });

    // Fetch judges info
    const judgeIds = Array.from(new Set(normalizedScores.map((s) => s.judgeId)));
    const judges = await prisma.user.findMany({
      where: { id: { in: judgeIds } },
    });
    const judgeMap = new Map(judges.map((j) => [j.id, j.name]));

    // Fetch all scores of these judges to calculate means & variances for transparency
    const allJudgeScores = await prisma.score.findMany({
      where: { judgeId: { in: judgeIds } },
    });

    const judgeStats: Record<string, { mean: number; stdDev: number }> = {};
    for (const jId of judgeIds) {
      const jScores = allJudgeScores.filter((s) => s.judgeId === jId).map((s) => s.rawScore);
      const mean = jScores.length ? jScores.reduce((a, b) => a + b, 0) / jScores.length : 0;
      const variance =
        jScores.length > 1
          ? jScores.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (jScores.length - 1)
          : 0;
      judgeStats[jId] = { mean, stdDev: Math.sqrt(variance) };
    }

    const formattedDetails: NormalizedScoreDetail[] = normalizedScores.map((ns) => {
      const stats = judgeStats[ns.judgeId] || { mean: 0, stdDev: 0 };
      return {
        submissionId: ns.submissionId,
        judgeId: ns.judgeId,
        judgeName: judgeMap.get(ns.judgeId) || "Judge",
        criterionId: ns.criterionId,
        criterionName: ns.criterion.name,
        rawScore: ns.rawScore,
        maxScore: ns.criterion.maxScore,
        weight: ns.criterion.weight,
        judgeMean: Number(stats.mean.toFixed(2)),
        judgeStdDev: Number(stats.stdDev.toFixed(2)),
        zScore: ns.zScore,
        weightedScore: ns.weightedScore,
        isZeroVarianceFallback: stats.stdDev < 0.0001,
      };
    });

    // Excluded conflicts of interest
    const conflicts = await prisma.conflictOfInterest.findMany({
      where: { teamId: submission.teamId, status: "ACTIVE" },
      include: { judge: true },
    });

    const excludedConflicts = conflicts.map((c) => ({
      judgeName: c.judge.name,
      reason: c.reason,
    }));

    const scorecard = buildExplainableScorecard(
      submission.id,
      submission.title,
      formattedDetails,
      excludedConflicts
    );

    if (submission.results.length > 0) {
      scorecard.rank = submission.results[0].rank;
    }

    return NextResponse.json({ scorecard });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
