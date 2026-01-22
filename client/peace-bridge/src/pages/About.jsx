import React from "react";
import logo from "../../cpact_lab_logo.jpg";

export default function About() {
  return (
    <main id="about" className="about-page">
      <section className="about">
        <div className="about-logo">
          <img src={logo} alt="CPACT Lab" />
        </div>
        <h2>About CPACT Lab</h2>
        <p>
          The Creative Peacebuilding and Conflict Transformation Lab (CPACT), led by Dr. Mehmet Yavuz, studies how to
          promote peacebuilding, conflict transformation, reconciliation, and mediation. Students interested in
          developing research and praxis skills are welcome to join as volunteers or paid research assistants
          (contingent on funding). Current projects focus on rural pride activism, spatial injustice, and community
          mobilization.
        </p>
        <ul className="muted">
          <li>
            <strong>Website:</strong>{" "}
            <a
              href="https://www.hhs.k-state.edu/human-sciences/research/research-groups/cr.html"
              target="_blank"
              rel="noreferrer"
            >
              CPACT Lab
            </a>
          </li>
          <li><strong>Industry:</strong> Research Services</li>
          <li><strong>Company size:</strong> 2–10 employees</li>
          <li><strong>Headquarters:</strong> Manhattan, Kansas</li>
          <li>
            <strong>Specialties:</strong> Academic Research, Social Justice, Community Engagement, Creative
            Peacebuilding, Conflict Transformation, Queer Reconciliation, Activism
          </li>
        </ul>
      </section>
    </main>
  );
}
