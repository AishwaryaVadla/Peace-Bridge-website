import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function TeachingSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const teachings = [
    {
      title: "Understanding Conflict",
      description:
        "Learn the roots of conflict, emotional triggers, and the psychology behind misunderstandings.",
      content: `Conflict often begins when unmet needs collide with emotional reactions. In this module, we explore how perceptions, biases, and stress shape disagreements.`,
    },
    {
      title: "Compassionate Communication",
      description:
        "Practice methods like active listening and non-violent communication.",
      content: `True communication is listening without preparing your reply. This section teaches how to express feelings without aggression, and how to listen to understand.`,
    },
    {
      title: "Emotional De-Escalation",
      description:
        "Tools and techniques to calm situations and prevent escalation.",
      content: `Emotional regulation is essential for peace-building. You will learn grounding, reframing, and breathing methods to lower tension.`,
    },
    {
      title: "Building Long-Term Harmony",
      description:
        "Learn how to repair relationships and maintain peace over time.",
      content: `Healing takes time. This module covers forgiveness practices, boundary-setting, and sustaining respectful dialogue.`,
    },
  ];

  const toggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="teaching" className="teaching-section">
      {/* Page Title Animation */}
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="teaching-title"
      >
        Teachings & Guidance
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.7 }}
        className="teaching-subtitle"
      >
        Structured lessons designed to promote peace, reflection, and clarity.
      </motion.p>

      <div className="teaching-grid">
        {teachings.map((item, index) => (
          <motion.div
            key={index}
            className="teaching-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.15, duration: 0.5 }}
          >
            <button
              className="teaching-toggle"
              onClick={() => toggle(index)}
            >
              <span>{item.title}</span>
              <span>{openIndex === index ? "−" : "+"}</span>
            </button>

            <p className="teaching-desc">{item.description}</p>

            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  className="teaching-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <p>{item.content}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
