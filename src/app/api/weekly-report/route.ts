import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/weekly-report — fetch all weekly reports for current user
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reports = await prisma.weeklyReport.findMany({
    where: { userId: session.user.id },
    include: { insights: true },
    orderBy: { weekStart: "desc" },
    take: 12,
  });

  return NextResponse.json(reports);
}
