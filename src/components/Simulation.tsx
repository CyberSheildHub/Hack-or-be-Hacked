// src/components/Simulation.tsx
import React from "react";

function useQuery() {
  const hash = location.hash || "";
  const q = hash.split("?")[1] || "";
  return Object.fromEntries(new URLSearchParams(q));
}

type LogItem = { t: number; text: string; type?: string };

export default function Simulation(): React.ReactElement {
  const q = useQuery();
  const [scenario, setScenario] = React.useState<string>((q.scenario as string) || "phishing");
  const [userId] = React.useState<string>((q.uid as string) || `guest-${Math.floor(Math.random() * 9999)}`);
  const [mode, setMode] = React.useState<string>((q.mode as string) || "pva");
  const [role, setRole] = React.useState<"attacker" | "victim">((q.role as any) || "victim");
  const [os, setOs] = React.useState<"windows" | "linux">((q.os as any) || "windows");

  const [friendCode, setFriendCode] = React.useState<string>(((q.code as string) || "").toUpperCase());
  const [generatedCode, setGeneratedCode] = React.useState<string | null>(null);
  const [expiry, setExpiry] = React.useState<number | null>(null);
  const [logs, setLogs] = React.useState<LogItem[]>([]);
  const [waiting, setWaiting] = React.useState(false);

  const wsRef = React.useRef<WebSocket | null>(null);
  const logListRef = React.useRef<HTMLDivElement | null>(null);
  const sessionIdRef = React.useRef<string | null>(null);

  const [timeLeft, setTimeLeft] = React.useState(0);
  const [gameOver, setGameOver] = React.useState(false);
  const [gameResult, setGameResult] = React.useState<"win" | "loss" | "timeout" | null>(null);
  const [gameOverReason, setGameOverReason] = React.useState("");
  const [ransomwareOverlay, setRansomwareOverlay] = React.useState(false);
  const [showResultScreen, setShowResultScreen] = React.useState(false);

  const API = "https://hacked.cybersheildhub.org";
  const WS_BASE = "wss://hacked.cybersheildhub.org";
  const GAME_DURATION = 25 * 60 + 30;

  function pushLog(text: string, type = "info") {
    setLogs((l) => [...l, { t: Date.now(), text, type }]);
  }

  React.useEffect(() => {
    if (logListRef.current) logListRef.current.scrollTop = logListRef.current.scrollHeight;
  }, [logs]);

  React.useEffect(() => {
    return () => {
      if (wsRef.current) try { wsRef.current.close(); } catch {}
    };
  }, []);

  // AI Coach Commentary
  const getAICoach = async (action: string, payload: any = {}) => {
    try {
      const resp = await fetch(`${API}/api/ai/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, role, action, payload }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.text) pushLog(`🤖 AI Coach: ${data.text}`, "ai");
      }
    } catch (err) {
      console.error("AI coach error:", err);
    }
  };

  // Timer
  React.useEffect(() => {
    if (timeLeft <= 0 || gameOver) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          triggerGameOver("timeout", "Time's up!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, gameOver]);

  // PvA Start
  const startPVA = async () => {
    try {
      pushLog(`Starting PvA: ${scenario} as ${role} on ${os}`, "info");
      const resp = await fetch(`${API}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, scenario_id: scenario, role, os }),
      });
      if (!resp.ok) { pushLog("Session create failed", "error"); return; }
      const sess = await resp.json();
      sessionIdRef.current = sess._id;
      setTimeLeft(GAME_DURATION);
      openWS(sess._id, role);
      await getAICoach("game_start");
    } catch (err) {
      pushLog(`PvA error: ${String(err)}`, "error");
    }
  };

  // Generate & Wait (PvP)
  const generateAndWait = async () => {
    try {
      pushLog(`Requesting a code for role=${role}…`, "info");
      const genResp = await fetch(`${API}/api/match/code?role=${encodeURIComponent(role)}`, { method: "POST" });
      if (!genResp.ok) { pushLog(`Code gen failed: ${genResp.status}`, "error"); return; }
      const genData = await genResp.json();
      const code = (genData.code || "").toUpperCase();
      setGeneratedCode(code);
      setFriendCode(code);
      setExpiry(Date.now() + 5 * 60 * 1000);
      pushLog(`Generated code: ${code} (share this)`, "info");
      await joinMatch(code);
    } catch (err) {
      pushLog(`Generate error: ${String(err)}`, "error");
    }
  };

  // Join with Code
  const joinWithCode = async () => {
    if (!friendCode) { pushLog("Enter a friend code first", "error"); return; }
    await joinMatch(friendCode.toUpperCase());
  };

  async function joinMatch(code: string) {
    pushLog(`Joining PvP with code ${code}`, "info");
    const resp = await fetch(`${API}/api/match/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, scenario_id: scenario, os, code, role }),
    });

    if (!resp.ok) {
      if (resp.status === 400) pushLog("Both chose same role — pick opposite", "error");
      else if (resp.status === 404) pushLog("Invalid or expired code", "error");
      else pushLog(`Join failed (${resp.status})`, "error");
      return;
    }

    const data = await resp.json();
    const sid = data.session?._id || code;
    if (!sid) { pushLog("No session id", "error"); return; }
    sessionIdRef.current = sid;

    let assignedRole: "attacker" | "victim" = role;
    if (data.status === "matched" && data.session?.role === role) {
      assignedRole = role === "attacker" ? "victim" : "attacker";
    }
    setRole(assignedRole);

    if (data.status === "waiting") {
      setWaiting(true);
      pushLog("Waiting for opponent…", "info");
    } else {
      setWaiting(false);
      pushLog("Matched!", "info");
    }

    openWS(sid, assignedRole);
  }

  function openWS(sid: string, r: "attacker" | "victim") {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
    const ws = new WebSocket(`${WS_BASE}/ws/session/${sid}/${r}`);
    wsRef.current = ws;

    ws.onopen = () => {
      pushLog("WS connected", "info");
      getAICoach("connected");
    };

    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data);
        switch (d.type) {
          case "opponent_action": {
            const p = d.payload.payload || {};
            if (d.payload.action === "user_input" && p.text) {
              if (p.link) pushLog(`Opponent(${d.payload.role}) sent a link: ${p.text}`, "link");
              else pushLog(`Opponent(${d.payload.role}) -> ${p.text}`, "opp");
              getAICoach("opponent_message", { text: p.text });
            }
            break;
          }
          case "match_started":
            setWaiting(false);
            pushLog("⚔️ Match started!", "info");
            setTimeLeft(d.payload?.timeLimitSec || GAME_DURATION);
            getAICoach("match_start");
            break;
          case "game_result":
            handleGameResult(d.payload.result, d.payload.reason);
            break;
          case "finished":
            triggerGameOver("timeout", d.payload.verdict || "Game ended");
            break;
          default:
            pushLog(`WS: ${ev.data}`, "raw");
        }
      } catch (err) {
        pushLog(`WS parse error: ${String(err)}`, "raw");
      }
    };

    ws.onclose = () => pushLog("WS closed", "info");
    ws.onerror = (e) => {
      console.error("WS error", e);
      pushLog("WebSocket error — retrying in 3s…", "error");
      setTimeout(() => openWS(sid, r), 3000);
    };
  }

  // Handle game result from backend
  const handleGameResult = (result: "win" | "loss", reason: string) => {
    setGameResult(result);
    setGameOverReason(reason);
    setShowResultScreen(true);
    
    // Show result screen for 3 seconds
    setTimeout(() => {
      setShowResultScreen(false);
      setGameOver(true);
      updateLeaderboard(result);
    }, 3000);
  };

  // Game Over
  const triggerGameOver = async (result: "win" | "loss" | "timeout", reason: string) => {
    if (gameOver) return;
    setGameResult(result);
    setGameOverReason(reason);
    setShowResultScreen(true);

    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: "finish", payload: { verdict: reason } }));
      }
    } catch {}

    setTimeout(() => {
      setShowResultScreen(false);
      setGameOver(true);
      updateLeaderboard(result);
    }, 3000);
  };

  const updateLeaderboard = async (result: "win" | "loss" | "timeout") => {
    try {
      await fetch(`${API}/api/leaderboard/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role, scenario, result }),
      });
    } catch (err) {
      console.error("Failed to update leaderboard:", err);
    }
  };

  const [userText, setUserText] = React.useState("");
  const sendAction = (action: string, payload: any = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && !gameOver) {
      wsRef.current.send(JSON.stringify({ action, payload }));
    }
  };

  const sendUserText = () => {
    if (!userText) return;
    const text = userText.trim();
    const isLink = /(https?:\/\/[^\s]+)/i.test(text);
    pushLog(`You -> ${text}`, "out");
    sendAction("user_input", { text, link: isLink });
    setUserText("");
    getAICoach("sent_message", { text });
  };

  function handleClickOpponentLink(url: string) {
    if (scenario === "ransomware") {
      setRansomwareOverlay(true);
      setTimeout(() => {
        setRansomwareOverlay(false);
        sendAction("clicked_link", { link: url });
      }, 5000);
    } else {
      sendAction("clicked_link", { link: url });
    }
  }

  function renderLogEntry(l: LogItem, i: number) {
    if (l.type === "link") {
      const m = l.text.match(/(https?:\/\/[^\s]+)/i);
      const url = m ? m[0] : null;
      return (
        <div key={i} style={{ marginBottom: 8, paddingBottom: 6, borderBottom: "1px dashed rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 12, color: "#9aa4a6" }}>{new Date(l.t).toLocaleTimeString()}</div>
          <div>
            {l.text}
            {url && (
              <button onClick={() => handleClickOpponentLink(url)} style={{ marginLeft: 10, padding: "4px 8px", background: "#ff4444", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                Click link
              </button>
            )}
          </div>
        </div>
      );
    }
    return (
      <div key={i} style={{ marginBottom: 8, paddingBottom: 6, borderBottom: "1px dashed rgba(255,255,255,0.1)" }}>
        <div style={{ fontSize: 12, color: "#9aa4a6" }}>{new Date(l.t).toLocaleTimeString()}</div>
        <div style={{ whiteSpace: "pre-wrap", color: l.type === "ai" ? "#00ff88" : l.type === "opp" ? "#ffaa00" : l.type === "out" ? "#00aaff" : undefined }}>
          {l.text}
        </div>
      </div>
    );
  }

  // Result Screen (Win/Loss display)
  if (showResultScreen) {
    return (
      <div style={{ 
        position: "fixed", 
        top: 0, 
        left: 0, 
        width: "100%", 
        height: "100%", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        background: gameResult === "win" ? "rgba(0, 255, 100, 0.95)" : "rgba(255, 50, 50, 0.95)",
        zIndex: 10000,
        animation: "fadeIn 0.3s ease"
      }}>
        <div style={{ textAlign: "center", color: "#fff" }}>
          <h1 style={{ fontSize: 72, margin: 0, textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
            {gameResult === "win" ? "🎉 YOU WIN! 🎉" : "💥 YOU LOSE 💥"}
          </h1>
          <p style={{ fontSize: 24, marginTop: 20 }}>{gameOverReason}</p>
        </div>
      </div>
    );
  }

  // Game Over
  if (gameOver) {
    return (
      <div style={{ textAlign: "center", padding: 40, background: "#0a0e12", minHeight: "100vh" }}>
        <h2 style={{ color: gameResult === "win" ? "#00ff88" : "#ff4444", fontSize: 48, marginBottom: 20 }}>
          Game Over
        </h2>
        <p style={{ fontSize: 20, color: "#ccc", marginBottom: 30 }}>{gameOverReason}</p>
        <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
          <button 
            onClick={() => location.hash = `/leaderboard?scenario=${scenario}&role=${role}`}
            style={{ padding: "12px 24px", fontSize: 18, background: "#00ff88", color: "#000", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            View Leaderboard
          </button>
          <button 
            onClick={() => location.reload()}
            style={{ padding: "12px 24px", fontSize: 18, background: "#3a4750", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const expiryRemainingSeconds = expiry ? Math.max(0, Math.floor((expiry - Date.now()) / 1000)) : 0;
  const expiryMinutes = Math.floor(expiryRemainingSeconds / 60);
  const expirySeconds = expiryRemainingSeconds % 60;

  return (
    <section style={{ padding: 20, background: "#0a0e12", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
        <h2 style={{ color: "#00ff88", margin: 0 }}>
          Simulation — {mode === "pvp" ? "⚔️ PvP" : "🤖 PvA"} — {scenario}
        </h2>
        <div style={{ fontSize: 24, color: timeLeft < 60 ? "#ff4444" : "#00ff88", fontWeight: "bold" }}>
          ⏱ {minutes}:{seconds.toString().padStart(2, "0")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#bbb" }}>Role:</span>
          <select value={role} onChange={(e) => setRole(e.target.value as any)} style={{ padding: "6px 10px", borderRadius: 6, background: "#1a2332", color: "#fff", border: "1px solid #2a3342" }}>
            <option value="victim">🛡️ Victim</option>
            <option value="attacker">⚔️ Attacker</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#bbb" }}>OS:</span>
          <select value={os} onChange={(e) => setOs(e.target.value as any)} style={{ padding: "6px 10px", borderRadius: 6, background: "#1a2332", color: "#fff", border: "1px solid #2a3342" }}>
            <option value="windows">🪟 Windows</option>
            <option value="linux">🐧 Linux</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#bbb" }}>Mode:</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, background: "#1a2332", color: "#fff", border: "1px solid #2a3342" }}>
            <option value="pva">🤖 PvA</option>
            <option value="pvp">⚔️ PvP</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#bbb" }}>Scenario:</span>
          <select value={scenario} onChange={(e) => setScenario(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, background: "#1a2332", color: "#fff", border: "1px solid #2a3342" }}>
            <option value="phishing">🎣 Phishing</option>
            <option value="ransomware">🔒 Ransomware</option>
            <option value="mitm">🕵️ MITM</option>
          </select>
        </label>
      </div>

      {mode === "pva" && (
        <button onClick={startPVA} style={{ marginBottom: 12, padding: "10px 20px", background: "#00ff88", color: "#000", border: "none", borderRadius: 8, fontSize: 16, fontWeight: "bold", cursor: "pointer" }}>
          🚀 Start PvA
        </button>
      )}

      {mode === "pvp" && (
        <div style={{ marginBottom: 12, background: "#1a2332", padding: 16, borderRadius: 10 }}>
          <strong style={{ color: "#00ff88" }}>Friend Code:</strong>
          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
            <input
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
              placeholder="Enter or generate"
              style={{ flex: 1, padding: "8px 12px", borderRadius: 6, background: "#0f1419", color: "#fff", border: "1px solid #2a3342" }}
            />
            <button onClick={generateAndWait} style={{ padding: "8px 16px", background: "#00ff88", color: "#000", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>
              Generate & Wait
            </button>
            <button onClick={joinWithCode} style={{ padding: "8px 16px", background: "#3a7dff", color: "#fff", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>
              Join with Code
            </button>
          </div>

          {generatedCode && expiry && (
            <div style={{ marginTop: 12, padding: 12, background: "#0f1419", borderRadius: 6 }}>
              <code style={{ padding: "8px 16px", background: "#0b1b1a", color: "#00ff88", borderRadius: 6, fontSize: 20, fontWeight: "bold" }}>
                {generatedCode}
              </code>
              <span style={{ marginLeft: 12, color: "#ffaa00" }}>
                Expires in {expiryMinutes}:{expirySeconds.toString().padStart(2, "0")}
              </span>
            </div>
          )}

          {waiting && <div style={{ marginTop: 12, color: "#ffcc00", fontSize: 18 }}>⏳ Waiting for opponent…</div>}
        </div>
      )}

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 2, background: "#1a2332", padding: 16, borderRadius: 10 }}>
          <img
            src={os === "linux" ? "/linux.png" : "/windows.png"}
            alt="preview"
            style={{ width: "100%", borderRadius: 8, maxHeight: 360, objectFit: "cover", border: "2px solid #2a3342" }}
          />
          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", marginBottom: 8, color: "#00ff88", fontWeight: "bold" }}>Send a message:</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                value={userText}
                onChange={(e) => setUserText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendUserText()}
                placeholder="Type your message..."
                style={{ flex: 1, padding: "10px 14px", borderRadius: 6, background: "#0f1419", color: "#fff", border: "1px solid #2a3342", fontSize: 14 }}
              />
              <button onClick={sendUserText} style={{ padding: "10px 20px", background: "#00ff88", color: "#000", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" }}>
                Send
              </button>
            </div>
          </div>
        </div>

        <aside ref={logListRef} style={{ width: 400, background: "#1a2332", borderRadius: 10, padding: 16, maxHeight: 600, overflowY: "auto" }}>
          <h4 style={{ margin: 0, color: "#00ff88", marginBottom: 12 }}>📋 Activity Log</h4>
          <div>
            {logs.map((l, i) => renderLogEntry(l, i))}
          </div>
        </aside>
      </div>

      {ransomwareOverlay && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.98)",
            zIndex: 9999,
            animation: "pulse 1s infinite"
          }}
        >
          <img src="/ransomware.png" alt="ransomware" style={{ maxWidth: "90%", maxHeight: "90%", boxShadow: "0 0 50px rgba(255,0,0,0.8)" }} />
        </div>
      )}
    </section>
  );
}
