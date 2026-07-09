import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ApiKeys } from "./pages/ApiKeys";
import { Billing } from "./pages/Billing";
import { Dashboard } from "./pages/Dashboard";
import { Docs } from "./pages/Docs";
import { Models } from "./pages/Models";
import { Playground } from "./pages/Playground";
import { Settings } from "./pages/Settings";
import { Team } from "./pages/Team";
import { Usage } from "./pages/Usage";

type Theme = "light" | "dark";

export function App() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <AppLayout theme={theme} onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/api-keys" element={<ApiKeys />} />
        <Route path="/usage" element={<Usage />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/models" element={<Models />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/team" element={<Team />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  );
}
