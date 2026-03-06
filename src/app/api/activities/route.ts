import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/activities — list activities for the current user
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const domainId = searchParams.get("domainId");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

  const activities = await prisma.activityLog.findMany({
    where: {
      userId: session.user.id,
      ...(domainId ? { domainId } : {}),
    },
    include: { domain: true },
    orderBy: { loggedAt: "desc" },
    take: limit,
  });

  return NextResponse.json(activities);
}

// POST /api/activities — create a new activity log
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { domainId, value, unit, mood, energy, notes, metadata, loggedAt } =
    body;

  if (!domainId) {
    return NextResponse.json(
      { error: "domainId is required" },
      { status: 400 },
    );
  }

  // Validate the domain exists
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const activity = await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      domainId,
      value: value !== undefined ? parseFloat(value) : null,
      unit: unit ?? null,
      mood: mood !== undefined ? parseInt(mood, 10) : null,
      energy: energy !== undefined ? parseInt(energy, 10) : null,
      notes: notes ?? null,
      metadata: metadata ?? undefined,
      loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
    },
    include: { domain: true },
  });

  return NextResponse.json(activity, { status: 201 });
}
