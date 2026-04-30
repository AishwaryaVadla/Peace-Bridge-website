import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchUserActions, createAction, updateAction, deleteAction } from "../utils/actionsAPI";
import { getOrCreateUserId } from "../utils/progressAPI";

// ── Constants ─────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: "todo",  label: "To Do",       emoji: "📋", bg: "#f5f5f5",  border: "#e0e0e0",  headerColor: "#555"    },
  { key: "doing", label: "In Progress", emoji: "⏳", bg: "#fff8e1",  border: "#ffe082",  headerColor: "#e65100" },
  { key: "done",  label: "Done",        emoji: "✅", bg: "#f1f8e9",  border: "#aed581",  headerColor: "#2e7d32" },
];

const PRIORITY_META = {
  high:   { label: "High",   color: "#c62828", bg: "#fce4ec" },
  medium: { label: "Medium", color: "#3f51b5", bg: "#e8eaf6" },
  low:    { label: "Low",    color: "#2e7d32", bg: "#e8f5e9" },
};

const NEXT_STATUS = { todo: "doing", doing: "done", done: "todo" };
const NEXT_LABEL  = { todo: "▶ Start",  doing: "✓ Done", done: "↩ Undo" };
const NEXT_COLOR  = { todo: "#e65100", doing: "#2e7d32", done: "#888"   };

// ── Card ──────────────────────────────────────────────────────────────────────

function ActionCard({ item, onStatusChange, onDelete, onPriorityChange }) {
  const pm = PRIORITY_META[item.priority] || PRIORITY_META.medium;
  const nextStatus = NEXT_STATUS[item.status];

  return (
    <div style={{
      background: "white",
      border: "1px solid #e0e0e0",
      borderRadius: 10,
      padding: "12px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      {/* Priority badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 12,
          background: pm.bg,
          color: pm.color,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}>
          {pm.label}
        </span>
        <button
          onClick={() => onDelete(item.id)}
          title="Delete action"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#bbb", fontSize: "0.9rem", padding: "0 2px", lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      {/* Text */}
      <p style={{
        margin: 0,
        fontSize: "0.92rem",
        color: item.status === "done" ? "#888" : "#222",
        textDecoration: item.status === "done" ? "line-through" : "none",
        lineHeight: 1.5,
      }}>
        {item.text}
      </p>

      {/* Actions row */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={() => onStatusChange(item.id, nextStatus)}
          style={{
            background: "none",
            border: `1px solid ${NEXT_COLOR[item.status]}`,
            color: NEXT_COLOR[item.status],
            borderRadius: 6,
            padding: "3px 10px",
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {NEXT_LABEL[item.status]}
        </button>

        <select
          value={item.priority}
          onChange={(e) => onPriorityChange(item.id, e.target.value)}
          style={{
            fontSize: "0.75rem",
            border: "1px solid #e0e0e0",
            borderRadius: 6,
            padding: "3px 6px",
            background: "white",
            color: "#555",
            cursor: "pointer",
          }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

function Column({ col, items, onStatusChange, onDelete, onPriorityChange }) {
  return (
    <div style={{
      flex: "1 1 240px",
      minWidth: 0,
      background: col.bg,
      border: `1px solid ${col.border}`,
      borderRadius: 12,
      padding: "14px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: "1.1rem" }}>{col.emoji}</span>
        <span style={{ fontWeight: 700, color: col.headerColor, fontSize: "0.95rem" }}>{col.label}</span>
        <span style={{
          marginLeft: "auto",
          background: "white",
          color: col.headerColor,
          border: `1px solid ${col.border}`,
          borderRadius: 10,
          padding: "1px 8px",
          fontSize: "0.78rem",
          fontWeight: 600,
        }}>
          {items.length}
        </span>
      </div>

      {items.length === 0 && (
        <p style={{ margin: 0, color: "#bbb", fontSize: "0.82rem", textAlign: "center", padding: "12px 0" }}>
          Nothing here yet
        </p>
      )}

      {items.map((item) => (
        <ActionCard
          key={item.id}
          item={item}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          onPriorityChange={onPriorityChange}
        />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActionBoard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newText, setNewText] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [adding, setAdding] = useState(false);
  const userId = getOrCreateUserId();

  useEffect(() => {
    fetchUserActions(userId)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleStatusChange = async (id, status) => {
    setItems((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    try {
      await updateAction(id, { status });
    } catch {
      // optimistic update already applied — re-fetch to sync
      fetchUserActions(userId).then(setItems).catch(() => {});
    }
  };

  const handlePriorityChange = async (id, priority) => {
    setItems((prev) => prev.map((a) => a.id === id ? { ...a, priority } : a));
    try {
      await updateAction(id, { priority });
    } catch {
      fetchUserActions(userId).then(setItems).catch(() => {});
    }
  };

  const handleDelete = async (id) => {
    setItems((prev) => prev.filter((a) => a.id !== id));
    await deleteAction(id).catch(() => {});
  };

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text || adding) return;
    setAdding(true);
    try {
      const created = await createAction(userId, null, text, newPriority);
      setItems((prev) => [created, ...prev]);
      setNewText("");
      setNewPriority("medium");
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const todo  = items.filter((a) => a.status === "todo");
  const doing = items.filter((a) => a.status === "doing");
  const done  = items.filter((a) => a.status === "done");

  return (
    <div className="page">
      <div className="pageHeader">
        <div>
          <h1>📋 Action Board</h1>
          <p className="subtle">Turn conflict resolution insights into real-life steps.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/chatbot"><button className="send-btn" style={{ background: "white", color: "#3f51b5", border: "1px solid #3f51b5" }}>💬 Chatbot</button></Link>
          <Link to="/roleplay"><button className="send-btn">🎭 Practice</button></Link>
        </div>
      </div>

      {/* ── Add action ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Add a new action step…"
          style={{
            flex: "1 1 280px",
            height: 40,
            border: "1px solid #c5cae9",
            borderRadius: 8,
            padding: "0 12px",
            fontSize: "0.92rem",
            outline: "none",
          }}
        />
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value)}
          style={{ height: 40, border: "1px solid #c5cae9", borderRadius: 8, padding: "0 10px", fontSize: "0.88rem", background: "white" }}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button
          className="send-btn"
          onClick={handleAdd}
          disabled={!newText.trim() || adding}
          style={{ height: 40, flexShrink: 0 }}
        >
          {adding ? "Adding…" : "+ Add"}
        </button>
      </div>

      {error && <div className="alert" style={{ marginTop: 12 }}>{error}</div>}

      {loading ? (
        <p className="subtle" style={{ marginTop: 24 }}>Loading your actions…</p>
      ) : items.length === 0 ? (
        /* ── Empty state ──────────────────────────────────────────────────── */
        <div className="card" style={{ textAlign: "center", padding: "48px 32px", marginTop: 16, maxWidth: 480, margin: "16px auto" }}>
          <p style={{ fontSize: "2.5rem", marginBottom: 12 }}>🎯</p>
          <h3 style={{ color: "#1a237e", marginBottom: 8 }}>No actions yet</h3>
          <p className="subtle" style={{ marginBottom: 20 }}>
            End a chatbot session or roleplay to auto-generate your action plan, or add one manually above.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/chatbot"><button className="send-btn" style={{ background: "white", color: "#3f51b5", border: "1px solid #3f51b5" }}>💬 Start Chatting</button></Link>
            <Link to="/roleplay"><button className="send-btn">🎭 Start Practicing</button></Link>
          </div>
        </div>
      ) : (
        /* ── Kanban ───────────────────────────────────────────────────────── */
        <div style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          {[
            { col: COLUMNS[0], items: todo  },
            { col: COLUMNS[1], items: doing },
            { col: COLUMNS[2], items: done  },
          ].map(({ col, items: colItems }) => (
            <Column
              key={col.key}
              col={col}
              items={colItems}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onPriorityChange={handlePriorityChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
