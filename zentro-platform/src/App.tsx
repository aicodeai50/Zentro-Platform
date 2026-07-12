import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthGate } from "./components/auth/AuthGate";
import { AppLayout } from "./components/layout/AppLayout";
import { AI } from "./views/AI";
import { Analytics } from "./views/Analytics";
import { ApiPortal } from "./views/ApiPortal";
import { Health } from "./views/Health";
import { Home } from "./views/Home";
import { Projects } from "./views/Projects";
import { Settings } from "./views/Settings";
import { Workspace } from "./views/Workspace";

type Theme = "light" | "dark";

export function App() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <AuthGate>
      <AppLayout theme={theme} onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/api" element={<ApiPortal />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/health" element={<Health />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </AuthGate>
  );
}
