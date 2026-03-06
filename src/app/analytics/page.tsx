"use client";
import { useEffect, useState, useMemo } from "react";
import { format, subDays, parseISO } from "date-fns";
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

export default function AnalyticsPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activities?limit=200")
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
  const mostActive = domainTotals.sort((a, b) => b.logs - a.logs)[0];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "#6b7280" }}>
        Loading analytics…
      </div>
    );
  }

  if (totalLogs === 0) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#9ca3af" }}>
          No data yet 📊
        </p>
        <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
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
        <p style={{ color: "#6b7280", marginTop: "0.3rem" }}>
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
              style={{ fontSize: "1.5rem", fontWeight: 800, color: "#00d4ff" }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
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
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2448" />
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#0c0c1e",
                border: "1px solid #1a2448",
                borderRadius: 8,
              }}
              labelStyle={{ color: "#e5e7eb" }}
              itemStyle={{ color: "#00d4ff" }}
            />
            <Bar dataKey="logs" name="Logs" radius={[4, 4, 0, 0]}>
              {domainTotals.map((entry, idx) => (
                <rect key={idx} fill={entry.fill} />
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
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2448" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              interval={4}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#0c0c1e",
                border: "1px solid #1a2448",
                borderRadius: 8,
              }}
              labelStyle={{ color: "#e5e7eb" }}
            />
            <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2448" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                interval={4}
              />
              <YAxis
                domain={[0, 10]}
                tick={{ fill: "#9ca3af", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#0c0c1e",
                  border: "1px solid #1a2448",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
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
    </div>
  );
}
