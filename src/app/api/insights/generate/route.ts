import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateWeeklyReport } from "@/lib/claude";
import type { ActivityWithDomain } from "@/types";
import { startOfWeek, endOfWeek, subDays } from "date-fns";

// POST /api/insights/generate — trigger AI weekly report generation
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json().catch(() => ({}));
  const targetDate = body.date ? new Date(body.date) : new Date();

  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 }); // Sunday

  // Check if a report for this week already exists
  const existing = await prisma.weeklyReport.findUnique({
    where: { userId_weekStart: { userId, weekStart } },
    include: { insights: true },
  });
  if (existing) {
    return NextResponse.json(existing);
  }

  // Fetch the last 90 days of activity for richer analysis
  const rawActivities = await prisma.activityLog.findMany({
    where: {
      userId,
      loggedAt: { gte: subDays(weekEnd, 90) },
    },
    include: { domain: true },
    orderBy: { loggedAt: "asc" },
  });

  const activities = rawActivities as unknown as ActivityWithDomain[];

  if (activities.length === 0) {
    return NextResponse.json(
      {
        error:
          "Not enough data to generate a report. Log some activities first!",
      },
      { status: 422 },
    );
  }

  // Call Claude — handle credit depletion gracefully
  let reportData;
  try {
    reportData = await generateWeeklyReport(activities);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("AI_CREDITS_DEPLETED")) {
      return NextResponse.json(
        {
          error: "AI rate limit reached. Please try again later.",
        },
        { status: 402 },
      );
    }
    return NextResponse.json(
      { error: "AI service unavailable. Please try again later." },
      { status: 503 },
    );
  }

  // Domains active this week
  const thisWeekActs = activities.filter(
    (a: ActivityWithDomain) => a.loggedAt >= weekStart && a.loggedAt <= weekEnd,
  );
  const domainsActive = [
    ...new Set(thisWeekActs.map((a: ActivityWithDomain) => a.domain.name)),
  ];

  // Persist the report and insights sequentially
  const created = await prisma.weeklyReport.create({
    data: {
      userId,
      weekStart,
      weekEnd,
      summary: reportData.summary,
      totalLogs: thisWeekActs.length,
      domainsActive,
    },
  });

  if (reportData.insights.length > 0) {
    await prisma.insight.createMany({
      data: reportData.insights.map((i) => ({
        userId,
        weeklyReportId: created.id,
        insightText: i.insightText,
        domainsInvolved: i.domainsInvolved,
        confidenceLevel: i.confidenceLevel,
        recommendation: i.recommendation,
        insightType: i.insightType,
      })),
    });
  }

  const report = await prisma.weeklyReport.findUnique({
    where: { id: created.id },
    include: { insights: true },
  });

  return NextResponse.json(report, { status: 201 });
}
