// src/components/Auth.tsx
import React from "react";

export default function Auth({ onAuth }: { onAuth: (user: any, token: string) => void }) {
  const API = "https://hacked.cybersheildhub.org";
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [error, setError] = React.useState("");

  const submit = async () => {
    try {
      const path = isLogin ? "login" : "register";
      const body: any = { email, password };
      if (!isLogin) body.display_name = displayName;
      const resp = await fetch(`${API}/api/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onAuth(data.user, data.token);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: 20, background: "#0f1518", borderRadius: 8, maxWidth: 400, margin: "auto" }}>
      <h2 style={{ color: "#bfeee8" }}>{isLogin ? "Login" : "Sign Up"}</h2>
      {error && <div style={{ color: "tomato", marginBottom: 10 }}>{error}</div>}
      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
      />
      {!isLogin && (
        <input
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{ display: "block", marginBottom: 10, width: "100%", padding: 8 }}
        />
      )}
      <button className="btn" onClick={submit} style={{ width: "100%" }}>
        {isLogin ? "Login" : "Register"}
      </button>
      <div style={{ marginTop: 10 }}>
        <a style={{ cursor: "pointer", color: "#6ee7b7" }} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Need an account? Register" : "Have an account? Login"}
        </a>
      </div>
    </div>
  );
}

