"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface Domain {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

interface RecentActivity {
  id: string;
  loggedAt: string;
  value: number | null;
  unit: string | null;
  mood: number | null;
  energy: number | null;
  notes: string | null;
  domain: { name: string; icon: string; color: string };
}

interface EditState {
  id: string;
  value: string;
  unit: string;
  mood: string;
  energy: string;
  notes: string;
}

const UNITS: Record<string, string[]> = {
  Coding: ["problems", "commits", "hours", "minutes"],
  Fitness: ["minutes", "km", "sets", "reps"],
  Reading: ["pages", "chapters", "books", "minutes"],
  Mood: ["score"],
  Sleep: ["hours", "minutes"],
  SideProject: ["hours", "minutes", "features"],
};

export default function LogPage() {
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [notes, setNotes] = useState("");
  const [loggedAt, setLoggedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    [],
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Natural-language quick log
  const [nlText, setNlText] = useState("");
  const [nlParsing, setNlParsing] = useState(false);
  const [nlMessage, setNlMessage] = useState("");

  const fetchRecent = useCallback(() => {
    fetch("/api/activities?limit=8")
      .then((r) => r.json())
      .then((data: RecentActivity[]) => {
        setRecentActivities(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/domains")
      .then((r) => r.json())
      .then((data) => {
        setDomains(data);
        if (data.length > 0) {
          setSelectedDomain(data[0]);
          setUnit(UNITS[data[0].name]?.[0] ?? "");
        }
      });
    fetchRecent();
  }, [fetchRecent]);

  function selectDomain(d: Domain) {
    setSelectedDomain(d);
    setUnit(UNITS[d.name]?.[0] ?? "");
    setMood("");
    setEnergy("");
    setValue("");
    setNotes("");
    setError("");
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDomain) return;
    setLoading(true);
    setError("");
    setSuccess(false);

    const body: Record<string, unknown> = {
      domainId: selectedDomain.id,
      loggedAt: new Date(loggedAt).toISOString(),
      notes: notes || undefined,
    };

    if (value) body.value = parseFloat(value);
    if (unit) body.unit = unit;
    if (mood) body.mood = parseInt(mood);
    if (energy) body.energy = parseInt(energy);

    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSuccess(true);
      setValue("");
      setNotes("");
      setMood("");
      setEnergy("");
      fetchRecent();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to log activity");
    }

    setLoading(false);
  }

  function startEdit(a: RecentActivity) {
    setEditState({
      id: a.id,
      value: a.value !== null ? String(a.value) : "",
      unit: a.unit ?? "",
      mood: a.mood !== null ? String(a.mood) : "",
      energy: a.energy !== null ? String(a.energy) : "",
      notes: a.notes ?? "",
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editState) return;
    setSavingEdit(true);
    const res = await fetch(`/api/activities/${editState.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        value: editState.value ? parseFloat(editState.value) : null,
        unit: editState.unit || null,
        mood: editState.mood ? parseInt(editState.mood) : null,
        energy: editState.energy ? parseInt(editState.energy) : null,
        notes: editState.notes || null,
      }),
    });
    if (res.ok) {
      setEditState(null);
      fetchRecent();
    }
    setSavingEdit(false);
  }

  async function handleQuickLog(e: React.FormEvent) {
    e.preventDefault();
    if (!nlText.trim()) return;
    setNlParsing(true);
    setNlMessage("");
    const res = await fetch("/api/activities/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: nlText }),
    });
    const parsed = await res.json();
    if (!res.ok) {
      setNlMessage(parsed.error ?? "Could not parse activity.");
      setNlParsing(false);
      return;
    }
    // Pre-fill the manual form with parsed values
    if (parsed.domainId) {
      const dom = domains.find((d) => d.id === parsed.domainId);
      if (dom) selectDomain(dom);
    }
    if (parsed.value !== null) setValue(String(parsed.value));
    if (parsed.unit) setUnit(parsed.unit);
    if (parsed.mood !== null) setMood(String(parsed.mood));
    if (parsed.energy !== null) setEnergy(String(parsed.energy));
    if (parsed.notes) setNotes(parsed.notes);
    setNlText("");
    setNlMessage("✓ Form pre-filled — review and click Log Activity to save.");
    setNlParsing(false);
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <h1
        style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.4rem" }}
      >
        Log Activity
      </h1>
      <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
        Each log builds the dataset your AI performance scientist will analyse.
      </p>

      {/* ── AI Quick Log ────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          marginBottom: "2rem",
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
        }}
      >
        <h2
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          ⚡ Quick Log with AI
        </h2>
        <p
          style={{
            fontSize: "0.8rem",
            color: "#6b7280",
            marginBottom: "0.85rem",
          }}
        >
          Describe what you did in plain English — AI will fill the form for
          you.
        </p>
        <form
          onSubmit={handleQuickLog}
          style={{ display: "flex", gap: "0.65rem" }}
        >
          <input
            type="text"
            value={nlText}
            onChange={(e) => setNlText(e.target.value)}
            placeholder='e.g. "ran 5km this morning, mood 8, felt energized"'
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={nlParsing}
            style={{ whiteSpace: "nowrap" }}
          >
            {nlParsing ? "Parsing…" : "Parse →"}
          </button>
        </form>
        {nlMessage && (
          <p
            style={{
              marginTop: "0.6rem",
              fontSize: "0.8rem",
              color: nlMessage.startsWith("✓") ? "#34d399" : "#f87171",
            }}
          >
            {nlMessage}
          </p>
        )}
      </div>

      {/* Domain selector */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            fontSize: "0.8rem",
            color: "#a0a0b8",
            display: "block",
            marginBottom: "0.65rem",
          }}
        >
          SELECT DOMAIN
        </label>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          {domains.map((d) => (
            <button
              key={d.id}
              onClick={() => selectDomain(d)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 0.9rem",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: selectedDomain?.id === d.id ? 700 : 400,
                border: `2px solid ${selectedDomain?.id === d.id ? d.color : "#1a2448"}`,
                background:
                  selectedDomain?.id === d.id ? d.color + "22" : "#0c0c1e",
                color: selectedDomain?.id === d.id ? d.color : "#9ca3af",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <span>{d.icon}</span>
              <span>{d.name}</span>
            </button>
          ))}
        </div>
      </div>

      {selectedDomain && (
        <form
          onSubmit={handleSubmit}
          className="card"
          style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {/* Value */}
            <div>
              <label
                style={{
                  fontSize: "0.8rem",
                  color: "#a0a0b8",
                  display: "block",
                  marginBottom: "0.4rem",
                }}
              >
                {selectedDomain.name === "Mood"
                  ? "Mood Score (1–10)"
                  : "Amount"}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={
                  selectedDomain.name === "Mood" ? "1–10" : "e.g. 45"
                }
                min={selectedDomain.name === "Mood" ? 1 : 0}
                max={selectedDomain.name === "Mood" ? 10 : undefined}
              />
            </div>

            {/* Unit */}
            {selectedDomain.name !== "Mood" && (
              <div>
                <label
                  style={{
                    fontSize: "0.8rem",
                    color: "#a0a0b8",
                    display: "block",
                    marginBottom: "0.4rem",
                  }}
                >
                  Unit
                </label>
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  {(UNITS[selectedDomain.name] ?? ["units"]).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Mood / Energy sliders for non-mood domains */}
          {selectedDomain.name !== "Mood" && (
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
                    fontSize: "0.8rem",
                    color: "#a0a0b8",
                    display: "block",
                    marginBottom: "0.4rem",
                  }}
                >
                  Mood (1–10) <span style={{ color: "#4b5563" }}>optional</span>
                </label>
                <input
                  type="number"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="e.g. 7"
                  min={1}
                  max={10}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "0.8rem",
                    color: "#a0a0b8",
                    display: "block",
                    marginBottom: "0.4rem",
                  }}
                >
                  Energy (1–10){" "}
                  <span style={{ color: "#4b5563" }}>optional</span>
                </label>
                <input
                  type="number"
                  value={energy}
                  onChange={(e) => setEnergy(e.target.value)}
                  placeholder="e.g. 8"
                  min={1}
                  max={10}
                />
              </div>
            </div>
          )}

          {/* Date/time */}
          <div>
            <label
              style={{
                fontSize: "0.8rem",
                color: "#a0a0b8",
                display: "block",
                marginBottom: "0.4rem",
              }}
            >
              When
            </label>
            <input
              type="datetime-local"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label
              style={{
                fontSize: "0.8rem",
                color: "#a0a0b8",
                display: "block",
                marginBottom: "0.4rem",
              }}
            >
              Notes <span style={{ color: "#4b5563" }}>optional</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning workout, felt great. Solved 3 hard problems after."
              rows={3}
              style={{ resize: "vertical" }}
            />
          </div>

          {error && (
            <p style={{ color: "#f87171", fontSize: "0.8rem" }}>{error}</p>
          )}
          {success && (
            <p style={{ color: "#34d399", fontSize: "0.875rem" }}>
              ✓ Activity logged! Keep building your dataset.
            </p>
          )}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? "Saving…" : "Log Activity"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => router.push("/dashboard")}
            >
              Dashboard
            </button>
          </div>
        </form>
      )}

      {/* Recent Activity History */}
      {recentActivities.length > 0 && (
        <div className="card" style={{ marginTop: "2rem" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              marginBottom: "1rem",
            }}
          >
            Recent Logs
          </h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
          >
            {recentActivities.map((a) => (
              <div key={a.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.55rem 0.75rem",
                    background:
                      editState?.id === a.id
                        ? "rgba(0,212,255,0.05)"
                        : "rgba(8, 8, 24, 0.9)",
                    border: `1px solid ${editState?.id === a.id ? "rgba(0,212,255,0.3)" : "#1a2448"}`,
                    borderRadius:
                      editState?.id === a.id ? "8px 8px 0 0" : "8px",
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>{a.domain.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: a.domain.color,
                      }}
                    >
                      {a.domain.name}
                    </span>
                    {a.value !== null && (
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
                    {a.mood !== null && (
                      <span
                        style={{
                          color: "#6b7280",
                          fontSize: "0.8rem",
                          marginLeft: "0.5rem",
                        }}
                      >
                        mood {a.mood}
                      </span>
                    )}
                    {a.notes && (
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "#4b5563",
                          marginTop: "0.1rem",
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
                    {format(new Date(a.loggedAt), "MMM d, HH:mm")}
                  </span>
                  {/* Edit button */}
                  <button
                    onClick={() =>
                      editState?.id === a.id ? setEditState(null) : startEdit(a)
                    }
                    title={editState?.id === a.id ? "Cancel edit" : "Edit"}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: editState?.id === a.id ? "#00d4ff" : "#6b7280",
                      fontSize: "0.9rem",
                      padding: "0.25rem",
                      lineHeight: 1,
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this log?")) return;
                      setDeletingId(a.id);
                      await fetch(`/api/activities/${a.id}`, {
                        method: "DELETE",
                      });
                      setDeletingId(null);
                      fetchRecent();
                    }}
                    disabled={deletingId === a.id}
                    title="Delete"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: deletingId === a.id ? "#4b5563" : "#f87171",
                      fontSize: "0.9rem",
                      padding: "0.25rem",
                      lineHeight: 1,
                    }}
                  >
                    {deletingId === a.id ? "…" : "🗑"}
                  </button>
                </div>

                {/* Inline edit form */}
                {editState?.id === a.id && (
                  <form
                    onSubmit={saveEdit}
                    style={{
                      background: "rgba(0,212,255,0.03)",
                      border: "1px solid rgba(0,212,255,0.2)",
                      borderTop: "none",
                      borderRadius: "0 0 8px 8px",
                      padding: "0.85rem 0.75rem",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.65rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "0.7rem",
                          color: "#a0a0b8",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Value
                      </label>
                      <input
                        type="number"
                        value={editState.value}
                        onChange={(e) =>
                          setEditState({ ...editState, value: e.target.value })
                        }
                        placeholder="Amount"
                        style={{
                          fontSize: "0.85rem",
                          padding: "0.4rem 0.6rem",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.7rem",
                          color: "#a0a0b8",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Unit
                      </label>
                      <input
                        value={editState.unit}
                        onChange={(e) =>
                          setEditState({ ...editState, unit: e.target.value })
                        }
                        placeholder="e.g. hours"
                        style={{
                          fontSize: "0.85rem",
                          padding: "0.4rem 0.6rem",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.7rem",
                          color: "#a0a0b8",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Mood (1–10)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={editState.mood}
                        onChange={(e) =>
                          setEditState({ ...editState, mood: e.target.value })
                        }
                        placeholder="optional"
                        style={{
                          fontSize: "0.85rem",
                          padding: "0.4rem 0.6rem",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.7rem",
                          color: "#a0a0b8",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Energy (1–10)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={editState.energy}
                        onChange={(e) =>
                          setEditState({ ...editState, energy: e.target.value })
                        }
                        placeholder="optional"
                        style={{
                          fontSize: "0.85rem",
                          padding: "0.4rem 0.6rem",
                        }}
                      />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label
                        style={{
                          fontSize: "0.7rem",
                          color: "#a0a0b8",
                          display: "block",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Notes
                      </label>
                      <textarea
                        value={editState.notes}
                        onChange={(e) =>
                          setEditState({ ...editState, notes: e.target.value })
                        }
                        rows={2}
                        style={{ resize: "vertical", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={savingEdit}
                        style={{ fontSize: "0.8rem", padding: "0.4rem 1rem" }}
                      >
                        {savingEdit ? "Saving…" : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setEditState(null)}
                        style={{ fontSize: "0.8rem", padding: "0.4rem 1rem" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
