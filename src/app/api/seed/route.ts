import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_DOMAINS } from "@/types";

// POST /api/seed — seed the default domains (run once on first setup)
export async function POST() {
  const created: string[] = [];

  for (const d of DEFAULT_DOMAINS) {
    const existing = await prisma.domain.findUnique({
      where: { name: d.name },
    });
    if (!existing) {
      await prisma.domain.create({ data: d });
      created.push(d.name);
    }
  }

  return NextResponse.json({
    message:
      created.length > 0
        ? `Seeded: ${created.join(", ")}`
        : "All domains already exist",
    created,
  });
}
