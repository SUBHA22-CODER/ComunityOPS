import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { normalizeJudgingScores } from "@/lib/judging-engine";
import { requestApproval } from "@/lib/approvals";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");

    const submissions = await prisma.submission.findMany({
      where: programId ? { programId } : undefined,
      include: {
        team: true,
        scores: {
          include: {
            judge: true,
            criterion: true,
          },
        },
        results: true,
      },
    });

    const rubrics = await prisma.rubric.findMany({
      where: programId ? { programId } : undefined,
      include: { criteria: true },
    });

    const conflicts = await prisma.conflictOfInterest.findMany({
      where: programId ? { programId } : undefined,
      include: { judge: true, team: true },
    });

    const results = await prisma.result.findMany({
      where: programId ? { programId } : undefined,
      include: { submission: { include: { team: true } } },
      orderBy: { rank: "asc" },
    });

    return NextResponse.json({ submissions, rubrics, conflicts, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, programId, userId = "admin" } = body;

    if (!programId) {
      return NextResponse.json({ error: "programId is required" }, { status: 400 });
    }

    // Action 1: SUBMIT_SCORE
    if (action === "submit_score") {
      const { judgeId, submissionId, criterionId, rawScore, comment } = body;

      const score = await prisma.score.upsert({
        where: {
          judgeId_submissionId_criterionId: {
            judgeId,
            submissionId,
            criterionId,
          },
        },
        update: {
          rawScore: Number(rawScore),
          comment,
        },
        create: {
          judgeId,
          submissionId,
          criterionId,
          rawScore: Number(rawScore),
          comment,
        },
      });

      return NextResponse.json({ success: true, score });
    }

    // Action 2: COMPUTE_NORMALIZATION
    if (action === "compute") {
      const allScores = await prisma.score.findMany({
        where: { submission: { programId } },
        include: {
          judge: true,
          submission: true,
          criterion: true,
        },
      });

      const conflicts = await prisma.conflictOfInterest.findMany({
        where: { programId },
      });

      const formattedScores = allScores.map((s) => ({
        judgeId: s.judgeId,
        judgeName: s.judge.name,
        submissionId: s.submissionId,
        criterionId: s.criterionId,
        criterionName: s.criterion.name,
        weight: s.criterion.weight,
        maxScore: s.criterion.maxScore,
        rawScore: s.rawScore,
        comment: s.comment,
      }));

      const conflictRecords = conflicts.map((c) => ({
        judgeId: c.judgeId,
        teamId: c.teamId,
        reason: c.reason,
        status: c.status as "ACTIVE" | "OVERRIDDEN",
      }));

      const { normalizedScores, judgeStatsMap } = normalizeJudgingScores(
        formattedScores,
        conflictRecords
      );

      // Save normalized scores
      for (const ns of normalizedScores) {
        await prisma.normalizedScore.upsert({
          where: {
            submissionId_judgeId_criterionId: {
              submissionId: ns.submissionId,
              judgeId: ns.judgeId,
              criterionId: ns.criterionId,
            },
          },
          update: {
            rawScore: ns.rawScore,
            zScore: ns.zScore,
            weightedScore: ns.weightedScore,
          },
          create: {
            submissionId: ns.submissionId,
            judgeId: ns.judgeId,
            criterionId: ns.criterionId,
            rawScore: ns.rawScore,
            zScore: ns.zScore,
            weightedScore: ns.weightedScore,
          },
        });
      }

      // Aggregate totals per submission
      const subTotals: Record<string, { rawSum: number; normSum: number; count: number }> = {};
      for (const ns of normalizedScores) {
        if (!subTotals[ns.submissionId]) {
          subTotals[ns.submissionId] = { rawSum: 0, normSum: 0, count: 0 };
        }
        subTotals[ns.submissionId].rawSum += ns.rawScore;
        subTotals[ns.submissionId].normSum += ns.weightedScore;
        subTotals[ns.submissionId].count += 1;
      }

      // Rank submissions by normalized total
      const sortedSubs = Object.entries(subTotals)
        .map(([submissionId, data]) => ({
          submissionId,
          rawAvg: Number((data.rawSum / (data.count || 1)).toFixed(2)),
          normTotal: Number(data.normSum.toFixed(3)),
        }))
        .sort((a, b) => b.normTotal - a.normTotal);

      // Upsert results table
      for (let i = 0; i < sortedSubs.length; i++) {
        const item = sortedSubs[i];
        await prisma.result.upsert({
          where: { submissionId: item.submissionId },
          update: {
            rawTotal: item.rawAvg,
            normalizedTotal: item.normTotal,
            rank: i + 1,
          },
          create: {
            programId,
            submissionId: item.submissionId,
            rawTotal: item.rawAvg,
            normalizedTotal: item.normTotal,
            rank: i + 1,
            isPublished: false,
          },
        });
      }

      return NextResponse.json({
        success: true,
        rankedCount: sortedSubs.length,
        judgeStats: judgeStatsMap,
      });
    }

    // Action 3: REQUEST_PUBLISH (Requires Approval Gate)
    if (action === "publish") {
      const results = await prisma.result.findMany({
        where: { programId },
        include: { submission: { include: { team: true } } },
        orderBy: { rank: "asc" },
      });

      if (results.length === 0) {
        return NextResponse.json(
          { error: "No computed results found. Compute scores first." },
          { status: 400 }
        );
      }

      const diffSummary = {
        action: "Publish Official Results & Leaderboard",
        totalSubmissions: results.length,
        rankings: results.map((r) => ({
          rank: r.rank,
          title: r.submission.title,
          team: r.submission.team.name,
          normalizedScore: r.normalizedTotal,
          rawAverage: r.rawTotal,
        })),
      };

      const approval = await requestApproval({
        programId,
        actionType: "PUBLISH_RESULTS",
        targetType: "Result",
        targetId: programId,
        requestedBy: userId,
        diffSummary,
      });

      return NextResponse.json({
        approvalRequired: true,
        approvalId: approval.id,
        message: "Publishing results requires approval gate confirmation",
        diffSummary,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
