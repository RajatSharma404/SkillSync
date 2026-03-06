import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/activities/:id — delete a specific activity log
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership before deleting
  const activity = await prisma.activityLog.findUnique({ where: { id } });
  if (!activity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (activity.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.activityLog.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// PATCH /api/activities/:id — update notes/mood/energy/value/unit
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const activity = await prisma.activityLog.findUnique({ where: { id } });
  if (!activity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (activity.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { notes, mood, energy, value, unit } = body;

  const updated = await prisma.activityLog.update({
    where: { id },
    data: {
      ...(notes !== undefined && { notes: notes || null }),
      ...(mood !== undefined && { mood: mood ? parseInt(mood, 10) : null }),
      ...(energy !== undefined && {
        energy: energy ? parseInt(energy, 10) : null,
      }),
      ...(value !== undefined && {
        value: value !== null ? parseFloat(value) : null,
      }),
      ...(unit !== undefined && { unit: unit || null }),
    },
    include: { domain: true },
  });

  return NextResponse.json(updated);
}
