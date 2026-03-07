import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { answerPerformanceQuery, type ChatMessage } from "@/lib/claude";
import { checkRateLimit } from "@/lib/ratelimit";
import { subDays } from "date-fns";

// POST /api/query — on-demand natural language performance question (multi-turn)
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 20 requests per minute per user
  const rl = checkRateLimit(`query:${session.user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rl.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await req.json();
  const { question, messages } = body;

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

  // Validate and sanitize history if provided
  const history: ChatMessage[] = Array.isArray(messages)
    ? messages
        .filter(
          (m) =>
            m &&
            typeof m === "object" &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
        .slice(-10) // keep last 10 turns max to avoid token overflow
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: String(m.content).slice(0, 1000),
        }))
    : [];

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

  const answer = await answerPerformanceQuery(
    sanitized,
    activities,
    insights,
    history,
  );

  return NextResponse.json({ answer });
}
