// src/components/Home.tsx
import React from "react";
import Auth from "./Auth";

export default function Home() {
  const [user, setUser] = React.useState<any>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = React.useState(localStorage.getItem("token"));

  if (!user || !token) {
    return <Auth onAuth={(u, t) => { setUser(u); setToken(t); }} />;
  }

  return (
    <section className="home">
      <h2>Welcome back, {user.displayName || user.email} 👋</h2>
      <p>You have {user.wins || 0} wins and {user.losses || 0} losses.</p>
      <div style={{ marginTop: 20 }}>
        <a href="#/welcome" className="btn">Start Simulation →</a>
        <a href="#/leaderboard?scenario=phishing" className="btn secondary">View Leaderboard</a>
      </div>
    </section>
  );
}

