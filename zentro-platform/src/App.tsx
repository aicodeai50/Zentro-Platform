import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthGate } from "./components/auth/AuthGate";
import { AppLayout } from "./components/layout/AppLayout";
import { AI } from "./views/AI";
import { Analytics } from "./views/Analytics";
import { ApiPortal } from "./views/ApiPortal";
import { Billing } from "./views/Billing";
import { Documentation } from "./views/Documentation";
import { Health } from "./views/Health";
import { Home } from "./views/Home";
import { Logs } from "./views/Logs";
import { Organizations } from "./views/Organizations";
import { Playground } from "./views/Playground";
import { Projects } from "./views/Projects";
import { Settings } from "./views/Settings";
import { Team } from "./views/Team";
import { Usage } from "./views/Usage";
import { Webhooks } from "./views/Webhooks";
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
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/workspaces" element={<Workspace />} />
          <Route path="/workspace" element={<Navigate to="/workspaces" replace />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/api-keys" element={<ApiPortal />} />
          <Route path="/api" element={<Navigate to="/api-keys" replace />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/webhooks" element={<Webhooks />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="/docs" element={<Navigate to="/documentation" replace />} />
          <Route path="/team" element={<Team />} />
          <Route path="/health" element={<Health />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </AuthGate>
  );
}
