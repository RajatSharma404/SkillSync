"use client";
import { useEffect, useState, useMemo } from "react";
import { format, subDays, parseISO, eachDayOfInterval, getDay } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";

interface ActivityEntry {
  id: string;
  loggedAt: string;
  value: number | null;
  unit: string | null;
  mood: number | null;
  energy: number | null;
  domain: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

const DOMAIN_COLORS: Record<string, string> = {
  Coding: "#00b8e6",
  Fitness: "#10b981",
  Reading: "#f59e0b",
  Mood: "#ec4899",
  Sleep: "#8b5cf6",
  SideProject: "#f97316",
};

function getColor(name: string, fallback: string) {
  return DOMAIN_COLORS[name] ?? fallback;
}

// ── Heatmap helpers ──────────────────────────────────────────────────────────

function heatColor(count: number, color: string, emptyColor: string): string {
  if (count === 0) return emptyColor;
  if (count === 1) return color + "55";
  if (count === 2) return color + "99";
  return color;
}

// ── Scatter tooltip ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomScatterTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div
      style={{
        background: "var(--tooltip-bg)",
        border: "1px solid var(--tooltip-border)",
        borderRadius: 8,
        padding: "0.6rem 0.9rem",
        fontSize: "0.8rem",
        color: "var(--tooltip-text)",
      }}
    >
      <div>
        {d.xLabel}: <strong>{d.x}</strong>
      </div>
      <div>
        {d.yLabel}: <strong>{d.y}</strong>
      </div>
    </div>
  );
};

export default function AnalyticsPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Theme-aware chart colors
  const chartGrid = isDark ? "#1a2448" : "#dce6f5";
  const axisClr = isDark ? "#9ca3af" : "#94a3b8";
  const tooltipContent = {
    background: "var(--tooltip-bg)",
    border: "1px solid var(--tooltip-border)",
    borderRadius: 8,
  };
  const tooltipLabel = { color: "var(--tooltip-text)" };
  const tooltipItem = { color: isDark ? "#00d4ff" : "#0099cc" };
  const legendWrap = { color: "var(--chart-axis)", fontSize: 12 };
  const heatEmpty = isDark ? "#111827" : "#dce6f5";

  // Heatmap domain filter
  const [heatDomain, setHeatDomain] = useState<string>("All");

  useEffect(() => {
    fetch("/api/activities?limit=1000")
      .then((r) => r.json())
      .then((data: ActivityEntry[]) => {
        setActivities(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────

  const uniqueDomains = useMemo(() => {
    const seen = new Map<string, ActivityEntry["domain"]>();
    activities.forEach((a) => {
      if (!seen.has(a.domain.name)) seen.set(a.domain.name, a.domain);
    });
    return [...seen.values()];
  }, [activities]);

  // Total logs per domain (bar chart)
  const domainTotals = useMemo(
    () =>
      uniqueDomains.map((d) => ({
        name: `${d.icon} ${d.name}`,
        logs: activities.filter((a) => a.domain.name === d.name).length,
        fill: getColor(d.name, d.color),
      })),
    [activities, uniqueDomains],
  );

  // Daily activity counts per domain — last 30 days (line chart)
  const trendData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) =>
      subDays(new Date(), 29 - i),
    );
    return days.map((day) => {
      const label = format(day, "MMM dd");
      const dayStr = format(day, "yyyy-MM-dd");
      const row: Record<string, number | string> = { date: label };
      uniqueDomains.forEach((d) => {
        row[d.name] = activities.filter((a) => {
          const aDate = format(parseISO(a.loggedAt), "yyyy-MM-dd");
          return aDate === dayStr && a.domain.name === d.name;
        }).length;
      });
      return row;
    });
  }, [activities, uniqueDomains]);

  // Mood & Energy trend — last 30 days averages (line chart)
  const moodEnergyData = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) =>
      subDays(new Date(), 29 - i),
    );
    return days.map((day) => {
      const label = format(day, "MMM dd");
      const dayStr = format(day, "yyyy-MM-dd");
      const dayActs = activities.filter(
        (a) => format(parseISO(a.loggedAt), "yyyy-MM-dd") === dayStr,
      );
      const moods = dayActs.filter((a) => a.mood !== null).map((a) => a.mood!);
      const energies = dayActs
        .filter((a) => a.energy !== null)
        .map((a) => a.energy!);
      return {
        date: label,
        mood:
          moods.length > 0
            ? Math.round(
                (moods.reduce((s, v) => s + v, 0) / moods.length) * 10,
              ) / 10
            : null,
        energy:
          energies.length > 0
            ? Math.round(
                (energies.reduce((s, v) => s + v, 0) / energies.length) * 10,
              ) / 10
            : null,
      };
    });
  }, [activities]);

  const hasMoodData = moodEnergyData.some(
    (d) => d.mood !== null || d.energy !== null,
  );

  // ── Heatmap ────────────────────────────────────────────────────────────────

  const heatmapData = useMemo(() => {
    const today = new Date();
    const start = subDays(today, 364);

    const dayCount: Record<string, number> = {};
    const filtered =
      heatDomain === "All"
        ? activities
        : activities.filter((a) => a.domain.name === heatDomain);
    filtered.forEach((a) => {
      const key = format(parseISO(a.loggedAt), "yyyy-MM-dd");
      dayCount[key] = (dayCount[key] ?? 0) + 1;
    });

    const allDays = eachDayOfInterval({ start, end: today });
    const firstDow = getDay(allDays[0]); // 0=Sun … 6=Sat
    const padded: (Date | null)[] = [...Array(firstDow).fill(null), ...allDays];

    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7)
      weeks.push(padded.slice(i, i + 7));

    const monthLabels: Record<number, string> = {};
    weeks.forEach((week, wi) => {
      const firstReal = week.find((d) => d !== null);
      if (firstReal) {
        const mLabel = format(firstReal, "MMM");
        const prevReal = weeks[wi - 1]?.find((d) => d !== null);
        if (!prevReal || format(prevReal, "MMM") !== mLabel)
          monthLabels[wi] = mLabel;
      }
    });

    const selectedColor =
      heatDomain === "All"
        ? "#00d4ff"
        : getColor(
            heatDomain,
            uniqueDomains.find((d) => d.name === heatDomain)?.color ??
              "#00d4ff",
          );

    return { weeks, dayCount, monthLabels, selectedColor };
  }, [activities, heatDomain, uniqueDomains]);

  // ── Correlation Scatter ────────────────────────────────────────────────────

  const scatterPairs = useMemo(() => {
    type DayEntry = { values: number[]; moods: number[]; energies: number[] };
    const dayMap: Record<string, Record<string, DayEntry>> = {};

    activities.forEach((a) => {
      const key = format(parseISO(a.loggedAt), "yyyy-MM-dd");
      if (!dayMap[key]) dayMap[key] = {};
      if (!dayMap[key][a.domain.name])
        dayMap[key][a.domain.name] = { values: [], moods: [], energies: [] };
      if (a.value !== null) dayMap[key][a.domain.name].values.push(a.value);
      if (a.mood !== null) dayMap[key][a.domain.name].moods.push(a.mood);
      if (a.energy !== null) dayMap[key][a.domain.name].energies.push(a.energy);
    });

    type ScatterPair = {
      xDomain: string;
      yDomain: string;
      xLabel: string;
      yLabel: string;
      color: string;
      data: { x: number; y: number; xLabel: string; yLabel: string }[];
    };
    const pairs: ScatterPair[] = [];

    // Mood vs Energy
    const mePts: ScatterPair["data"] = [];
    Object.values(dayMap).forEach((dd) => {
      const allMoods = Object.values(dd).flatMap((e) => e.moods);
      const allEnergies = Object.values(dd).flatMap((e) => e.energies);
      if (allMoods.length && allEnergies.length) {
        const avgM = allMoods.reduce((s, v) => s + v, 0) / allMoods.length;
        const avgE =
          allEnergies.reduce((s, v) => s + v, 0) / allEnergies.length;
        mePts.push({
          x: Math.round(avgM * 10) / 10,
          y: Math.round(avgE * 10) / 10,
          xLabel: "Mood",
          yLabel: "Energy",
        });
      }
    });
    if (mePts.length >= 3)
      pairs.push({
        xDomain: "Mood",
        yDomain: "Energy",
        xLabel: "Mood (1–10)",
        yLabel: "Energy (1–10)",
        color: "#ec4899",
        data: mePts,
      });

    // Each domain's value vs daily mood
    uniqueDomains.forEach((d) => {
      if (d.name === "Mood") return;
      const pts: ScatterPair["data"] = [];
      Object.values(dayMap).forEach((dd) => {
        const domData = dd[d.name];
        const allMoods = Object.values(dd).flatMap((e) => e.moods);
        if (!domData || !domData.values.length || !allMoods.length) return;
        const avgVal =
          domData.values.reduce((s, v) => s + v, 0) / domData.values.length;
        const avgMood = allMoods.reduce((s, v) => s + v, 0) / allMoods.length;
        pts.push({
          x: Math.round(avgVal * 10) / 10,
          y: Math.round(avgMood * 10) / 10,
          xLabel: d.name,
          yLabel: "Mood",
        });
      });
      if (pts.length >= 3)
        pairs.push({
          xDomain: d.name,
          yDomain: "Mood",
          xLabel: `${d.name} value`,
          yLabel: "Mood (1–10)",
          color: getColor(d.name, d.color),
          data: pts,
        });
    });

    return pairs;
  }, [activities, uniqueDomains]);

  // ── Personal Records ───────────────────────────────────────────────────────

  const personalRecords = useMemo(() => {
    return uniqueDomains
      .map((d) => {
        const domActs = activities.filter((a) => a.domain.name === d.name);
        const withValue = domActs.filter((a) => a.value !== null);

        let bestValue = 0,
          bestUnit = "",
          bestDate = "",
          totalValue = 0;
        if (withValue.length) {
          const best = withValue.reduce((p, c) =>
            c.value! > p.value! ? c : p,
          );
          bestValue = best.value!;
          bestUnit = best.unit ?? "";
          bestDate = format(parseISO(best.loggedAt), "MMM d, yyyy");
          totalValue =
            Math.round(withValue.reduce((s, a) => s + a.value!, 0) * 10) / 10;
        }

        const withMood = domActs.filter((a) => a.mood !== null);
        let bestMood: number | null = null,
          bestMoodDate: string | null = null;
        if (withMood.length) {
          const bm = withMood.reduce((p, c) => (c.mood! > p.mood! ? c : p));
          bestMood = bm.mood;
          bestMoodDate = format(parseISO(bm.loggedAt), "MMM d, yyyy");
        }

        return {
          domain: d,
          bestValue,
          bestUnit,
          bestDate,
          totalValue,
          totalLogs: domActs.length,
          bestMood,
          bestMoodDate,
        };
      })
      .filter((r) => r.totalLogs > 0);
  }, [activities, uniqueDomains]);

  // Summary stats
  const totalLogs = activities.length;
  const last7 = activities.filter(
    (a) => parseISO(a.loggedAt) >= subDays(new Date(), 7),
  ).length;
  const avgMood = useMemo(() => {
    const ms = activities.filter((a) => a.mood !== null).map((a) => a.mood!);
    if (!ms.length) return null;
    return Math.round((ms.reduce((s, v) => s + v, 0) / ms.length) * 10) / 10;
  }, [activities]);
  const mostActive = [...domainTotals].sort((a, b) => b.logs - a.logs)[0];

  if (loading) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "4rem",
          color: "var(--text-muted)",
        }}
      >
        Loading analytics…
      </div>
    );
  }

  if (totalLogs === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--text-dim)",
          }}
        >
          No data yet 📊
        </p>
        <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
          Start logging activities to see your trends here.
        </p>
        <a
          href="/log"
          style={{
            display: "inline-block",
            marginTop: "1.5rem",
            padding: "0.6rem 1.4rem",
            background: "#00b8e6",
            color: "#fff",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Log your first activity →
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>
          Activity Analytics 📊
        </h1>
        <p style={{ color: "var(--text-muted)", marginTop: "0.3rem" }}>
          Visualise your growth patterns across all domains.
        </p>
      </div>

      {/* Summary stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {[
          { label: "Total Logs", value: totalLogs, icon: "📝" },
          { label: "This Week", value: last7, icon: "📅" },
          {
            label: "Avg Mood",
            value: avgMood !== null ? `${avgMood}/10` : "—",
            icon: "😊",
          },
          {
            label: "Top Domain",
            value: mostActive ? mostActive.name : "—",
            icon: "🏆",
          },
        ].map((s) => (
          <div key={s.label} className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>
              {s.icon}
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--accent)",
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: "0.2rem",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Domain Distribution Bar Chart */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}
        >
          Total Logs by Domain
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={domainTotals}
            margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
            <XAxis dataKey="name" tick={{ fill: axisClr, fontSize: 12 }} />
            <YAxis
              tick={{ fill: axisClr, fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipContent}
              labelStyle={tooltipLabel}
              itemStyle={tooltipItem}
            />
            <Bar dataKey="logs" name="Logs" radius={[4, 4, 0, 0]}>
              {domainTotals.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Activity Trend Line Chart (30 days) */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}
        >
          Activity Trend — Last 30 Days
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={trendData}
            margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
            <XAxis
              dataKey="date"
              tick={{ fill: axisClr, fontSize: 10 }}
              interval={4}
            />
            <YAxis
              tick={{ fill: axisClr, fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip contentStyle={tooltipContent} labelStyle={tooltipLabel} />
            <Legend wrapperStyle={legendWrap} />
            {uniqueDomains.map((d) => (
              <Line
                key={d.name}
                type="monotone"
                dataKey={d.name}
                stroke={getColor(d.name, d.color)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Mood & Energy Trend (only if data exists) */}
      {hasMoodData && (
        <div className="card">
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              marginBottom: "1.25rem",
            }}
          >
            Mood &amp; Energy Trend — Last 30 Days
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={moodEnergyData}
              margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis
                dataKey="date"
                tick={{ fill: axisClr, fontSize: 10 }}
                interval={4}
              />
              <YAxis domain={[0, 10]} tick={{ fill: axisClr, fontSize: 12 }} />
              <Tooltip
                contentStyle={tooltipContent}
                labelStyle={tooltipLabel}
              />
              <Legend wrapperStyle={legendWrap} />
              <Line
                type="monotone"
                dataKey="mood"
                stroke="#ec4899"
                strokeWidth={2}
                dot={false}
                connectNulls
                name="Mood"
              />
              <Line
                type="monotone"
                dataKey="energy"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                connectNulls
                name="Energy"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Heatmap Calendar ────────────────────────────────────────────── */}
      <div className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
            Activity Heatmap — Last 365 Days
          </h2>
          {/* Domain filter pills */}
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {["All", ...uniqueDomains.map((d) => d.name)].map((name) => (
              <button
                key={name}
                onClick={() => setHeatDomain(name)}
                style={{
                  padding: "0.25rem 0.7rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  border:
                    heatDomain === name
                      ? "none"
                      : "1px solid var(--card-border)",
                  background:
                    heatDomain === name
                      ? heatmapData.selectedColor
                      : "transparent",
                  color: heatDomain === name ? "#000" : "var(--text-dim)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {name === "All"
                  ? "All"
                  : `${uniqueDomains.find((d) => d.name === name)?.icon ?? ""} ${name}`}
              </button>
            ))}
          </div>
        </div>

        {/* Month labels */}
        <div
          style={{
            display: "flex",
            gap: 2,
            marginBottom: 4,
            paddingLeft: 18,
          }}
        >
          {heatmapData.weeks.map((_, wi) => (
            <div
              key={wi}
              style={{
                width: 13,
                fontSize: "0.6rem",
                color: "#6b7280",
                flexShrink: 0,
                textAlign: "left",
              }}
            >
              {heatmapData.monthLabels[wi] ?? ""}
            </div>
          ))}
        </div>

        {/* Grid: 7 rows (days) × N columns (weeks) */}
        <div style={{ display: "flex", gap: 2 }}>
          {/* Day-of-week labels */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              marginRight: 2,
            }}
          >
            {["S", "M", "T", "W", "T", "F", "S"].map((lbl, i) => (
              <div
                key={i}
                style={{
                  height: 13,
                  width: 14,
                  fontSize: "0.6rem",
                  color: i % 2 === 1 ? "var(--text-muted)" : "transparent",
                  lineHeight: "13px",
                  textAlign: "right",
                }}
              >
                {lbl}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {heatmapData.weeks.map((week, wi) => (
            <div
              key={wi}
              style={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              {Array.from({ length: 7 }, (_, di) => {
                const day = week[di] ?? null;
                if (!day) {
                  return <div key={di} style={{ width: 13, height: 13 }} />;
                }
                const key = format(day, "yyyy-MM-dd");
                const count = heatmapData.dayCount[key] ?? 0;
                const bg = heatColor(
                  count,
                  heatmapData.selectedColor,
                  heatEmpty,
                );
                return (
                  <div
                    key={di}
                    title={`${format(day, "MMM d, yyyy")}: ${count} log${count !== 1 ? "s" : ""}`}
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: 2,
                      background: bg,
                      cursor: count > 0 ? "default" : "default",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            marginTop: "0.75rem",
            fontSize: "0.7rem",
            color: "var(--text-muted)",
          }}
        >
          <span>Less</span>
          {[0, 1, 2, 4].map((n) => (
            <div
              key={n}
              style={{
                width: 13,
                height: 13,
                borderRadius: 2,
                background: heatColor(n, heatmapData.selectedColor, heatEmpty),
              }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* ── Correlation Scatter Charts ───────────────────────────────────── */}
      {scatterPairs.length > 0 && (
        <div className="card">
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              marginBottom: "0.4rem",
            }}
          >
            Correlation Explorer
          </h2>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              marginBottom: "1.25rem",
            }}
          >
            Each dot is one day. Patterns reveal which habits move together.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {scatterPairs.map((pair) => (
              <div
                key={`${pair.xDomain}-${pair.yDomain}`}
                style={{
                  background: "var(--background)",
                  borderRadius: 10,
                  padding: "1rem",
                  border: "1px solid var(--card-border)",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--foreground)",
                    marginBottom: "0.75rem",
                  }}
                >
                  {pair.xDomain} vs {pair.yDomain}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <ScatterChart
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis
                      dataKey="x"
                      name={pair.xLabel}
                      type="number"
                      tick={{ fill: axisClr, fontSize: 10 }}
                      label={{
                        value: pair.xLabel,
                        position: "insideBottom",
                        offset: -2,
                        fill: axisClr,
                        fontSize: 10,
                      }}
                    />
                    <YAxis
                      dataKey="y"
                      name={pair.yLabel}
                      type="number"
                      tick={{ fill: axisClr, fontSize: 10 }}
                      label={{
                        value: pair.yLabel,
                        angle: -90,
                        position: "insideLeft",
                        offset: 10,
                        fill: axisClr,
                        fontSize: 10,
                      }}
                    />
                    <ZAxis range={[30, 30]} />
                    <Tooltip
                      content={<CustomScatterTooltip />}
                      cursor={{ strokeDasharray: "3 3" }}
                    />
                    <Scatter
                      data={pair.data}
                      fill={pair.color}
                      fillOpacity={0.75}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Personal Records ────────────────────────────────────────────── */}
      {personalRecords.length > 0 && (
        <div className="card">
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              marginBottom: "1.25rem",
            }}
          >
            🏆 Personal Records
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            {personalRecords.map((rec) => {
              const domColor = getColor(rec.domain.name, rec.domain.color);
              return (
                <div
                  key={rec.domain.name}
                  style={{
                    background: "var(--background)",
                    borderRadius: 10,
                    padding: "1rem",
                    border: "1px solid var(--card-border)",
                    borderLeft: `3px solid ${domColor}`,
                  }}
                >
                  {/* Domain header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <span style={{ fontSize: "1.25rem" }}>
                      {rec.domain.icon}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: "var(--foreground)",
                        flex: 1,
                      }}
                    >
                      {rec.domain.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        background: domColor + "22",
                        color: domColor,
                        border: `1px solid ${domColor}44`,
                        borderRadius: 9999,
                        padding: "0.1rem 0.45rem",
                        fontWeight: 600,
                      }}
                    >
                      {rec.totalLogs} logs
                    </span>
                  </div>

                  {/* Best session */}
                  {rec.bestValue > 0 && (
                    <div style={{ marginBottom: "0.6rem" }}>
                      <div
                        style={{
                          fontSize: "0.6rem",
                          color: "var(--text-muted)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "0.15rem",
                        }}
                      >
                        Best Session
                      </div>
                      <div
                        style={{
                          fontSize: "1.3rem",
                          fontWeight: 800,
                          color: domColor,
                          lineHeight: 1.1,
                        }}
                      >
                        {rec.bestValue}
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "var(--text-dim)",
                            marginLeft: "0.25rem",
                          }}
                        >
                          {rec.bestUnit}
                        </span>
                      </div>
                      {rec.bestDate && (
                        <div
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {rec.bestDate}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Total accumulated */}
                  {rec.totalValue > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: "0.4rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Total accumulated
                      </span>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "var(--foreground)",
                        }}
                      >
                        {rec.totalValue} {rec.bestUnit}
                      </span>
                    </div>
                  )}

                  {/* Best mood */}
                  {rec.bestMood !== null && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Best mood logged
                      </span>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "#ec4899",
                        }}
                      >
                        {rec.bestMood}/10
                      </span>
                    </div>
                  )}
                  {rec.bestMoodDate && (
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "var(--text-muted)",
                        textAlign: "right",
                      }}
                    >
                      {rec.bestMoodDate}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
