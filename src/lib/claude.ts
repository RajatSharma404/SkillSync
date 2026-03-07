import Groq from "groq-sdk";
import type { ActivityWithDomain, InsightData } from "@/types";

export type { ActivityWithDomain };

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface InsightOutput {
  insightText: string;
  domainsInvolved: string[];
  confidenceLevel: number;
  recommendation: string;
  insightType:
    | "CORRELATION"
    | "TIMING_OPTIMIZATION"
    | "TREND"
    | "WARNING"
    | "WIN";
}

export interface WeeklyReportOutput {
  summary: string;
  insights: InsightOutput[];
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildAnalysisPrompt(activities: ActivityWithDomain[]): string {
  const grouped: Record<string, object[]> = {};

  for (const a of activities) {
    const domain = a.domain.name;
    if (!grouped[domain]) grouped[domain] = [];
    grouped[domain].push({
      date: a.loggedAt.toISOString().split("T")[0],
      value: a.value,
      unit: a.unit,
      mood: a.mood,
      energy: a.energy,
      notes: a.notes,
      metadata: a.metadata,
    });
  }

  return JSON.stringify(grouped, null, 2);
}

// ─── Generate weekly AI report ───────────────────────────────────────────────

export async function generateWeeklyReport(
  activities: ActivityWithDomain[],
): Promise<WeeklyReportOutput> {
  const dataPayload = buildAnalysisPrompt(activities);

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `You are a personal performance analyst for SkillSync, a personal growth dashboard.
Your role is to analyze multi-domain activity data and surface actionable, data-backed insights.

Rules:
- Only report correlations that appear genuinely meaningful based on the data.
- Phrase insights in plain English that a motivated individual can immediately act on.
- Confidence level should reflect how much data supports the finding (0.0–1.0).
- insightType must be one of: CORRELATION, TIMING_OPTIMIZATION, TREND, WARNING, WIN.
- Return ONLY valid JSON — no markdown fences, no preamble, no explanation outside JSON.

Output format:
{
  "summary": "<2-3 sentence plain English week summary>",
  "insights": [
    {
      "insightText": "<plain English description of the pattern>",
      "domainsInvolved": ["<domain1>", "<domain2>"],
      "confidenceLevel": 0.85,
      "recommendation": "<actionable suggestion based on this insight>",
      "insightType": "CORRELATION"
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Analyze the following multi-domain activity data and return a weekly performance report:\n\n${dataPayload}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    try {
      return JSON.parse(raw) as WeeklyReportOutput;
    } catch {
      return {
        summary:
          "Unable to generate summary this week. Keep logging to get better insights!",
        insights: [],
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("rate_limit") || msg.includes("quota")) {
      throw new Error(
        "AI_CREDITS_DEPLETED: Groq rate limit reached. Please try again later.",
      );
    }
    throw err;
  }
}

// ─── On-demand natural language query (supports multi-turn) ─────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function answerPerformanceQuery(
  question: string,
  activities: ActivityWithDomain[],
  existingInsights: Pick<InsightData, "insightText" | "recommendation">[],
  history: ChatMessage[] = [],
): Promise<string> {
  const dataPayload = buildAnalysisPrompt(activities);

  // Build conversation: system + optional history + current question
  const conversationMessages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[] = [
    {
      role: "system",
      content: `You are a personal performance analyst for SkillSync.
Answer the user's question based solely on their activity data.
Be specific, data-driven, and concise (2-4 sentences).
Activity data context:\n${dataPayload}`,
    },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: question },
  ];

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 512,
      messages: conversationMessages,
    });

    return (
      completion.choices[0]?.message?.content ??
      "Unable to answer at this time."
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("credit balance") || msg.includes("insufficient_quota")) {
      return "AI analysis is temporarily unavailable — Groq rate limit reached. Please try again later.";
    }
    return "Unable to answer at this time. Please try again later.";
  }
}

// ─── Natural language activity parser ───────────────────────────────────────

export interface ParsedActivity {
  domainName: string | null;
  value: number | null;
  unit: string | null;
  mood: number | null;
  energy: number | null;
  notes: string | null;
}

export async function parseActivityText(
  text: string,
  availableDomains: string[],
): Promise<ParsedActivity> {
  const domainList = availableDomains.join(", ");
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 256,
      messages: [
        {
          role: "system",
          content: `You are a structured data extractor for a personal activity tracker.
Extract activity details from the user's natural language text.
Available domains: ${domainList}

Return ONLY valid JSON with these fields:
{
  "domainName": "<closest matching domain from the list, or null>",
  "value": <numeric amount or null>,
  "unit": "<unit string or null>",
  "mood": <integer 1-10 or null>,
  "energy": <integer 1-10 or null>,
  "notes": "<cleaned up note text, or null>"
}
No markdown, no explanation — only JSON.`,
        },
        { role: "user", content: text },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    return JSON.parse(raw) as ParsedActivity;
  } catch {
    return {
      domainName: null,
      value: null,
      unit: null,
      mood: null,
      energy: null,
      notes: text,
    };
  }
}

// ─── AI goal suggestions ─────────────────────────────────────────────────────

export interface GoalSuggestion {
  domainName: string;
  targetValue: number;
  unit: string;
  period: "weekly" | "monthly";
  reasoning: string;
}

export async function suggestGoals(
  activities: ActivityWithDomain[],
): Promise<GoalSuggestion[]> {
  if (activities.length === 0) return [];
  const dataPayload = buildAnalysisPrompt(activities);

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 512,
      messages: [
        {
          role: "system",
          content: `You are a personal goal-setting coach for SkillSync.
Analyze the user's recent activity data and suggest 2-4 realistic, motivating goals.
Base suggestions on their actual average performance — aim ~20% above recent average.

Return ONLY valid JSON array:
[
  {
    "domainName": "<exact domain name from data>",
    "targetValue": <number>,
    "unit": "<unit>",
    "period": "weekly" or "monthly",
    "reasoning": "<1 sentence why this goal makes sense>"
  }
]`,
        },
        {
          role: "user",
          content: `My activity data:\n${dataPayload}\n\nSuggest achievable goals based on my patterns.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";
    return JSON.parse(raw) as GoalSuggestion[];
  } catch {
    return [];
  }
}

// ─── Daily AI nudge ──────────────────────────────────────────────────────────

export async function generateDailyNudge(
  activities: ActivityWithDomain[],
): Promise<string> {
  if (activities.length === 0) {
    return "Start logging your first activity today — every data point makes your AI insights more powerful!";
  }
  const dataPayload = buildAnalysisPrompt(activities);

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: `You are a personal performance coach for SkillSync.
Give one short, specific, actionable tip (1-2 sentences) based on the user's recent data.
Be encouraging but data-grounded. No generic advice. No fluff.`,
        },
        {
          role: "user",
          content: `Recent activity data:\n${dataPayload}\n\nGive me today's performance tip.`,
        },
      ],
    });
    return (
      completion.choices[0]?.message?.content?.trim() ??
      "Keep logging — consistency is your superpower."
    );
  } catch {
    return "Keep logging — consistency is your superpower.";
  }
}
