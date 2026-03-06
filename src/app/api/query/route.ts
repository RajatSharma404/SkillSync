import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { answerPerformanceQuery } from "@/lib/claude";
import { subDays } from "date-fns";

// POST /api/query — on-demand natural language performance question
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { question } = body;

  if (
    !question ||
    typeof question !== "string" ||
    question.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "question is required" },
      { status: 400 },
    );
  }

  // Sanitize: cap length to prevent prompt injection payloads
  const sanitized = question.slice(0, 500);

  const [activities, insights] = await Promise.all([
    prisma.activityLog.findMany({
      where: {
        userId: session.user.id,
        loggedAt: { gte: subDays(new Date(), 90) },
      },
      include: { domain: true },
      orderBy: { loggedAt: "asc" },
    }),
    prisma.insight.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const answer = await answerPerformanceQuery(sanitized, activities, insights);

  return NextResponse.json({ answer });
}
