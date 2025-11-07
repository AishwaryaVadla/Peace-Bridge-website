export default function TeachingSection() {
  const lessons = [
    { title: "Understanding Conflict", text: "Learn to identify underlying causes of disagreements." },
    { title: "Active Listening", text: "Develop empathy and improve mutual understanding." },
    { title: "De-escalation", text: "Strategies to calm tense conversations and find middle ground." },
  ];

  return (
    <section className="teaching" style={{ padding: "60px 0", background: "#e3f2fd", textAlign: "center" }}>
      <h2 style={{ fontSize: "2rem", color: "#1a237e", marginBottom: "16px" }}>
        Peace Education
      </h2>
      <p style={{
        fontSize: "1.15rem",
        maxWidth: "700px",
        margin: "0 auto 36px auto",
        color: "#555"
      }}>
        Learn about empathy, communication, and conflict resolution through interactive lessons and real-world stories.
      </p>
      <h3 style={{
        fontSize: "1.45rem",
        color: "#1a237e",
        fontWeight: "bold",
        marginBottom: "28px",
        marginTop: "20px"
      }}>
        Peace Building Lessons
      </h3>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "28px",
        maxWidth: "900px",
        margin: "0 auto"
      }}>
        {lessons.map((l, i) => (
          <div key={i} style={{
            background: "#fff",
            padding: "24px 28px",
            borderRadius: "18px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.10)",
            transition: "box-shadow 0.3s"
          }}>
            <h4 style={{ fontSize: "1.18rem", color: "#3f51b5", fontWeight: "bold", marginBottom: "10px" }}>
              {l.title}
            </h4>
            <p style={{ color: "#444", fontSize: "1.02rem" }}>{l.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
