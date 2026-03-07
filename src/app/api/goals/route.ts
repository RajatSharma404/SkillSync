import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, startOfMonth } from "date-fns";

// GET /api/goals — list goals with current-period progress
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const goals = await prisma.goal.findMany({
    where: { userId },
    include: { domain: true },
    orderBy: { createdAt: "asc" },
  });

  // Calculate progress for each goal
  const now = new Date();
  const goalsWithProgress = await Promise.all(
    goals.map(async (goal) => {
      const periodStart =
        goal.period === "monthly" ? startOfMonth(now) : subDays(now, 6);

      const logs = await prisma.activityLog.findMany({
        where: {
          userId,
          domainId: goal.domainId,
          loggedAt: { gte: periodStart },
          value: { not: null },
        },
        select: { value: true },
      });

      const currentValue = logs.reduce((sum, l) => sum + (l.value ?? 0), 0);
      const progressPct = Math.min(
        100,
        Math.round((currentValue / goal.targetValue) * 100),
      );

      return {
        ...goal,
        domain: goal.domain,
        currentValue: Math.round(currentValue * 10) / 10,
        progressPct,
      };
    }),
  );

  return NextResponse.json(goalsWithProgress);
}

// POST /api/goals — create or upsert a goal
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { domainId, targetValue, unit, period = "weekly" } = body;

  if (!domainId || targetValue === undefined || !unit) {
    return NextResponse.json(
      { error: "domainId, targetValue, and unit are required" },
      { status: 400 },
    );
  }
  if (!["weekly", "monthly"].includes(period)) {
    return NextResponse.json(
      { error: "period must be weekly or monthly" },
      { status: 400 },
    );
  }

  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const goal = await prisma.goal.upsert({
    where: {
      userId_domainId_period: {
        userId: session.user.id,
        domainId,
        period,
      },
    },
    update: { targetValue: parseFloat(targetValue), unit },
    create: {
      userId: session.user.id,
      domainId,
      targetValue: parseFloat(targetValue),
      unit,
      period,
    },
    include: { domain: true },
  });

  return NextResponse.json(goal, { status: 201 });
}
