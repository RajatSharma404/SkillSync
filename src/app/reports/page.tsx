"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface Insight {
  id: string;
  insightText: string;
  recommendation: string;
  insightType: string;
  confidenceLevel: number;
}

interface Report {
  id: string;
  weekStart: string;
  weekEnd: string;
  summary: string;
  totalLogs: number;
  domainsActive: string[];
  generatedAt: string;
  insights: Insight[];
}

const TYPE_ICONS: Record<string, string> = {
  CORRELATION: "🔗",
  TIMING_OPTIMIZATION: "⏰",
  TREND: "📈",
  WARNING: "⚠️",
  WIN: "🏆",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    const res = await fetch("/api/weekly-report");
    const data = await res.json();
    setReports(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function generateReport() {
    setGenerating(true);
    setGenMessage("");
    const res = await fetch("/api/insights/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (res.ok) {
      setGenMessage("✓ Report generated successfully!");
      await fetchReports();
    } else {
      setGenMessage(data.error ?? "Failed to generate report.");
    }
    setGenerating(false);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              marginBottom: "0.4rem",
            }}
          >
            Weekly Reports
          </h1>
          <p style={{ color: "#6b7280" }}>
            AI-generated performance intelligence, once per week.
          </p>
        </div>
        <div>
          <button
            className="btn-primary"
            onClick={generateReport}
            disabled={generating}
          >
            {generating ? "Generating…" : "⚡ Generate This Week's Report"}
          </button>
          {genMessage && (
            <p
              style={{
                fontSize: "0.8rem",
                marginTop: "0.5rem",
                color: genMessage.startsWith("✓") ? "#34d399" : "#f87171",
                textAlign: "right",
              }}
            >
              {genMessage}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading reports…</p>
      ) : reports.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
          <h2 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>
            No reports yet
          </h2>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
            }}
          >
            Log at least a few days of activity across multiple domains, then
            click &quot;Generate This Week&apos;s Report&quot; to get your first
            AI performance analysis.
          </p>
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {reports.map((report) => (
            <div key={report.id} className="card">
              {/* Report header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setExpanded(expanded === report.id ? null : report.id)
                }
              >
                <div>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                    Week of {format(new Date(report.weekStart), "MMMM d")} —{" "}
                    {format(new Date(report.weekEnd), "MMMM d, yyyy")}
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      marginTop: "0.4rem",
                    }}
                  >
                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      📝 {report.totalLogs} logs
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      🧠 {report.insights.length} insights
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      🎯 {report.domainsActive.join(", ")}
                    </span>
                  </div>
                </div>
                <span style={{ color: "#6b7280", fontSize: "1rem" }}>
                  {expanded === report.id ? "▲" : "▼"}
                </span>
              </div>

              {/* Expanded content */}
              {expanded === report.id && (
                <div style={{ marginTop: "1.25rem" }}>
                  {/* Summary */}
                  <div
                    style={{
                      background: "rgba(8, 8, 24, 0.9)",
                      border: "1px solid #1a2448",
                      borderRadius: "8px",
                      padding: "1rem",
                      marginBottom: "1.25rem",
                      fontSize: "0.9rem",
                      lineHeight: 1.7,
                      color: "#d1d5db",
                    }}
                  >
                    {report.summary}
                  </div>

                  {/* Insights */}
                  {report.insights.length > 0 && (
                    <div>
                      <h3
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "#00d4ff",
                          marginBottom: "0.75rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Insights from this week
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.85rem",
                        }}
                      >
                        {report.insights.map((ins) => (
                          <div
                            key={ins.id}
                            style={{
                              background: "#0c0c1e",
                              border: "1px solid #1a2448",
                              borderRadius: "8px",
                              padding: "0.9rem 1.1rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                marginBottom: "0.5rem",
                              }}
                            >
                              <span>{TYPE_ICONS[ins.insightType] ?? "💡"}</span>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#6b7280",
                                  textTransform: "uppercase",
                                }}
                              >
                                {ins.insightType.replace("_", " ")}
                              </span>
                              <span
                                style={{
                                  marginLeft: "auto",
                                  fontSize: "0.7rem",
                                  color: "#4b5563",
                                }}
                              >
                                {Math.round(ins.confidenceLevel * 100)}%
                                confidence
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: "0.875rem",
                                lineHeight: 1.6,
                                marginBottom: "0.5rem",
                              }}
                            >
                              {ins.insightText}
                            </p>
                            <p style={{ fontSize: "0.8rem", color: "#00d4ff" }}>
                              💡 {ins.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
