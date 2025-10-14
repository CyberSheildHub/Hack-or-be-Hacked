// src/components/Leaderboard.tsx
import React from "react";

type Player = {
  id: string;
  name: string;
  wins: number;
  losses: number;
  ts: number;
};

function useQuery() {
  const hash = location.hash || "";
  const q = hash.split("?")[1] || "";
  return Object.fromEntries(new URLSearchParams(q));
}

export default function Leaderboard() {
  const q = useQuery();
  const [rows, setRows] = React.useState<Player[]>([]);
  const [scenario, setScenario] = React.useState<string>((q.scenario as string) || "ransomware");
  const [role, setRole] = React.useState<"attacker" | "victim">((q.role as any) || "victim");
  const [loading, setLoading] = React.useState(true);
  const [daily, setDaily] = React.useState(false); // Changed to FALSE by default
  const [error, setError] = React.useState<string | null>(null);
  const API = "https://hacked.cybersheildhub.org";

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API}/api/leaderboard?role=${role}&scenario=${scenario}&daily=${daily}&limit=50`;
      console.log("🔍 Fetching leaderboard:", url);

      const r = await fetch(url);
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      }

      const data = await r.json();
      console.log("📊 Leaderboard data received:", data);

      if (!Array.isArray(data)) {
        console.warn("⚠️ Expected array, got:", typeof data);
        setRows([]);
        setError("Invalid data format received");
        return;
      }

      if (data.length === 0) {
        console.log("📭 No players found");
        setRows([]);
        return;
      }

      // Backend returns: { userId, name, wins, losses, ts }
      const mapped = data.map((doc: any) => ({
        id: doc.userId || String(Math.random()),
        name: doc.name || doc.displayName || doc.userId || "Unknown Player",
        wins: parseInt(doc.wins) || 0,
        losses: parseInt(doc.losses) || 0,
        ts: doc.ts || 0
      }));

      // Sort: wins DESC, losses ASC, timestamp DESC
      mapped.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return b.ts - a.ts;
      });

      console.log("✅ Mapped leaderboard:", mapped);
      setRows(mapped);
    } catch (err) {
      console.error("❌ Leaderboard fetch failed:", err);
      setError(String(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    console.log("🔄 Fetching with params:", { role, scenario, daily });
    fetchRows();
    const id = setInterval(fetchRows, 15000);
    return () => clearInterval(id);
  }, [role, scenario, daily]);

  const getRankEmoji = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  const getWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    if (total === 0) return "0%";
    return `${Math.round((wins / total) * 100)}%`;
  };

  return (
    <div style={{ background: "#0a0e12", minHeight: "100vh", padding: "20px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: 20, 
          flexWrap: "wrap", 
          gap: 12 
        }}>
          <h2 style={{ color: "#00ff88", fontSize: 32, margin: 0 }}>
            🏆 Leaderboard
          </h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => location.hash = "/simulation"}
              style={{
                padding: "8px 16px",
                background: "#2a3342",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              ← Back
            </button>
            <button
              onClick={() => setDaily(true)}
              style={{
                padding: "8px 16px",
                background: daily ? "#00ff88" : "#2a3342",
                color: daily ? "#000" : "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              📅 Today
            </button>
            <button
              onClick={() => setDaily(false)}
              style={{
                padding: "8px 16px",
                background: !daily ? "#00ff88" : "#2a3342",
                color: !daily ? "#000" : "#fff",
                border: "none",
                borderRadius: 6,
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              🌍 All Time
            </button>
          </div>
        </div>

        {/* Main Content Card */}
        <div style={{ background: "#1a2332", borderRadius: 10, padding: 20 }}>
          {/* Role Tabs */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button
              onClick={() => setRole("attacker")}
              style={{
                flex: 1,
                padding: "12px",
                background: role === "attacker" ? "#ff4444" : "#2a3342",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: "bold",
                fontSize: 16,
                cursor: "pointer"
              }}
            >
              ⚔️ Attackers
            </button>
            <button
              onClick={() => setRole("victim")}
              style={{
                flex: 1,
                padding: "12px",
                background: role === "victim" ? "#3a7dff" : "#2a3342",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: "bold",
                fontSize: 16,
                cursor: "pointer"
              }}
            >
              🛡️ Victims
            </button>
          </div>

          {/* Scenario Selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#bbb" }}>
              <span>Scenario:</span>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "#0f1419",
                  color: "#00ff88",
                  border: "1px solid #2a3342",
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                <option value="phishing">🎣 Phishing</option>
                <option value="ransomware">🔒 Ransomware</option>
                <option value="mitm">🕵️ MITM</option>
              </select>
            </label>
          </div>

          <h3 style={{ color: "#00ff88", margin: "0 0 16px 0", fontSize: 20 }}>
            {scenario.charAt(0).toUpperCase() + scenario.slice(1)} — {role === "attacker" ? "⚔️ Attackers" : "🛡️ Victims"}
          </h3>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 18 }}>Loading rankings...</div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ textAlign: "center", padding: 60, color: "#ff4444" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 18, marginBottom: 8 }}>Failed to load leaderboard</div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 16 }}>{error}</div>
              <button
                onClick={fetchRows}
                style={{
                  padding: "10px 20px",
                  background: "#3a7dff",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                🔄 Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && rows.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎮</div>
              <div style={{ fontSize: 20, marginBottom: 8, fontWeight: "bold" }}>No players yet</div>
              <div style={{ fontSize: 14 }}>Be the first to rank on the leaderboard!</div>
              <div style={{ fontSize: 12, marginTop: 12, color: "#666" }}>
                Playing as {role} in {scenario} mode
              </div>
            </div>
          )}

          {/* Leaderboard Table */}
          {!loading && !error && rows.length > 0 && (
            <div>
              {/* Table Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 100px 100px 120px",
                  gap: 12,
                  padding: "12px 16px",
                  background: "#0f1419",
                  borderRadius: 8,
                  marginBottom: 12,
                  color: "#888",
                  fontSize: 12,
                  fontWeight: "bold",
                  textTransform: "uppercase"
                }}
              >
                <div>Rank</div>
                <div>Player</div>
                <div style={{ textAlign: "center" }}>Wins</div>
                <div style={{ textAlign: "center" }}>Losses</div>
                <div style={{ textAlign: "center" }}>Win Rate</div>
              </div>

              {/* Player Rows */}
              {rows.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 100px 100px 120px",
                    gap: 12,
                    padding: "16px",
                    background: i < 3 ? "rgba(0, 255, 136, 0.08)" : "#0f1419",
                    borderRadius: 8,
                    marginBottom: 10,
                    border: i < 3 ? "2px solid rgba(0, 255, 136, 0.3)" : "1px solid #2a3342",
                    transition: "all 0.2s",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = i < 3 ? "rgba(0, 255, 136, 0.12)" : "#1a2332";
                    e.currentTarget.style.transform = "translateX(6px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 255, 136, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = i < 3 ? "rgba(0, 255, 136, 0.08)" : "#0f1419";
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{ fontSize: 28, display: "flex", alignItems: "center", fontWeight: "bold" }}>
                    {getRankEmoji(i)}
                  </div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: i < 3 ? "bold" : "normal",
                    color: i < 3 ? "#00ff88" : "#fff",
                    display: "flex",
                    alignItems: "center"
                  }}>
                    {r.name}
                  </div>
                  <div style={{
                    textAlign: "center",
                    color: "#00ff88",
                    fontWeight: "bold",
                    fontSize: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {r.wins}
                  </div>
                  <div style={{
                    textAlign: "center",
                    color: "#ff4444",
                    fontWeight: "bold",
                    fontSize: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {r.losses}
                  </div>
                  <div style={{
                    textAlign: "center",
                    color: "#ffaa00",
                    fontWeight: "bold",
                    fontSize: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {getWinRate(r.wins, r.losses)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", color: "#666", fontSize: 14, marginTop: 20 }}>
          <p>🔄 Rankings update automatically every 15 seconds</p>
          <p>📊 Showing {daily ? "today's" : "all-time"} top {rows.length} players</p>
          {!loading && <p style={{ color: "#888" }}>⏰ Last updated: {new Date().toLocaleTimeString()}</p>}
        </div>
      </div>
    </div>
  );
}
