import React from "react";

/**
 * Lightweight welcome flow that uses hash navigation (no react-router-dom required)
 *
 * Steps:
 *  1 - welcome + "ARE YOU READY?"
 *  2 - choose scenario
 *  3 - pick role/os/player id -> navigate to /sim/<scenario>?uid=...&role=...&os=...
 */

const SCENARIOS = [
  { id: "phishing", title: "Phishing", desc: "Email social engineering", img: "/mail.png" },
  { id: "ransomware", title: "Ransomware", desc: "Endpoint compromise", img: "/windows.png" },
  { id: "mitm", title: "Network (MITM)", desc: "Man-in-the-Middle", img: "/linux.png" },
];

export default function WelcomeFlow() {
  const [step, setStep] = React.useState<number>(1);
  const [selectedScenario, setSelectedScenario] = React.useState<string>("phishing");
  const [role, setRole] = React.useState<"victim" | "attacker">("victim");
  const [os, setOs] = React.useState<"windows" | "linux">("windows");
  const [userId, setUserId] = React.useState<string>(`guest-${Math.floor(Math.random() * 9999)}`);

  // If user visited /welcome?scenario=xyz via card click, try to pick it
  React.useEffect(() => {
    try {
      const q = location.hash.split("?")[1] || "";
      const params = new URLSearchParams(q);
      const s = params.get("scenario");
      if (s) setSelectedScenario(s);
    } catch {
      /* ignore */
    }
  }, []);

  const welcomeText =
    "Welcome to Hack or be Hacked — a safe, enclosed simulator that teaches defensive & offensive tradecraft using lifelike simulated attacks.";

  const onLaunch = () => {
    const scenario = selectedScenario || "phishing";
    const q = new URLSearchParams({ uid: userId, role, os });
    // use hash navigation to match how the SPA is built
    location.hash = `#/sim/${scenario}?${q.toString()}`;
  };

  return (
    <section className="welcome-flow">
      {step === 1 && (
        <div className="step step-1">
          <h2>Welcome</h2>
          <p className="ai-welcome">{welcomeText}</p>
          <p className="ai-prompt"><strong>AI:</strong> Are you ready for your experience?</p>
          <div className="choices">
            <button className="btn primary" onClick={() => setStep(2)}>Yes</button>
            <button className="btn ghost" onClick={() => setStep(2)}>Yes (No Escape)</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="step step-2">
          <h2>Choose an attack</h2>
          <div className="grid scenarios">
            {SCENARIOS.map((s) => (
              <div
                key={s.id}
                className={`scenario-card ${selectedScenario === s.id ? "selected" : ""}`}
                onClick={() => setSelectedScenario(s.id)}
              >
                <img src={s.img} alt={s.title} />
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="actions">
            <button className="btn" onClick={() => setStep(3)}>Next →</button>
            <button className="btn ghost" onClick={() => setStep(1)}>Back</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step step-3">
          <h2>Final choices</h2>

          <label>
            Role:
            <select value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="victim">Victim (defender)</option>
              <option value="attacker">Attacker (learn attacker TTPs)</option>
            </select>
          </label>

          <label>
            OS:
            <select value={os} onChange={(e) => setOs(e.target.value as any)}>
              <option value="windows">Windows</option>
              <option value="linux">Linux</option>
            </select>
          </label>

          <label>
            Player name / id:
            <input value={userId} onChange={(e) => setUserId(e.target.value)} />
          </label>

          <div className="actions">
            <button className="btn primary" onClick={onLaunch}>Launch Experience</button>
            <button className="btn ghost" onClick={() => setStep(2)}>Back</button>
          </div>
        </div>
      )}
    </section>
  );
}

