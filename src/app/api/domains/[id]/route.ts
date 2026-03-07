import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/domains/:id — toggle isActive for the current user
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { isActive } = await req.json();

  const domain = await prisma.domain.findUnique({ where: { id } });
  if (!domain) {
    return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const userDomain = await prisma.userDomain.upsert({
    where: {
      userId_domainId: { userId: session.user.id, domainId: id },
    },
    update: { isActive: Boolean(isActive) },
    create: {
      userId: session.user.id,
      domainId: id,
      isActive: Boolean(isActive),
    },
  });

  return NextResponse.json(userDomain);
}
