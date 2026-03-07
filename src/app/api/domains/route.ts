import { NextRequest, NextResponse } from "next/server";
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

// POST /api/domains — create a new custom domain (and auto-activate it for this user)
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, icon, color, description } = body;

  if (!name || !icon || !color) {
    return NextResponse.json(
      { error: "name, icon, and color are required" },
      { status: 400 },
    );
  }

  // Sanitize name to prevent injection
  const safeName = String(name).trim().slice(0, 40);
  if (!safeName) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }

  // Check uniqueness
  const existing = await prisma.domain.findUnique({
    where: { name: safeName },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A domain with this name already exists" },
      { status: 409 },
    );
  }

  const domain = await prisma.domain.create({
    data: {
      name: safeName,
      icon: String(icon).slice(0, 8),
      color: String(color).slice(0, 20),
      description: description ? String(description).slice(0, 200) : null,
      isCustom: true,
      createdBy: session.user.id,
      // Auto-activate for creator
      userDomains: {
        create: { userId: session.user.id, isActive: true },
      },
    },
  });

  return NextResponse.json({ ...domain, isActive: true }, { status: 201 });
}
