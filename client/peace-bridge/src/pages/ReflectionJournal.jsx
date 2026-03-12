import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getJournals,
  createJournal,
  updateJournal,
  deleteJournal,
} from "../utils/journalAPI.js";

const PROMPTS = [
  "What emotion did you feel most strongly today?",
  "What happened that triggered that feeling?",
  "How did you react, and what would you try differently next time?",
  "What strengths did you use during this situation?",
  "One small step I can take to feel better or resolve this is...",
  "What am I grateful for about this situation (or myself) today?",
];

const MOODS = [
  { value: "calm", label: "🙂 Calm" },
  { value: "frustrated", label: "😡 Frustrated" },
  { value: "anxious", label: "😟 Anxious" },
  { value: "reflective", label: "🤔 Reflective" },
];

const DRAFT_KEY = "peacebridge_journal_draft";

function parsContent(raw) {
  if (!raw) return PROMPTS.map(() => "");
  if (Array.isArray(raw)) return PROMPTS.map((_, i) => raw[i]?.answer || "");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return PROMPTS.map((_, i) => parsed[i]?.answer || "");
  } catch {}
  return PROMPTS.map(() => "");
}

function serializeContent(answers) {
  return JSON.stringify(PROMPTS.map((p, i) => ({ prompt: p, answer: answers[i] || "" })));
}

export default function ReflectionJournal() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [activeEntryId, setActiveEntryId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftStep, setDraftStep] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState(() => PROMPTS.map(() => ""));
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMood, setDraftMood] = useState("reflective");

  const inputRef = useRef(null);

  // Load entries from API
  useEffect(() => {
    getJournals()
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Focus textarea when step changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [draftStep]);

  // Autosave draft to localStorage
  useEffect(() => {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ draftAnswers, draftStep, draftTitle, draftMood })
    );
  }, [draftAnswers, draftStep, draftTitle, draftMood]);

  // Load draft on mount
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d?.draftAnswers) {
        setDraftAnswers(d.draftAnswers);
        setDraftStep(d.draftStep ?? 0);
        setDraftTitle(d.draftTitle ?? "");
        setDraftMood(d.draftMood ?? "reflective");
      }
    } catch {}
  }, []);

  const resetDraft = () => {
    setDraftAnswers(PROMPTS.map(() => ""));
    setDraftTitle("");
    setDraftMood("reflective");
    setDraftStep(0);
    localStorage.removeItem(DRAFT_KEY);
  };

  const startNew = () => {
    setActiveEntryId(null);
    setIsEditing(true);
    resetDraft();
  };

  const saveEntry = async () => {
    setSaving(true);
    setError(null);
    try {
      const entry = await createJournal({
        title: draftTitle || `Reflection – ${new Date().toLocaleDateString()}`,
        content: serializeContent(draftAnswers),
        mood: draftMood,
      });
      setEntries((prev) => [entry, ...prev]);
      resetDraft();
      setIsEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openEntry = (id) => {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    setActiveEntryId(id);
    setIsEditing(false);
    setDraftAnswers(parsContent(e.content));
    setDraftTitle(e.title || "");
    setDraftMood(e.mood || "reflective");
    setDraftStep(0);
  };

  const enterEditMode = (id) => {
    openEntry(id);
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!activeEntryId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateJournal(activeEntryId, {
        title: draftTitle || `Reflection – ${new Date().toLocaleDateString()}`,
        content: serializeContent(draftAnswers),
        mood: draftMood,
      });
      setEntries((prev) => prev.map((e) => (e.id === activeEntryId ? updated : e)));
      setIsEditing(false);
      setActiveEntryId(null);
      resetDraft();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this reflection? This cannot be undone.")) return;
    try {
      await deleteJournal(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (activeEntryId === id) {
        setActiveEntryId(null);
        setIsEditing(false);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAnswerChange = (value) => {
    setDraftAnswers((prev) => {
      const copy = [...prev];
      copy[draftStep] = value;
      return copy;
    });
  };

  const exportEntries = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "peacebridge_reflections.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render helpers ──────────────────────────────────────────────

  const renderSidebar = () => (
    <div className="journal-list">
      <div className="journal-actions">
        <button className="nav-button" onClick={startNew}>New Reflection</button>
        <button className="nav-button alt" onClick={exportEntries} title="Download as JSON">Export</button>
      </div>

      <div style={{ marginTop: 16 }}>
        {loading && <p className="muted">Loading…</p>}
        {!loading && entries.length === 0 && (
          <p className="muted">No reflections yet — start your first one.</p>
        )}
        <ul>
          {entries.map((e) => {
            const answers = parsContent(e.content);
            const preview = answers[0]?.slice(0, 80) || "— no text yet";
            const mood = MOODS.find((m) => m.value === e.mood);
            return (
              <li key={e.id} className="journal-item">
                <div>
                  <strong>{e.title || new Date(e.created_at).toLocaleString()}</strong>
                  {mood && <span style={{ marginLeft: 6, fontSize: "0.85em" }}>{mood.label}</span>}
                  <div className="muted small">{preview}</div>
                </div>
                <div className="journal-item-actions">
                  <button className="nav-button alt" onClick={() => openEntry(e.id)}>View</button>
                  <button className="nav-button" onClick={() => enterEditMode(e.id)}>Edit</button>
                  <button className="nav-button alt" onClick={() => handleDelete(e.id)}>Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className="journal-editor">
      <div className="editor-header">
        <button
          className="nav-button alt"
          onClick={() => { setIsEditing(false); setActiveEntryId(null); }}
        >
          ← Back
        </button>
        <div style={{ flex: 1 }} />
        <button className="nav-button" onClick={activeEntryId ? saveEdit : saveEntry} disabled={saving}>
          {saving ? "Saving…" : activeEntryId ? "Save Edit" : "Save Reflection"}
        </button>
      </div>

      {/* Title + Mood */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="Entry title (optional)"
          className="reflection-input"
          style={{ flex: 2, minWidth: 180, rows: 1 }}
        />
        <select
          value={draftMood}
          onChange={(e) => setDraftMood(e.target.value)}
          className="reflection-input"
          style={{ flex: 1, minWidth: 140 }}
        >
          {MOODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="chatbox">
        <div className="system-bubble">
          <strong>Reflection prompt</strong>
          <div className="muted small">Answer honestly — saved to your account.</div>
        </div>

        <AnimatePresence initial={false}>
          <motion.div
            key={draftStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.25 }}
            className="prompt-block"
          >
            <div className="prompt-bubble">{PROMPTS[draftStep]}</div>

            <textarea
              ref={inputRef}
              value={draftAnswers[draftStep]}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your reflection here…"
              rows={6}
              className="reflection-input"
            />

            <div className="editor-controls">
              <button className="nav-button alt" onClick={() => setDraftStep((s) => Math.max(s - 1, 0))} disabled={draftStep === 0}>Prev</button>
              <div className="muted small">Step {draftStep + 1} / {PROMPTS.length}</div>
              <button className="nav-button" onClick={() => setDraftStep((s) => Math.min(s + 1, PROMPTS.length - 1))} disabled={draftStep === PROMPTS.length - 1}>Next</button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Preview */}
        <div style={{ marginTop: 18 }}>
          <h4>Quick preview</h4>
          <div className="preview-box">
            {PROMPTS.map((p, i) => (
              <div key={i} className="preview-row">
                <div className="preview-prompt">{p}</div>
                <div className="preview-answer">{draftAnswers[i] || <span className="muted">—</span>}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderEntryView = () => {
    const e = entries.find((x) => x.id === activeEntryId);
    if (!e) return <p className="muted">Entry not found.</p>;
    const answers = parsContent(e.content);
    const mood = MOODS.find((m) => m.value === e.mood);
    return (
      <div className="entry-view">
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <button className="nav-button alt" onClick={() => setActiveEntryId(null)}>← Back</button>
          <div style={{ flex: 1 }} />
          <button className="nav-button" onClick={() => enterEditMode(e.id)}>Edit</button>
          <button className="nav-button alt" onClick={() => handleDelete(e.id)}>Delete</button>
        </div>

        <h3>
          {e.title || new Date(e.created_at).toLocaleString()}
          {mood && <span style={{ marginLeft: 10, fontWeight: "normal", fontSize: "0.9em" }}>{mood.label}</span>}
        </h3>

        <div className="entry-contents">
          {PROMPTS.map((p, i) => (
            <div key={i} className="entry-row">
              <div className="entry-prompt">{p}</div>
              <div className="entry-answer">{answers[i] || <span className="muted">— no answer</span>}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <main style={{ padding: 24 }}>
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="page-title">
        Reflection Journal
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="muted" style={{ textAlign: "center" }}>
        Guided, private reflections — saved to your account.
      </motion.p>

      {error && (
        <div style={{ color: "red", textAlign: "center", marginBottom: 12 }}>
          Error: {error}
        </div>
      )}

      <div className="reflection-layout">
        <aside className="reflection-sidebar">{renderSidebar()}</aside>

        <section className="reflection-main">
          {isEditing ? (
            renderEditor()
          ) : activeEntryId ? (
            renderEntryView()
          ) : (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p className="muted">Select an entry from the left or create a new reflection.</p>
              <button className="nav-button" onClick={startNew}>Start Reflection</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
