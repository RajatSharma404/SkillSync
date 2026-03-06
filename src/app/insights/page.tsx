"use client";
import { useEffect, useState } from "react";

interface Insight {
  id: string;
  insightText: string;
  domainsInvolved: string[];
  confidenceLevel: number;
  recommendation: string;
  insightType: string;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  CORRELATION: "#00b8e6",
  TIMING_OPTIMIZATION: "#0ea5e9",
  TREND: "#f59e0b",
  WARNING: "#ef4444",
  WIN: "#10b981",
};

const TYPE_ICONS: Record<string, string> = {
  CORRELATION: "🔗",
  TIMING_OPTIMIZATION: "⏰",
  TREND: "📈",
  WARNING: "⚠️",
  WIN: "🏆",
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [querying, setQuerying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((d) => {
        setInsights(d);
        setLoading(false);
      });
  }, []);

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setQuerying(true);
    setAnswer("");

    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setAnswer(data.answer ?? data.error ?? "No response.");
    setQuerying(false);
  }

  const filtered =
    filter === "ALL"
      ? insights
      : insights.filter((i) => i.insightType === filter);

  return (
    <div>
      <h1
        style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.4rem" }}
      >
        AI Insights
      </h1>
      <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
        Patterns and correlations discovered from your activity data.
      </p>

      {/* Ask AI */}
      <div
        className="card"
        style={{
          marginBottom: "2rem",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
        }}
      >
        <h2
          style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}
        >
          🤖 Ask Your Performance Scientist
        </h2>
        <form
          onSubmit={handleQuery}
          style={{ display: "flex", gap: "0.75rem" }}
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder='e.g. "How does my sleep affect my coding output?"'
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={querying}
            style={{ whiteSpace: "nowrap" }}
          >
            {querying ? "Thinking…" : "Ask →"}
          </button>
        </form>
        {answer && (
          <div
            style={{
              marginTop: "1rem",
              background: "rgba(8, 8, 24, 0.9)",
              border: "1px solid #1a2448",
              borderLeft: "3px solid #00d4ff",
              borderRadius: "8px",
              padding: "1rem",
              fontSize: "0.9rem",
              lineHeight: 1.7,
              color: "#e8e8f0",
            }}
          >
            {answer}
          </div>
        )}
      </div>

      {/* Filter */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        {[
          "ALL",
          "CORRELATION",
          "TIMING_OPTIMIZATION",
          "TREND",
          "WARNING",
          "WIN",
        ].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: filter === t ? 700 : 400,
              border: `1px solid ${filter === t ? (TYPE_COLORS[t] ?? "#00b8e6") : "#1a2448"}`,
              background:
                filter === t
                  ? (TYPE_COLORS[t] ?? "#00b8e6") + "22"
                  : "transparent",
              color: filter === t ? (TYPE_COLORS[t] ?? "#00d4ff") : "#9ca3af",
              cursor: "pointer",
            }}
          >
            {t === "ALL" ? "All" : `${TYPE_ICONS[t]} ${t.replace("_", " ")}`}
          </button>
        ))}
      </div>

      {/* Insights list */}
      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading insights…</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "#6b7280" }}>No insights yet in this category.</p>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#4b5563",
              marginTop: "0.5rem",
            }}
          >
            Generate a weekly report from the Reports page to surface AI
            insights.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map((ins) => {
            const color = TYPE_COLORS[ins.insightType] ?? "#00b8e6";
            const icon = TYPE_ICONS[ins.insightType] ?? "💡";
            return (
              <div
                key={ins.id}
                style={{
                  background: "#0c0c1e",
                  border: "1px solid #1a2448",
                  borderLeft: `4px solid ${color}`,
                  borderRadius: "12px",
                  padding: "1.25rem 1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.65rem",
                  }}
                >
                  <span>{icon}</span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color,
                      background: color + "22",
                      padding: "0.2rem 0.55rem",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {ins.insightType.replace("_", " ")}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.75rem",
                      color: "#4b5563",
                    }}
                  >
                    {Math.round(ins.confidenceLevel * 100)}% confidence
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "0.9rem",
                    lineHeight: 1.7,
                    marginBottom: "0.75rem",
                  }}
                >
                  {ins.insightText}
                </p>

                <div
                  style={{
                    background: "rgba(8, 8, 24, 0.9)",
                    borderRadius: "8px",
                    padding: "0.65rem 0.9rem",
                    fontSize: "0.82rem",
                    color: "#00d4ff",
                    lineHeight: 1.6,
                  }}
                >
                  💡 <strong>Recommendation:</strong> {ins.recommendation}
                </div>

                <div
                  style={{
                    marginTop: "0.65rem",
                    display: "flex",
                    gap: "0.4rem",
                    flexWrap: "wrap",
                  }}
                >
                  {ins.domainsInvolved.map((d) => (
                    <span
                      key={d}
                      style={{
                        fontSize: "0.7rem",
                        background: "#1a2448",
                        color: "#9ca3af",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                      }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
