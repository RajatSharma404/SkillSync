"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

interface Insight {
  id: string;
  insightText: string;
  domainsInvolved: string[];
  confidenceLevel: number;
  recommendation: string;
  insightType: string;
  createdAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [querying, setQuerying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((d) => {
        setInsights(d);
        setLoading(false);
      });
  }, []);

  // Auto-scroll chat to bottom whenever new messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || querying) return;
    const userMsg: ChatMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setQuerying(true);

    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: userMsg.content,
        messages: messages, // send full history for context
      }),
    });
    const data = await res.json();
    const aiMsg: ChatMessage = {
      role: "assistant",
      content: data.answer ?? data.error ?? "No response.",
    };
    setMessages((prev) => [...prev, aiMsg]);
    setQuerying(false);
  }

  const filtered =
    filter === "ALL"
      ? insights.filter((i) => !i.insightText.startsWith("[nudge]"))
      : insights.filter(
          (i) =>
            i.insightType === filter && !i.insightText.startsWith("[nudge]"),
        );

  return (
    <div>
      <h1
        style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.4rem" }}
      >
        AI Insights
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Patterns and correlations discovered from your activity data.
      </p>

      {/* Ask AI — multi-turn chat */}
      <div
        className="card"
        style={{
          marginBottom: "2rem",
          background: isDark
            ? "linear-gradient(135deg, #1a1a2e, #16213e)"
            : "linear-gradient(135deg, #eef4ff, #f0f8ff)",
          border: isDark ? undefined : "1px solid #d0e4f8",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>
            🤖 Ask Your Performance Scientist
          </h2>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Clear chat
            </button>
          )}
        </div>

        {/* Chat thread */}
        {messages.length > 0 && (
          <div
            style={{
              maxHeight: 340,
              overflowY: "auto",
              marginBottom: "0.85rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.65rem",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "0.6rem 0.9rem",
                    borderRadius:
                      msg.role === "user"
                        ? "12px 12px 2px 12px"
                        : "12px 12px 12px 2px",
                    background:
                      msg.role === "user"
                        ? "rgba(0,184,230,0.12)"
                        : "var(--surface)",
                    border: `1px solid ${msg.role === "user" ? "rgba(0,184,230,0.3)" : "var(--card-border)"}`,
                    borderLeft:
                      msg.role === "assistant"
                        ? "3px solid var(--accent)"
                        : undefined,
                    fontSize: "0.875rem",
                    lineHeight: 1.65,
                    color:
                      msg.role === "user"
                        ? isDark
                          ? "#e0f4ff"
                          : "#0f2d4a"
                        : "var(--foreground)",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {querying && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "0.6rem 0.9rem",
                    borderRadius: "12px 12px 12px 2px",
                    background: "var(--surface)",
                    border: "1px solid var(--card-border)",
                    borderLeft: "3px solid var(--accent)",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Thinking…
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
        )}

        <form
          onSubmit={handleQuery}
          style={{ display: "flex", gap: "0.75rem" }}
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              messages.length === 0
                ? 'e.g. "How does my sleep affect my coding output?"'
                : "Ask a follow-up…"
            }
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
              border: `1px solid ${filter === t ? (TYPE_COLORS[t] ?? "#00b8e6") : "var(--card-border)"}`,
              background:
                filter === t
                  ? (TYPE_COLORS[t] ?? "#00b8e6") + "22"
                  : "transparent",
              color:
                filter === t
                  ? (TYPE_COLORS[t] ?? "var(--accent)")
                  : "var(--text-dim)",
              cursor: "pointer",
            }}
          >
            {t === "ALL" ? "All" : `${TYPE_ICONS[t]} ${t.replace("_", " ")}`}
          </button>
        ))}
      </div>

      {/* Insights list */}
      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading insights…</p>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--text-muted)" }}>
            No insights yet in this category.
          </p>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-dim)",
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
                  background: "var(--card)",
                  border: `1px solid var(--card-border)`,
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
                    background: isDark
                      ? "rgba(0, 212, 255, 0.06)"
                      : "rgba(0, 153, 204, 0.06)",
                    border: `1px solid ${isDark ? "rgba(0,212,255,0.15)" : "rgba(0,153,204,0.2)"}`,
                    borderRadius: "8px",
                    padding: "0.65rem 0.9rem",
                    fontSize: "0.82rem",
                    color: isDark ? "#00d4ff" : "#0077aa",
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
                        background: "var(--tag-bg)",
                        color: "var(--tag-text)",
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
