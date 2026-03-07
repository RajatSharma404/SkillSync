"use client";
import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";

interface Domain {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  isCustom: boolean;
  isActive: boolean;
}

interface GoalData {
  id: string;
  domainId: string;
  targetValue: number;
  unit: string;
  period: string;
  currentValue: number;
  progressPct: number;
  domain: { name: string; icon: string; color: string };
}

const PRESET_COLORS = [
  "#00b8e6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#0ea5e9",
  "#ef4444",
  "#f97316",
  "#a855f7",
  "#14b8a6",
];

const PRESET_ICONS = [
  "🎯",
  "🎨",
  "🎵",
  "🍎",
  "📸",
  "✍️",
  "🧪",
  "💰",
  "🌱",
  "🤝",
];

export default function SettingsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Custom domain form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("🎯");
  const [newColor, setNewColor] = useState("#a855f7");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Goals
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [goalDomainId, setGoalDomainId] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalUnit, setGoalUnit] = useState("");
  const [goalPeriod, setGoalPeriod] = useState("weekly");
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState("");
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);

  // AI goal suggestions
  const [suggestions, setSuggestions] = useState<
    {
      domainName: string;
      targetValue: number;
      unit: string;
      period: string;
      reasoning: string;
    }[]
  >([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState("");

  // Notifications
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifTime, setNotifTime] = useState("09:00");
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>("default");

  const fetchDomains = useCallback(() => {
    fetch("/api/domains")
      .then((r) => r.json())
      .then((data) => setDomains(Array.isArray(data) ? data : []));
  }, []);

  const fetchGoals = useCallback(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data) => setGoals(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    fetchDomains();
    fetchGoals();
    // Load notification prefs from localStorage
    const enabled = localStorage.getItem("notif_enabled") === "true";
    const time = localStorage.getItem("notif_time") ?? "09:00";
    setNotifEnabled(enabled);
    setNotifTime(time);
    if (typeof Notification !== "undefined") {
      setNotifPermission(Notification.permission);
    }
  }, [fetchDomains]);

  async function toggleDomain(domain: Domain) {
    setTogglingId(domain.id);
    await fetch(`/api/domains/${domain.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !domain.isActive }),
    });
    setDomains((prev) =>
      prev.map((d) =>
        d.id === domain.id ? { ...d, isActive: !d.isActive } : d,
      ),
    );
    setTogglingId(null);
  }

  async function createDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        icon: newIcon,
        color: newColor,
        description: newDesc.trim() || undefined,
      }),
    });
    if (res.ok) {
      setNewName("");
      setNewDesc("");
      setShowForm(false);
      fetchDomains();
    } else {
      const data = await res.json();
      setCreateError(data.error ?? "Failed to create domain");
    }
    setCreating(false);
  }

  async function enableNotifications() {
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === "granted") {
      setNotifEnabled(true);
      localStorage.setItem("notif_enabled", "true");
      localStorage.setItem("notif_time", notifTime);
    }
  }

  function saveNotifTime(time: string) {
    setNotifTime(time);
    localStorage.setItem("notif_time", time);
  }

  function disableNotifications() {
    setNotifEnabled(false);
    localStorage.setItem("notif_enabled", "false");
  }

  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalDomainId || !goalTarget || !goalUnit) return;
    setSavingGoal(true);
    setGoalError("");
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domainId: goalDomainId,
        targetValue: parseFloat(goalTarget),
        unit: goalUnit,
        period: goalPeriod,
      }),
    });
    if (res.ok) {
      setGoalTarget("");
      setGoalUnit("");
      fetchGoals();
    } else {
      const data = await res.json();
      setGoalError(data.error ?? "Failed to save goal");
    }
    setSavingGoal(false);
  }

  async function deleteGoal(id: string) {
    setDeletingGoalId(id);
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setDeletingGoalId(null);
  }

  async function getGoalSuggestions() {
    setSuggesting(true);
    setSuggestError("");
    setSuggestions([]);
    const res = await fetch("/api/goals/suggest", { method: "POST" });
    const data = await res.json();
    if (res.ok && Array.isArray(data)) {
      setSuggestions(data);
    } else {
      setSuggestError(data.error ?? "Unable to generate suggestions.");
    }
    setSuggesting(false);
  }

  async function applySuggestion(s: {
    domainName: string;
    targetValue: number;
    unit: string;
    period: string;
  }) {
    const dom = domains.find((d) => d.name === s.domainName);
    if (!dom) return;
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domainId: dom.id,
        targetValue: s.targetValue,
        unit: s.unit,
        period: s.period,
      }),
    });
    fetchGoals();
    setSuggestions((prev) => prev.filter((x) => x.domainName !== s.domainName));
  }

  const activeCount = domains.filter((d) => d.isActive).length;

  return (
    <div style={{ maxWidth: 740, margin: "0 auto" }}>
      <h1
        style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.4rem" }}
      >
        Settings
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "2.5rem" }}>
        Manage your domains, create custom ones, and configure reminders.
      </p>

      {/* ── Domain Activation ────────────────────────────────────── */}
      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              Active Domains
            </h2>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: "0.2rem",
              }}
            >
              {activeCount} of {domains.length} active — only active domains
              appear in activity logging.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary"
            style={{ fontSize: "0.8rem", padding: "0.5rem 1rem" }}
          >
            {showForm ? "Cancel" : "+ Custom Domain"}
          </button>
        </div>

        {/* Create custom domain form */}
        {showForm && (
          <form
            onSubmit={createDomain}
            style={{
              background: "rgba(0,212,255,0.04)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
              padding: "1.25rem",
              marginBottom: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                margin: 0,
                color: "#00d4ff",
              }}
            >
              New Custom Domain
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: "0.35rem",
                  }}
                >
                  NAME
                </label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Meditation"
                  maxLength={40}
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: "0.35rem",
                  }}
                >
                  DESCRIPTION (optional)
                </label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description"
                  maxLength={200}
                />
              </div>
            </div>

            {/* Icon picker */}
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  display: "block",
                  marginBottom: "0.35rem",
                }}
              >
                ICON
              </label>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {PRESET_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setNewIcon(ic)}
                    style={{
                      fontSize: "1.3rem",
                      padding: "0.35rem",
                      borderRadius: "6px",
                      border: `2px solid ${newIcon === ic ? "#00d4ff" : "var(--card-border)"}`,
                      background:
                        newIcon === ic ? "rgba(0,212,255,0.1)" : "var(--card)",
                      cursor: "pointer",
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  display: "block",
                  marginBottom: "0.35rem",
                }}
              >
                COLOR
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "0.4rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: "50%",
                      background: c,
                      border: `2px solid ${newColor === c ? "#fff" : "transparent"}`,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  style={{
                    width: 32,
                    height: 32,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                  }}
                  title="Custom colour"
                />
              </div>
            </div>

            {/* Preview */}
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Preview:
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "8px",
                  border: `2px solid ${newColor}`,
                  background: newColor + "22",
                  color: newColor,
                  fontSize: "0.875rem",
                  fontWeight: 700,
                }}
              >
                {newIcon} {newName || "My Domain"}
              </span>
            </div>

            {createError && (
              <p style={{ color: "#f87171", fontSize: "0.8rem", margin: 0 }}>
                {createError}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? "Creating…" : "Create Domain"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Domain list */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
        >
          {domains.map((domain) => (
            <div
              key={domain.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "10px",
                border: `1px solid ${domain.isActive ? domain.color + "44" : "var(--card-border)"}`,
                background: domain.isActive
                  ? domain.color + "0d"
                  : "var(--inactive-bg)",
                transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: "1.3rem", minWidth: 28 }}>
                {domain.icon}
              </span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      color: domain.isActive
                        ? domain.color
                        : "var(--text-muted)",
                    }}
                  >
                    {domain.name}
                  </span>
                  {domain.isCustom && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "4px",
                        background: "var(--tag-bg)",
                        color: "var(--tag-text)",
                      }}
                    >
                      custom
                    </span>
                  )}
                </div>
                {domain.description && (
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      margin: 0,
                      marginTop: "0.15rem",
                    }}
                  >
                    {domain.description}
                  </p>
                )}
              </div>
              {/* Toggle switch */}
              <button
                onClick={() => toggleDomain(domain)}
                disabled={togglingId === domain.id}
                title={domain.isActive ? "Deactivate" : "Activate"}
                style={{
                  position: "relative",
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  background: domain.isActive
                    ? domain.color
                    : isDark
                      ? "#1a2448"
                      : "#cbd5e1",
                  border: "none",
                  cursor: togglingId === domain.id ? "wait" : "pointer",
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: domain.isActive ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                  }}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Goals ──────────────────────────────────────────────── */}
      <section className="card" style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            marginBottom: "0.4rem",
          }}
        >
          🎯 Goals
        </h2>
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginBottom: "1.25rem",
          }}
        >
          Set weekly or monthly targets per domain. Progress is tracked on the
          dashboard.
        </p>

        {/* Add goal form */}
        <form
          onSubmit={saveGoal}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
            gap: "0.6rem",
            alignItems: "end",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                display: "block",
                marginBottom: "0.3rem",
              }}
            >
              DOMAIN
            </label>
            <select
              value={goalDomainId}
              onChange={(e) => setGoalDomainId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.icon} {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                display: "block",
                marginBottom: "0.3rem",
              }}
            >
              TARGET
            </label>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              placeholder="e.g. 10"
              required
            />
          </div>
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                display: "block",
                marginBottom: "0.3rem",
              }}
            >
              UNIT
            </label>
            <input
              value={goalUnit}
              onChange={(e) => setGoalUnit(e.target.value)}
              placeholder="e.g. hours"
              maxLength={20}
              required
            />
          </div>
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                display: "block",
                marginBottom: "0.3rem",
              }}
            >
              PERIOD
            </label>
            <select
              value={goalPeriod}
              onChange={(e) => setGoalPeriod(e.target.value)}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={savingGoal}
            style={{ fontSize: "0.8rem", padding: "0.55rem 1rem" }}
          >
            {savingGoal ? "…" : "Set Goal"}
          </button>
        </form>

        {goalError && (
          <p
            style={{
              color: "#f87171",
              fontSize: "0.8rem",
              marginBottom: "0.75rem",
            }}
          >
            {goalError}
          </p>
        )}

        {/* AI Goal Suggestions */}
        <div style={{ marginBottom: "1.25rem" }}>
          <button
            type="button"
            onClick={getGoalSuggestions}
            disabled={suggesting}
            style={{
              fontSize: "0.8rem",
              padding: "0.4rem 0.9rem",
              borderRadius: "7px",
              border: "1px solid #00d4ff44",
              background: "rgba(0,212,255,0.07)",
              color: "#00d4ff",
              cursor: suggesting ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {suggesting ? "Thinking…" : "🤖 Get AI Goal Suggestions"}
          </button>
          {suggestError && (
            <p
              style={{
                color: "#f87171",
                fontSize: "0.78rem",
                marginTop: "0.4rem",
              }}
            >
              {suggestError}
            </p>
          )}
          {suggestions.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
                marginTop: "0.85rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.76rem",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                Based on your recent activity — click a suggestion to apply it:
              </p>
              {suggestions.map((s) => (
                <div
                  key={s.domainName}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.7rem 0.9rem",
                    background: "rgba(0,212,255,0.05)",
                    border: "1px solid #00d4ff33",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {domains.find((d) => d.name === s.domainName)?.icon ??
                        "🎯"}{" "}
                      {s.domainName}
                    </span>
                    <span
                      style={{
                        color: "#00d4ff",
                        fontSize: "0.85rem",
                        marginLeft: "0.5rem",
                      }}
                    >
                      {s.targetValue} {s.unit} / {s.period}
                    </span>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        margin: "0.2rem 0 0",
                      }}
                    >
                      {s.reasoning}
                    </p>
                  </div>
                  <button
                    onClick={() => applySuggestion(s)}
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.3rem 0.7rem",
                      borderRadius: "6px",
                      border: "none",
                      background: "#00d4ff",
                      color: "#000",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Existing goals */}
        {goals.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            No goals set yet.
          </p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
          >
            {goals.map((goal) => (
              <div
                key={goal.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.65rem 0.9rem",
                  background: "var(--surface)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{goal.domain.icon}</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.3rem",
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      {goal.domain.name}
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          fontWeight: 400,
                          marginLeft: "0.35rem",
                        }}
                      >
                        {goal.period}
                      </span>
                    </span>
                    <span
                      style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}
                    >
                      {goal.currentValue} / {goal.targetValue} {goal.unit}
                      <span
                        style={{
                          marginLeft: "0.4rem",
                          color:
                            goal.progressPct >= 100 ? "#34d399" : "#00d4ff",
                          fontWeight: 700,
                        }}
                      >
                        {goal.progressPct}%
                      </span>
                    </span>
                  </div>
                  <div
                    style={{
                      height: 5,
                      background: "var(--tag-bg)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${goal.progressPct}%`,
                        background:
                          goal.progressPct >= 100
                            ? "#34d399"
                            : goal.domain.color,
                        borderRadius: 3,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  disabled={deletingGoalId === goal.id}
                  title="Remove goal"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color:
                      deletingGoalId === goal.id
                        ? "var(--text-muted)"
                        : "#f87171",
                    fontSize: "0.85rem",
                    padding: "0.25rem",
                  }}
                >
                  {deletingGoalId === goal.id ? "…" : "🗑"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Reminders / Notifications ────────────────────────────── */}
      <section className="card">
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            marginBottom: "0.4rem",
          }}
        >
          🔔 Daily Reminders
        </h2>
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginBottom: "1.25rem",
          }}
        >
          Get a browser notification if you haven&apos;t logged any activity by
          your chosen time. The page must be open for reminders to fire.
        </p>

        {notifEnabled ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                background: "rgba(52, 211, 153, 0.08)",
                border: "1px solid rgba(52,211,153,0.3)",
                color: "#34d399",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              ✓ Reminders enabled
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Remind me at
              </label>
              <input
                type="time"
                value={notifTime}
                onChange={(e) => saveNotifTime(e.target.value)}
                style={{ width: "auto" }}
              />
            </div>
            <div>
              <button
                className="btn-ghost"
                onClick={disableNotifications}
                style={{ fontSize: "0.8rem" }}
              >
                Disable reminders
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {notifPermission === "denied" ? (
              <p style={{ color: "#f87171", fontSize: "0.875rem" }}>
                Notifications are blocked. Enable them in your browser settings,
                then reload.
              </p>
            ) : (
              <>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <label
                    style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                  >
                    Remind me at
                  </label>
                  <input
                    type="time"
                    value={notifTime}
                    onChange={(e) => setNotifTime(e.target.value)}
                    style={{ width: "auto" }}
                  />
                </div>
                <button
                  className="btn-primary"
                  onClick={enableNotifications}
                  style={{ width: "fit-content" }}
                >
                  Enable Reminders
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Data Export ──────────────────────────────────────────── */}
      <section className="card">
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            marginBottom: "0.4rem",
          }}
        >
          📦 Export Your Data
        </h2>
        <p
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginBottom: "1.25rem",
          }}
        >
          Download your complete activity history. Your data, your control.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a
            href="/api/export?format=csv"
            download
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 1.1rem",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid var(--card-border)",
              color: "var(--text-dim)",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "#00d4ff";
              (e.currentTarget as HTMLAnchorElement).style.color = "#00d4ff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "var(--card-border)";
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--text-dim)";
            }}
          >
            ⬇ Download CSV
          </a>
          <a
            href="/api/export?format=json"
            download
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.55rem 1.1rem",
              borderRadius: "8px",
              background: "transparent",
              border: "1px solid var(--card-border)",
              color: "var(--text-dim)",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "#00d4ff";
              (e.currentTarget as HTMLAnchorElement).style.color = "#00d4ff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor =
                "var(--card-border)";
              (e.currentTarget as HTMLAnchorElement).style.color =
                "var(--text-dim)";
            }}
          >
            ⬇ Download JSON
          </a>
        </div>
      </section>
    </div>
  );
}
