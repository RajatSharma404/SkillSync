import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDailyNudge } from "@/lib/claude";
import { checkRateLimit } from "@/lib/ratelimit";
import type { ActivityWithDomain } from "@/types";
import { subDays, format } from "date-fns";

// GET /api/insights/nudge — return (or generate) today's personalized AI tip
export async function GET(req: NextRequest) {
  void req;
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 10 requests per hour per user (nudge is DB-cached so usually cheap)
  const rl = checkRateLimit(`nudge:${session.user.id}`, 10, 60 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rl.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const userId = session.user.id;
  const today = format(new Date(), "yyyy-MM-dd");

  // Return cached nudge if one was already generated today
  const existing = await prisma.insight.findFirst({
    where: {
      userId,
      insightType: "WIN",
      insightText: { startsWith: "[nudge]" },
      createdAt: { gte: new Date(`${today}T00:00:00`) },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return NextResponse.json({
      nudge: existing.insightText.replace("[nudge] ", ""),
    });
  }

  // Fetch last 14 days of activity for context
  const rawActivities = await prisma.activityLog.findMany({
    where: {
      userId,
      loggedAt: { gte: subDays(new Date(), 14) },
    },
    include: { domain: true },
    orderBy: { loggedAt: "asc" },
  });

  const activities = rawActivities as unknown as ActivityWithDomain[];
  const nudge = await generateDailyNudge(activities);

  // Persist so we don't call the AI again today for this user
  await prisma.insight.create({
    data: {
      userId,
      insightText: `[nudge] ${nudge}`,
      domainsInvolved: [],
      confidenceLevel: 1,
      recommendation: "",
      insightType: "WIN",
    },
  });

  return NextResponse.json({ nudge });
}
