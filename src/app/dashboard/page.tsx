import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActivityWithDomain, DomainData, InsightData } from "@/types";
import { redirect } from "next/navigation";
import { format, subDays, startOfDay, startOfMonth } from "date-fns";
import Link from "next/link";
import { generateDailyNudge } from "@/lib/claude";

export default async function DashboardPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const [
    recentActivities,
    latestInsights,
    weeklyReports,
    activityCounts,
    goals,
  ] = await Promise.all([
    prisma.activityLog.findMany({
      where: { userId, loggedAt: { gte: subDays(new Date(), 7) } },
      include: { domain: true },
      orderBy: { loggedAt: "desc" },
      take: 10,
    }),
    prisma.insight.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.weeklyReport.findMany({
      where: { userId },
      orderBy: { weekStart: "desc" },
      take: 1,
    }),
    prisma.activityLog.groupBy({
      by: ["domainId"],
      where: { userId, loggedAt: { gte: subDays(new Date(), 30) } },
      _count: { id: true },
    }),
    prisma.goal.findMany({
      where: { userId },
      include: { domain: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const allDomains = await prisma.domain.findMany();
  const domainMap: Record<string, DomainData> = {};
  (allDomains as unknown as DomainData[]).forEach(
    (d: DomainData) => (domainMap[d.id] = d),
  );

  const recentActs = recentActivities as unknown as ActivityWithDomain[];
  const latestIns = latestInsights as unknown as InsightData[];

  const totalLogsThisWeek = recentActs.length;
  const streakDays = calcStreak(
    recentActs.map((a: ActivityWithDomain) => a.loggedAt),
  );

  // Daily nudge — check cache then generate if needed
  const todayStr = format(new Date(), "yyyy-MM-dd");
  let dailyNudge = "";
  const cachedNudge = await prisma.insight.findFirst({
    where: {
      userId,
      insightType: "WIN",
      insightText: { startsWith: "[nudge]" },
      createdAt: { gte: new Date(`${todayStr}T00:00:00`) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (cachedNudge) {
    dailyNudge = cachedNudge.insightText.replace("[nudge] ", "");
  } else {
    const nudgeActivities = await prisma.activityLog.findMany({
      where: { userId, loggedAt: { gte: subDays(new Date(), 14) } },
      include: { domain: true },
      orderBy: { loggedAt: "asc" },
    });
    dailyNudge = await generateDailyNudge(
      nudgeActivities as unknown as ActivityWithDomain[],
    );
    await prisma.insight.create({
      data: {
        userId,
        insightText: `[nudge] ${dailyNudge}`,
        domainsInvolved: [],
        confidenceLevel: 1,
        recommendation: "",
        insightType: "WIN",
      },
    });
  }

  // Calculate current-period progress for each goal
  const now = new Date();
  const goalsWithProgress = await Promise.all(
    goals.map(async (goal) => {
      const periodStart =
        goal.period === "monthly" ? startOfMonth(now) : subDays(now, 6);
      const logs = await prisma.activityLog.findMany({
        where: {
          userId,
          domainId: goal.domainId,
          loggedAt: { gte: periodStart },
          value: { not: null },
        },
        select: { value: true },
      });
      const currentValue = logs.reduce((sum, l) => sum + (l.value ?? 0), 0);
      const progressPct = Math.min(
        100,
        Math.round((currentValue / goal.targetValue) * 100),
      );
      return {
        ...goal,
        currentValue: Math.round(currentValue * 10) / 10,
        progressPct,
      };
    }),
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>
          Good {getTimeOfDay()}, {session.user.name?.split(" ")[0] ?? "there"}{" "}
          👋
        </h1>
        <p style={{ color: "#6b7280", marginTop: "0.3rem" }}>
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Daily AI Nudge */}
      {dailyNudge && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "0.9rem 1.1rem",
            marginBottom: "1.75rem",
            background:
              "linear-gradient(135deg, rgba(0,212,255,0.07), rgba(14,165,233,0.05))",
            border: "1px solid rgba(0,212,255,0.18)",
            borderLeft: "3px solid #00d4ff",
            borderRadius: "10px",
          }}
        >
          <span style={{ fontSize: "1.15rem", flexShrink: 0 }}>🤖</span>
          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.65,
              color: "#cbd5e1",
              margin: 0,
            }}
          >
            <strong style={{ color: "#00d4ff" }}>Today's tip: </strong>
            {dailyNudge}
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {[
          { label: "Logs This Week", value: totalLogsThisWeek, icon: "📝" },
          { label: "Day Streak", value: streakDays, icon: "🔥" },
          {
            label: "Insights Generated",
            value: latestIns.length > 0 ? "✓" : "0",
            icon: "🧠",
          },
          { label: "Active Domains", value: activityCounts.length, icon: "🎯" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="card"
            style={{ textAlign: "center" }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
              {stat.icon}
            </div>
            <div
              style={{ fontSize: "2rem", fontWeight: 800, color: "#00d4ff" }}
            >
              {stat.value}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                marginTop: "0.25rem",
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
        }}
      >
        {/* Recent Activity */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>
              Recent Activity
            </h2>
            <Link
              href="/log"
              style={{
                fontSize: "0.8rem",
                color: "#00d4ff",
                textDecoration: "none",
              }}
            >
              + Log Activity
            </Link>
          </div>
          {recentActs.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem 0",
                color: "#6b7280",
              }}
            >
              <p>No activities logged this week.</p>
              <Link
                href="/log"
                style={{ color: "#00d4ff", fontSize: "0.875rem" }}
              >
                Log your first activity →
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {recentActs.map((a: ActivityWithDomain) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid #1a2448",
                  }}
                >
                  <span style={{ fontSize: "1.25rem", minWidth: 28 }}>
                    {a.domain.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      {a.domain.name}
                    </span>
                    {a.value && (
                      <span
                        style={{
                          color: "#6b7280",
                          fontSize: "0.8rem",
                          marginLeft: "0.5rem",
                        }}
                      >
                        {a.value} {a.unit}
                      </span>
                    )}
                    {a.notes && (
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "#4b5563",
                          marginTop: "0.15rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.notes}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "#4b5563",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {format(new Date(a.loggedAt), "MMM d")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Insights */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>
              Latest AI Insights
            </h2>
            <Link
              href="/insights"
              style={{
                fontSize: "0.8rem",
                color: "#00d4ff",
                textDecoration: "none",
              }}
            >
              View all
            </Link>
          </div>
          {latestIns.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem 0",
                color: "#6b7280",
              }}
            >
              <p>No insights yet.</p>
              <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                Log at least a week of activities, then generate your first
                report.
              </p>
              <Link
                href="/reports"
                style={{ color: "#00d4ff", fontSize: "0.875rem" }}
              >
                Generate Report →
              </Link>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {latestIns.map((ins: InsightData) => (
                <div
                  key={ins.id}
                  style={{
                    background: "rgba(0, 212, 255, 0.04)",
                    border: "1px solid #1a2448",
                    borderLeft: "3px solid #00d4ff",
                    borderRadius: "8px",
                    padding: "0.85rem 1rem",
                  }}
                >
                  <p style={{ fontSize: "0.85rem", lineHeight: 1.6 }}>
                    {ins.insightText}
                  </p>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#00d4ff",
                      marginTop: "0.4rem",
                    }}
                  >
                    💡 {ins.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Latest weekly report */}
      {weeklyReports.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>
              📋 Week of{" "}
              {format(new Date(weeklyReports[0].weekStart), "MMMM d")}
            </h2>
            <Link
              href="/reports"
              style={{
                fontSize: "0.8rem",
                color: "#00d4ff",
                textDecoration: "none",
              }}
            >
              All reports
            </Link>
          </div>
          <p
            style={{ color: "#9ca3af", fontSize: "0.875rem", lineHeight: 1.7 }}
          >
            {weeklyReports[0].summary}
          </p>
        </div>
      )}
      {/* Goals Progress */}
      {goalsWithProgress.length > 0 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
            }}
          >
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>
              🎯 Goals Progress
            </h2>
            <Link
              href="/settings"
              style={{
                fontSize: "0.8rem",
                color: "#00d4ff",
                textDecoration: "none",
              }}
            >
              Manage goals
            </Link>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {goalsWithProgress.map((goal) => (
              <div key={goal.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.4rem",
                  }}
                >
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                    {goal.domain.icon} {goal.domain.name}
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        fontWeight: 400,
                        marginLeft: "0.4rem",
                      }}
                    >
                      {goal.period}
                    </span>
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
                    {goal.currentValue} / {goal.targetValue} {goal.unit}
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontWeight: 700,
                        color: goal.progressPct >= 100 ? "#34d399" : "#00d4ff",
                      }}
                    >
                      {goal.progressPct}%
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    height: 7,
                    background: "#1a2448",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${goal.progressPct}%`,
                      background:
                        goal.progressPct >= 100
                          ? "linear-gradient(90deg, #34d399, #10b981)"
                          : `linear-gradient(90deg, ${goal.domain.color}, ${goal.domain.color}cc)`,
                      borderRadius: 4,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No goals nudge */}
      {goalsWithProgress.length === 0 && (
        <div
          className="card"
          style={{
            marginTop: "1.5rem",
            textAlign: "center",
            padding: "1.5rem",
            border: "1px dashed #1a2448",
          }}
        >
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            No goals set yet.{" "}
            <Link href="/settings" style={{ color: "#00d4ff" }}>
              Set your first goal →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function calcStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates.map((d) => startOfDay(d).getTime()))].sort(
    (a, b) => b - a,
  );
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const diff = (unique[i - 1] - unique[i]) / (1000 * 60 * 60 * 24);
    if (diff <= 1) streak++;
    else break;
  }
  return streak;
}
