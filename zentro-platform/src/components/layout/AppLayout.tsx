import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type AppLayoutProps = {
  children: ReactNode;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

export function AppLayout({ children, theme, onToggleTheme }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-shell">
        <Topbar theme={theme} onToggleTheme={onToggleTheme} />
        <main className="page-shell">{children}</main>
      </div>
    </div>
  );
}
