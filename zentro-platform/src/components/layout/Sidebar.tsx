import { NavLink } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAppSession } from "../../lib/appSession";
import { navigationItems } from "./navigation";

export function Sidebar() {
  const { bootstrap, activeWorkspaceId, activeProjectId } = useAppSession();
  const workspace = bootstrap?.workspaces?.find((item) => item.id === activeWorkspaceId);
  const project = bootstrap?.projects?.find((item) => item.id === activeProjectId);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Sparkles size={18} />
        </div>
        <div>
          <strong>Zentro</strong>
          <span>Platform</span>
        </div>
      </div>

      <div className="project-context">
        <span>Active context</span>
        <strong>{project?.name ?? workspace?.name ?? "No project selected"}</strong>
        <small>{workspace?.name ?? "Workspace from backend"}</small>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        <span className="nav-section">Platform</span>
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
