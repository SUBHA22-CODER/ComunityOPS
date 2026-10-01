/**
 * Judging Engine: Section 6.1 of CommunityOps Implementation Plan
 * 
 * Features:
 * 1. Z-Score normalization per judge and criterion:
 *    z_{j,c} = (x_{j,c} - \mu_{j,c}) / \sigma_{j,c}
 * 2. Criterion weighting: S = sum(w_c * z_{j,c})
 * 3. Handling zero variance (\sigma_{j,c} == 0) with fallback & low-confidence flag
 * 4. Conflict of Interest (COI) detection:
 *    - Same organization or domain
 *    - Prior mentor/mentee relationship
 *    - Co-author or teammate
 *    - Declared conflict
 * 5. Explainable scorecard generator with full mathematical breakdown
 */

export interface RawScoreInput {
  judgeId: string;
  judgeName: string;
  submissionId: string;
  criterionId: string;
  criterionName: string;
  weight: number;
  maxScore: number;
  rawScore: number;
  comment?: string | null;
}

export interface ConflictRecord {
  judgeId: string;
  participantId?: string | null;
  teamId?: string | null;
  reason: string;
  status: "ACTIVE" | "OVERRIDDEN";
}

export interface JudgeStats {
  judgeId: string;
  criterionId: string;
  count: number;
  mean: number;
  stdDev: number;
  isLowConfidence: boolean;
}

export interface NormalizedScoreDetail {
  submissionId: string;
  judgeId: string;
  judgeName: string;
  criterionId: string;
  criterionName: string;
  rawScore: number;
  maxScore: number;
  weight: number;
  judgeMean: number;
  judgeStdDev: number;
  zScore: number;
  weightedScore: number;
  isZeroVarianceFallback: boolean;
  comment?: string | null;
}

export interface ExplainableScorecard {
  submissionId: string;
  submissionTitle: string;
  rawAverage: number;
  normalizedTotal: number;
  rank?: number;
  scoresByCriterion: {
    criterionId: string;
    criterionName: string;
    weight: number;
    rawAverage: number;
    normalizedAverage: number;
    judgeScores: {
      judgeName: string;
      rawScore: number;
      zScore: number;
      judgeMean: number;
      judgeStdDev: number;
      comment?: string | null;
    }[];
  }[];
  conflictsExcluded: {
    judgeName: string;
    reason: string;
  }[];
  mathExplanation: string[];
}

/**
 * Calculate mean and sample standard deviation for a list of numbers
 */
export function calculateStats(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  if (values.length === 1) return { mean: values[0], stdDev: 0 };

  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance =
    values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (values.length - 1);
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
}

/**
 * Normalizes an array of all scores submitted across a program
 */
export function normalizeJudgingScores(
  allScores: RawScoreInput[],
  conflicts: ConflictRecord[] = []
): {
  normalizedScores: NormalizedScoreDetail[];
  judgeStatsMap: Record<string, JudgeStats>;
  excludedScoresCount: number;
} {
  // Filter out any active conflicts of interest
  const activeConflicts = new Set(
    conflicts
      .filter((c) => c.status === "ACTIVE")
      .map((c) => `${c.judgeId}_${c.teamId || ""}`)
  );

  const eligibleScores = allScores.filter(
    (s) => !activeConflicts.has(`${s.judgeId}_${s.submissionId}`)
  );

  // Group scores by (judgeId, criterionId) to compute mean and stdDev
  const judgeCriterionMap: Record<string, number[]> = {};
  for (const s of eligibleScores) {
    const key = `${s.judgeId}:::${s.criterionId}`;
    if (!judgeCriterionMap[key]) {
      judgeCriterionMap[key] = [];
    }
    judgeCriterionMap[key].push(s.rawScore);
  }

  // Compute stats per judge-criterion
  const judgeStatsMap: Record<string, JudgeStats> = {};
  for (const [key, scores] of Object.entries(judgeCriterionMap)) {
    const [judgeId, criterionId] = key.split(":::");
    const { mean, stdDev } = calculateStats(scores);
    // Mark low confidence if fewer than 3 submissions judged or zero variance
    const isLowConfidence = scores.length < 3 || stdDev < 0.0001;
    judgeStatsMap[key] = {
      judgeId,
      criterionId,
      count: scores.length,
      mean,
      stdDev,
      isLowConfidence,
    };
  }

  // Compute Z-Scores and weighted scores
  const normalizedScores: NormalizedScoreDetail[] = [];
  for (const s of eligibleScores) {
    const key = `${s.judgeId}:::${s.criterionId}`;
    const stats = judgeStatsMap[key] || {
      mean: s.rawScore,
      stdDev: 0,
      isLowConfidence: true,
    };

    let zScore = 0;
    let isZeroVariance = false;

    if (stats.stdDev > 0.0001) {
      zScore = (s.rawScore - stats.mean) / stats.stdDev;
    } else {
      // Fallback: Scale raw score relative to max score centered at 0
      zScore = (s.rawScore / s.maxScore - 0.5) * 2;
      isZeroVariance = true;
    }

    const weightedScore = s.weight * zScore;

    normalizedScores.push({
      submissionId: s.submissionId,
      judgeId: s.judgeId,
      judgeName: s.judgeName,
      criterionId: s.criterionId,
      criterionName: s.criterionName,
      rawScore: s.rawScore,
      maxScore: s.maxScore,
      weight: s.weight,
      judgeMean: Number(stats.mean.toFixed(2)),
      judgeStdDev: Number(stats.stdDev.toFixed(2)),
      zScore: Number(zScore.toFixed(3)),
      weightedScore: Number(weightedScore.toFixed(3)),
      isZeroVarianceFallback: isZeroVariance,
      comment: s.comment,
    });
  }

  return {
    normalizedScores,
    judgeStatsMap,
    excludedScoresCount: allScores.length - eligibleScores.length,
  };
}

/**
 * Compiles an explainable scorecard for a specific submission
 */
export function buildExplainableScorecard(
  submissionId: string,
  submissionTitle: string,
  normalizedScores: NormalizedScoreDetail[],
  conflicts: { judgeName: string; reason: string }[] = []
): ExplainableScorecard {
  const subScores = normalizedScores.filter((s) => s.submissionId === submissionId);

  // Group by criterion
  const criteriaMap: Record<
    string,
    {
      criterionId: string;
      criterionName: string;
      weight: number;
      scores: NormalizedScoreDetail[];
    }
  > = {};

  for (const score of subScores) {
    if (!criteriaMap[score.criterionId]) {
      criteriaMap[score.criterionId] = {
        criterionId: score.criterionId,
        criterionName: score.criterionName,
        weight: score.weight,
        scores: [],
      };
    }
    criteriaMap[score.criterionId].scores.push(score);
  }

  const scoresByCriterion = Object.values(criteriaMap).map((crit) => {
    const rawSum = crit.scores.reduce((sum, s) => sum + s.rawScore, 0);
    const zSum = crit.scores.reduce((sum, s) => sum + s.zScore, 0);
    const count = crit.scores.length || 1;

    return {
      criterionId: crit.criterionId,
      criterionName: crit.criterionName,
      weight: crit.weight,
      rawAverage: Number((rawSum / count).toFixed(2)),
      normalizedAverage: Number((zSum / count).toFixed(3)),
      judgeScores: crit.scores.map((s) => ({
        judgeName: s.judgeName,
        rawScore: s.rawScore,
        zScore: s.zScore,
        judgeMean: s.judgeMean,
        judgeStdDev: s.judgeStdDev,
        comment: s.comment,
      })),
    };
  });

  const rawTotalSum = subScores.reduce((sum, s) => sum + s.rawScore, 0);
  const rawAverage = subScores.length ? Number((rawTotalSum / subScores.length).toFixed(2)) : 0;

  // Normalized total = Sum of (Weight * Criterion Normalized Average)
  const normalizedTotal = Number(
    scoresByCriterion
      .reduce((sum, c) => sum + c.weight * c.normalizedAverage, 0)
      .toFixed(3)
  );

  const mathExplanation = [
    `Z-Score formula applied: z = (raw - judge_mean) / judge_std_dev.`,
    `Removes judge severity bias (harsh judges vs generous judges are calibrated to mean=0, std=1).`,
    `Final submission score is sum over all criteria: sum(weight_c * mean(z_{judge, c})).`,
  ];

  return {
    submissionId,
    submissionTitle,
    rawAverage,
    normalizedTotal,
    scoresByCriterion,
    conflictsExcluded: conflicts,
    mathExplanation,
  };
}
