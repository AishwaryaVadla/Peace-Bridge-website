import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * ReflectionJournal.jsx
 * Chat-style guided reflection page (Option D).
 *
 * Features:
 * - Guided prompts (static for now)
 * - Chat-like UI where system shows prompt, user types reply
 * - LocalStorage persistence (create / edit / delete)
 * - Autosave draft while typing
 * - Timestamps and simple entry list
 * - Simple animations using Framer Motion
 */

const STORAGE_KEY = "peacebridge_reflections_v1";

const PROMPTS = [
  "What emotion did you feel most strongly today?",
  "What happened that triggered that feeling?",
  "How did you react, and what would you try differently next time?",
  "What strengths did you use during this situation?",
  "One small step I can take to feel better or resolve this is...",
  "What am I grateful for about this situation (or myself) today?",
];

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error("Failed to save reflections:", e);
  }
}

export default function ReflectionJournal() {
  const [entries, setEntries] = useState(() => loadEntries());
  const [activeEntryId, setActiveEntryId] = useState(null); // id of entry being viewed/edited
  const [draftStep, setDraftStep] = useState(0); // index of PROMPTS
  const [draftAnswers, setDraftAnswers] = useState(() => PROMPTS.map(() => ""));
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  // Focus input when step changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [draftStep]);

  // Autosave draft to localStorage (draft separate from saved entries)
  useEffect(() => {
    const draft = {
      draftAnswers,
      draftStep,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`${STORAGE_KEY}_draft`, JSON.stringify(draft));
  }, [draftAnswers, draftStep]);

  // Load draft on mount if exists
  useEffect(() => {
    const rawDraft = localStorage.getItem(`${STORAGE_KEY}_draft`);
    if (rawDraft) {
      try {
        const parsed = JSON.parse(rawDraft);
        if (parsed?.draftAnswers) {
          setDraftAnswers(parsed.draftAnswers);
          setDraftStep(parsed.draftStep ?? 0);
        }
      } catch {}
    }
  }, []);

  // Helper: start new entry
  const startNew = () => {
    setActiveEntryId(null);
    setIsEditing(true);
    setDraftAnswers(PROMPTS.map(() => ""));
    setDraftStep(0);
    inputRef.current?.focus();
  };

  // Helper: save entry
  const saveEntry = () => {
    const content = PROMPTS.map((p, i) => ({ prompt: p, answer: draftAnswers[i] || "" }));
    const entry = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      content,
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveEntries(updated);
    // reset draft
    setDraftAnswers(PROMPTS.map(() => ""));
    setDraftStep(0);
    setIsEditing(false);
    // remove draft saved
    localStorage.removeItem(`${STORAGE_KEY}_draft`);
  };

  // Helper: open existing entry (view mode)
  const openEntry = (id) => {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    setActiveEntryId(id);
    setIsEditing(false);
    // populate draftAnswers (for possible editing)
    setDraftAnswers(e.content.map((c) => c.answer));
    setDraftStep(0);
  };

  // Edit an existing entry
  const enterEditMode = (id) => {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    setActiveEntryId(id);
    setIsEditing(true);
    setDraftAnswers(e.content.map((c) => c.answer));
    setDraftStep(0);
    inputRef.current?.focus();
  };

  const saveEdit = () => {
    if (!activeEntryId) return;
    const updatedContent = PROMPTS.map((p, i) => ({ prompt: p, answer: draftAnswers[i] || "" }));
    const updated = entries.map((en) =>
      en.id === activeEntryId ? { ...en, content: updatedContent, updatedAt: new Date().toISOString() } : en
    );
    setEntries(updated);
    saveEntries(updated);
    setIsEditing(false);
    setActiveEntryId(null);
    localStorage.removeItem(`${STORAGE_KEY}_draft`);
  };

  // Delete
  const deleteEntry = (id) => {
    if (!confirm("Delete this reflection? This cannot be undone.")) return;
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
    if (activeEntryId === id) {
      setActiveEntryId(null);
      setIsEditing(false);
    }
  };

  // Input handlers
  const handleAnswerChange = (value) => {
    setDraftAnswers((prev) => {
      const copy = [...prev];
      copy[draftStep] = value;
      return copy;
    });
  };

  const nextStep = () => {
    setDraftStep((s) => Math.min(s + 1, PROMPTS.length - 1));
  };
  const prevStep = () => {
    setDraftStep((s) => Math.max(s - 1, 0));
  };

  // Quick export (download as JSON)
  const exportEntries = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "peacebridge_reflections.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render helpers
  const renderEntryList = () => (
    <div className="journal-list">
      <div className="journal-actions">
        <button className="nav-button" onClick={startNew}>New Reflection</button>
        <button className="nav-button alt" onClick={exportEntries} title="Download as JSON">
          Export
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        {entries.length === 0 && <p className="muted">No reflections yet — start your first one.</p>}
        <ul>
          {entries.map((e) => (
            <li key={e.id} className="journal-item">
              <div>
                <strong>{new Date(e.createdAt).toLocaleString()}</strong>
                <div className="muted small">{e.content[0]?.answer?.slice(0, 80) || "— no text yet"}</div>
              </div>
              <div className="journal-item-actions">
                <button className="nav-button alt" onClick={() => openEntry(e.id)}>View</button>
                <button className="nav-button" onClick={() => enterEditMode(e.id)}>Edit</button>
                <button className="nav-button alt" onClick={() => deleteEntry(e.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const renderChatEditor = () => (
    <div className="journal-editor">
      <div className="editor-header">
        <button className="nav-button alt" onClick={() => { setIsEditing(false); setActiveEntryId(null); }}>
          ← Back
        </button>
        <div style={{ flex: 1 }} />
        {activeEntryId ? (
          <button className="nav-button" onClick={saveEdit}>Save Edit</button>
        ) : (
          <button className="nav-button" onClick={saveEntry}>Save Reflection</button>
        )}
      </div>

      <div className="chatbox">
        {/* System prompt */}
        <div className="system-bubble">
          <strong>Reflection prompt</strong>
          <div className="muted small">Answer the prompts honestly — this is private and saved on your device.</div>
        </div>

        {/* Current prompt + input */}
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
              placeholder="Type your reflection here..."
              rows={6}
              className="reflection-input"
            />

            <div className="editor-controls">
              <button className="nav-button alt" onClick={prevStep} disabled={draftStep === 0}>Prev</button>
              <div className="muted small">Step {draftStep + 1} / {PROMPTS.length}</div>
              <button className="nav-button" onClick={nextStep} disabled={draftStep === PROMPTS.length-1}>Next</button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Quick summary preview */}
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
    return (
      <div className="entry-view">
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <button className="nav-button alt" onClick={() => { setActiveEntryId(null); }}>
            ← Back
          </button>
          <div style={{ flex: 1 }} />
          <button className="nav-button" onClick={() => enterEditMode(e.id)}>Edit</button>
          <button className="nav-button alt" onClick={() => deleteEntry(e.id)}>Delete</button>
        </div>

        <h3>{new Date(e.createdAt).toLocaleString()}</h3>
        <div className="entry-contents">
          {e.content.map((c, idx) => (
            <div key={idx} className="entry-row">
              <div className="entry-prompt">{c.prompt}</div>
              <div className="entry-answer">{c.answer || <span className="muted">— no answer</span>}</div>
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
        Guided, private reflections. Saved locally on your device.
      </motion.p>

      <div className="reflection-layout">
        <aside className="reflection-sidebar">
          {renderEntryList()}
        </aside>

        <section className="reflection-main">
          {/* If editing or creating -> show editor */}
          {isEditing ? (
            renderChatEditor()
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
