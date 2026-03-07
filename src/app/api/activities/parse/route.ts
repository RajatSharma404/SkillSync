import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseActivityText } from "@/lib/claude";
import { checkRateLimit } from "@/lib/ratelimit";

// POST /api/activities/parse — AI-parse a natural language activity description
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 30 parses per minute per user
  const rl = checkRateLimit(`parse:${session.user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rl.retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const { text } = body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Sanitize input length
  const sanitized = text.slice(0, 300);

  // Fetch user's active domains for the parser to pick from
  const userDomains = await prisma.userDomain.findMany({
    where: { userId: session.user.id, isActive: true },
    include: { domain: true },
  });
  const availableDomains = userDomains.map((ud) => ud.domain.name);

  const parsed = await parseActivityText(sanitized, availableDomains);

  // Resolve domainName → domainId if we got a match
  let domainId: string | null = null;
  if (parsed.domainName) {
    const match = userDomains.find(
      (ud) => ud.domain.name.toLowerCase() === parsed.domainName!.toLowerCase(),
    );
    domainId = match?.domain.id ?? null;
  }

  return NextResponse.json({ ...parsed, domainId });
}
