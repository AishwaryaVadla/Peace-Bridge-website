import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProgress, getOrCreateUserId } from "../utils/progressAPI";

// ── Helpers ───────────────────────────────────────────────────────────────────

const METRICS = [
  { key: "avg_empathy",       label: "Empathy",       emoji: "💛", color: "#43a047" },
  { key: "avg_clarity",       label: "Clarity",       emoji: "🧠", color: "#1e88e5" },
  { key: "avg_assertiveness", label: "Assertiveness", emoji: "💬", color: "#8e24aa" },
  { key: "avg_de_escalation", label: "De-escalation", emoji: "🧊", color: "#00897b" },
];

const STYLE_META = {
  avoidant:      { emoji: "🌊", color: "#e65100" },
  aggressive:    { emoji: "⚡", color: "#c62828" },
  passive:       { emoji: "🌫️", color: "#283593" },
  collaborative: { emoji: "🤝", color: "#2e7d32" },
};

function delta(last, first) {
  return +(last - first).toFixed(2);
}

function trendIcon(d) {
  if (d > 0.2)  return { icon: "↑", color: "#2e7d32" };
  if (d < -0.2) return { icon: "↓", color: "#c62828" };
  return { icon: "→", color: "#888" };
}

function MetricBar({ value, label, emoji, color }) {
  const pct = Math.min(100, Math.round((value / 5) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ width: 24, textAlign: "center" }}>{emoji}</span>
      <span style={{ width: 110, fontSize: "0.88rem", color: "#444" }}>{label}</span>
      <div style={{ flex: 1, background: "#e0e0e0", borderRadius: 6, height: 10, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 6, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ width: 34, textAlign: "right", fontSize: "0.88rem", fontWeight: 600, color }}>{value.toFixed(1)}</span>
    </div>
  );
}

function DeltaBadge({ d }) {
  const { icon, color } = trendIcon(d);
  const sign = d > 0 ? "+" : "";
  return (
    <span style={{ fontWeight: 700, color, fontSize: "0.88rem", marginLeft: 6 }}>
      {icon} {sign}{d}
    </span>
  );
}

function insight(sessions) {
  if (!sessions.length) return null;
  const last = sessions[sessions.length - 1];
  const first = sessions[0];
  const count = sessions.length;

  const best = METRICS.reduce((b, m) => {
    const d = delta(last[m.key] || 0, first[m.key] || 0);
    return d > b.d ? { d, label: m.label, emoji: m.emoji } : b;
  }, { d: -Infinity, label: "", emoji: "" });

  if (count === 1) return "Great start! Complete more sessions to track your growth over time.";
  if (best.d > 0.5) return `${best.emoji} Your ${best.label.toLowerCase()} has improved by ${best.d.toFixed(1)} points across ${count} sessions — keep it up!`;
  if (best.d > 0) return `You're making steady progress across ${count} sessions. Each practice brings you closer to confident conflict resolution.`;
  return `${count} sessions completed. Your scores are holding steady — try focusing on empathy in your next session.`;
}

function dominantStyleAcross(sessions) {
  const counts = {};
  for (const s of sessions) {
    if (s.dominant_style) counts[s.dominant_style] = (counts[s.dominant_style] || 0) + 1;
  }
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Progress() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const userId = getOrCreateUserId();

  useEffect(() => {
    fetchProgress(userId)
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="page">
        <div className="pageHeader"><h1>📈 Your Progress</h1></div>
        <p className="subtle" style={{ marginTop: 24 }}>Loading your practice history…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="pageHeader"><h1>📈 Your Progress</h1></div>
        <div className="alert" style={{ marginTop: 24 }}>{error}</div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!sessions.length) {
    return (
      <div className="page">
        <div className="pageHeader">
          <div>
            <h1>📈 Your Progress</h1>
            <p className="subtle">Track your conflict resolution growth over time.</p>
          </div>
        </div>

        <div className="card" style={{ textAlign: "center", padding: "48px 32px", marginTop: 24, maxWidth: 500, margin: "24px auto" }}>
          <p style={{ fontSize: "2.5rem", marginBottom: 16 }}>🎯</p>
          <h3 style={{ color: "#1a237e", marginBottom: 8 }}>No sessions yet</h3>
          <p className="subtle" style={{ marginBottom: 24 }}>
            Complete a roleplay session to start tracking your conflict resolution skills.
          </p>
          <Link to="/roleplay">
            <button className="send-btn">🎭 Start Practicing</button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Data ─────────────────────────────────────────────────────────────────────
  const first = sessions[0];
  const last  = sessions[sessions.length - 1];
  const dominantStyle = dominantStyleAcross(sessions);
  const styleMeta = dominantStyle ? STYLE_META[dominantStyle] : null;
  const sessionInsight = insight(sessions);
  const recentSessions = [...sessions].reverse().slice(0, 5);

  // Latest session averages (for bar chart)
  const latestAvgs = METRICS.map((m) => ({ ...m, value: last[m.key] || 0 }));

  // Overall averages across all sessions
  const overallAvgs = METRICS.map((m) => ({
    ...m,
    value: +(sessions.reduce((s, sess) => s + (sess[m.key] || 0), 0) / sessions.length).toFixed(2),
  }));

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <h1>📈 Your Progress</h1>
          <p className="subtle">Your conflict resolution journey, tracked over time.</p>
        </div>
        <Link to="/roleplay">
          <button className="send-btn">🎭 Practice Now</button>
        </Link>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
        <div className="card" style={{ flex: "1 1 140px", textAlign: "center", padding: "18px 16px" }}>
          <p style={{ fontSize: "2rem", margin: 0 }}>🏆</p>
          <p style={{ fontSize: "1.6rem", fontWeight: 700, color: "#3f51b5", margin: "4px 0 0" }}>{sessions.length}</p>
          <p className="subtle" style={{ margin: "2px 0 0", fontSize: "0.85rem" }}>Sessions completed</p>
        </div>
        <div className="card" style={{ flex: "1 1 140px", textAlign: "center", padding: "18px 16px" }}>
          <p style={{ fontSize: "2rem", margin: 0 }}>📅</p>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "#3f51b5", margin: "4px 0 0" }}>{formatDate(first.created_at)}</p>
          <p className="subtle" style={{ margin: "2px 0 0", fontSize: "0.85rem" }}>Practicing since</p>
        </div>
        <div className="card" style={{ flex: "1 1 140px", textAlign: "center", padding: "18px 16px" }}>
          <p style={{ fontSize: "2rem", margin: 0 }}>{styleMeta?.emoji || "🧬"}</p>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: styleMeta?.color || "#3f51b5", margin: "4px 0 0", textTransform: "capitalize" }}>
            {dominantStyle || "—"}
          </p>
          <p className="subtle" style={{ margin: "2px 0 0", fontSize: "0.85rem" }}>Dominant style</p>
        </div>
        <div className="card" style={{ flex: "1 1 140px", textAlign: "center", padding: "18px 16px" }}>
          <p style={{ fontSize: "2rem", margin: 0 }}>🔄</p>
          <p style={{ fontSize: "1.6rem", fontWeight: 700, color: "#3f51b5", margin: "4px 0 0" }}>
            {Math.round(sessions.reduce((s, sess) => s + (sess.total_turns || 0), 0) / sessions.length)}
          </p>
          <p className="subtle" style={{ margin: "2px 0 0", fontSize: "0.85rem" }}>Avg turns / session</p>
        </div>
      </div>

      {/* ── Improvement section ───────────────────────────────────────────────── */}
      {sessions.length >= 2 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 4 }}>📊 Growth: First vs Latest Session</h3>
          <p className="subtle" style={{ marginBottom: 16, fontSize: "0.88rem" }}>
            How each skill has shifted since your first session.
          </p>
          <div>
            {METRICS.map((m) => {
              const d = delta(last[m.key] || 0, first[m.key] || 0);
              return (
                <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                  <span style={{ width: 24, textAlign: "center" }}>{m.emoji}</span>
                  <span style={{ width: 110, fontSize: "0.88rem", color: "#444" }}>{m.label}</span>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: "0.75rem", color: "#999", width: 36 }}>First</span>
                      <div style={{ flex: 1, background: "#e0e0e0", borderRadius: 4, height: 8 }}>
                        <div style={{ width: `${Math.round(((first[m.key] || 0) / 5) * 100)}%`, background: "#bdbdbd", height: "100%", borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "#888", width: 24 }}>{(first[m.key] || 0).toFixed(1)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "#999", width: 36 }}>Latest</span>
                      <div style={{ flex: 1, background: "#e0e0e0", borderRadius: 4, height: 8 }}>
                        <div style={{ width: `${Math.round(((last[m.key] || 0) / 5) * 100)}%`, background: m.color, height: "100%", borderRadius: 4, transition: "width 0.6s ease" }} />
                      </div>
                      <span style={{ fontSize: "0.75rem", color: m.color, fontWeight: 600, width: 24 }}>{(last[m.key] || 0).toFixed(1)}</span>
                    </div>
                  </div>
                  <DeltaBadge d={d} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Latest session scores ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 4 }}>🎯 Latest Session Scores</h3>
        <p className="subtle" style={{ marginBottom: 16, fontSize: "0.88rem" }}>
          {last.scenario_title && <strong>{last.scenario_title}</strong>}
          {last.scenario_title && " · "}
          {formatDate(last.created_at)} · {last.total_turns} turns
        </p>
        {latestAvgs.map((m) => (
          <MetricBar key={m.key} value={m.value} label={m.label} emoji={m.emoji} color={m.color} />
        ))}
      </div>

      {/* ── Overall averages ─────────────────────────────────────────────────── */}
      {sessions.length >= 2 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 4 }}>📐 Overall Averages</h3>
          <p className="subtle" style={{ marginBottom: 16, fontSize: "0.88rem" }}>Across all {sessions.length} sessions.</p>
          {overallAvgs.map((m) => (
            <MetricBar key={m.key} value={m.value} label={m.label} emoji={m.emoji} color={m.color} />
          ))}
        </div>
      )}

      {/* ── Insight ──────────────────────────────────────────────────────────── */}
      {sessionInsight && (
        <div style={{ marginTop: 16, padding: "16px 20px", background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 10 }}>
          <p style={{ margin: 0, color: "#1b5e20", fontSize: "0.95rem", lineHeight: 1.6 }}>
            💡 {sessionInsight}
          </p>
        </div>
      )}

      {/* ── Recent sessions list ─────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 14 }}>🕐 Recent Sessions</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recentSessions.map((s, i) => {
            const sm = s.dominant_style ? STYLE_META[s.dominant_style] : null;
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "6px 14px",
                  padding: "10px 14px",
                  background: i === 0 ? "#f0f3ff" : "#fafafa",
                  border: `1px solid ${i === 0 ? "#c5cae9" : "#e0e0e0"}`,
                  borderRadius: 8,
                }}
              >
                <span style={{ fontWeight: 600, color: "#3f51b5", minWidth: 20 }}>#{sessions.length - i}</span>
                <span style={{ fontWeight: 500, color: "#333", flex: 1, minWidth: 120 }}>
                  {s.scenario_title || "Practice session"}
                </span>
                <span className="subtle" style={{ fontSize: "0.82rem" }}>{formatDate(s.created_at)}</span>
                {sm && (
                  <span style={{ fontSize: "0.8rem", color: sm.color, textTransform: "capitalize" }}>
                    {sm.emoji} {s.dominant_style}
                  </span>
                )}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {METRICS.map((m) => (
                    <span key={m.key} title={m.label} style={{ fontSize: "0.78rem", color: "#555" }}>
                      {m.emoji} {(s[m.key] || 0).toFixed(1)}
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: "0.78rem", color: "#888" }}>{s.total_turns} turns</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 28 }}>
        <Link to="/roleplay">
          <button className="send-btn" style={{ padding: "12px 28px" }}>🎭 Practice Again</button>
        </Link>
      </div>
    </div>
  );
}
