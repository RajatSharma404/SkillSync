import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suggestGoals } from "@/lib/claude";
import { checkRateLimit } from "@/lib/ratelimit";
import type { ActivityWithDomain } from "@/types";
import { subDays } from "date-fns";

// POST /api/goals/suggest — AI-suggest goals based on activity history
export async function POST(req: NextRequest) {
  void req;
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 10 suggestions per hour per user
  const rl = checkRateLimit(`suggest:${session.user.id}`, 10, 60 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rl.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const rawActivities = await prisma.activityLog.findMany({
    where: {
      userId: session.user.id,
      loggedAt: { gte: subDays(new Date(), 30) },
    },
    include: { domain: true },
    orderBy: { loggedAt: "asc" },
  });

  if (rawActivities.length < 3) {
    return NextResponse.json(
      {
        error:
          "Log at least a few activities first so the AI has data to work with.",
      },
      { status: 422 },
    );
  }

  const activities = rawActivities as unknown as ActivityWithDomain[];
  const suggestions = await suggestGoals(activities);

  return NextResponse.json(suggestions);
}
