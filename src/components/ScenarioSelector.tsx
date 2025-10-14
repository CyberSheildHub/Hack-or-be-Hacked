import React from "react";

const SCENARIOS = [
  { id: "phishing", title: "Phishing - Email social engineering", img: "/mail.png" },
  { id: "ransomware", title: "Ransomware - Endpoint compromise", img: "/windows.png" },
  { id: "mitm", title: "Man-in-the-Middle - Network interception", img: "/linux.png" },
];

export default function ScenarioSelector() {
  const [selected, setSelected] = React.useState<string | null>(null);

  return (
    <section className="selector">
      <h2>Choose your experience</h2>
      <div className="grid">
        {SCENARIOS.map((s) => (
          <div
            key={s.id}
            className={`scenario ${selected === s.id ? "selected" : ""}`}
            onClick={() => setSelected(s.id)}
          >
            <img src={s.img} alt={s.title} />
            <h3>{s.title}</h3>
          </div>
        ))}
      </div>

      <div className="controls">
        <label>Enter your user id (email or handle):</label>
        <input id="userId" defaultValue={`user-${Math.floor(Math.random() * 9999)}`} />
        <div className="actions">
          <a className="btn" href={`#/sim/${selected || "phishing"}?uid=${(document.getElementById("userId") as HTMLInputElement)?.value || ""}`}>
            Launch {selected || "phishing"} →
          </a>
        </div>
      </div>
    </section>
  );
}

