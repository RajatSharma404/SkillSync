import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/domains — list all domains, with user activation status
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const domains = await prisma.domain.findMany({
    include: {
      userDomains: {
        where: { userId: session.user.id },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    domains.map((d) => ({
      ...d,
      isActive: d.userDomains.length > 0 && d.userDomains[0].isActive,
    })),
  );
}
