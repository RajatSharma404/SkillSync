import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

// GET /api/export?format=csv|json
// Returns the authenticated user's full activity history as a downloadable file.
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fmt = searchParams.get("format") === "json" ? "json" : "csv";

  const activities = await prisma.activityLog.findMany({
    where: { userId: session.user.id },
    include: { domain: true },
    orderBy: { loggedAt: "desc" },
  });

  const timestamp = format(new Date(), "yyyy-MM-dd");
  const filename = `skillsync-export-${timestamp}.${fmt}`;

  if (fmt === "json") {
    const payload = activities.map((a) => ({
      id: a.id,
      domain: a.domain.name,
      domainIcon: a.domain.icon,
      loggedAt: a.loggedAt.toISOString(),
      value: a.value,
      unit: a.unit,
      mood: a.mood,
      energy: a.energy,
      notes: a.notes,
    }));

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // CSV
  const header = "id,domain,loggedAt,value,unit,mood,energy,notes";
  const rows = activities.map((a) => {
    const escapeCsv = (v: string | null | undefined) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      // Wrap in quotes if value contains comma, quote, or newline
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    return [
      a.id,
      escapeCsv(a.domain.name),
      a.loggedAt.toISOString(),
      a.value ?? "",
      escapeCsv(a.unit),
      a.mood ?? "",
      a.energy ?? "",
      escapeCsv(a.notes),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
