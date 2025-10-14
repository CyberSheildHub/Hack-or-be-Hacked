// src/App.tsx
import React from "react";
import Home from "./components/Home";
import ScenarioSelector from "./components/ScenarioSelector";
import Simulation from "./components/Simulation";
import WelcomeFlow from "./components/WelcomeFlow";
import Leaderboard from "./components/Leaderboard";

/** tiny hash routing */
function useHashRoute() {
  const [route, setRoute] = React.useState<string>(location.hash.replace("#", "") || "/");
  React.useEffect(() => {
    const onHash = () => setRoute(location.hash.replace("#", "") || "/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return [route, (r: string) => (location.hash = r)] as const;
}

export default function App() {
  const [route] = useHashRoute();
  
  return (
    <div className="app-root">
      <header className="site-header">
        <img src="/windows.png" alt="logo" className="logo-small" />
        <h1>Hack or be Hacked — CyberShield Hub</h1>
      </header>
      <main className="page">
        {/* Home route */}
        {route === "/" && <Home />}
        
        {/* Welcome flow (supports query like /welcome?scenario=phishing) */}
        {route.startsWith("/welcome") && <WelcomeFlow />}
        
        {/* Optional selector page */}
        {route === "/select" && <ScenarioSelector />}
        
        {/* Simulation pages (supports /sim/<scenario>?...) */}
        {route.startsWith("/sim") && <Simulation />}
        
        {/* ✅ NEW: Leaderboard route */}
        {route.startsWith("/leaderboard") && <Leaderboard />}
      </main>
      <footer className="site-footer">
        © {new Date().getFullYear()} CyberShield Hub — Hack or be Hacked
      </footer>
    </div>
  );
}
