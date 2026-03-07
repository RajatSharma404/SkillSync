import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/goals/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (goal.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
