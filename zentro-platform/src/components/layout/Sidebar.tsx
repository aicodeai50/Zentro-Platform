import { NavLink } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { usePlatform } from "../../lib/platformState";
import { navigationItems, workspaceItems } from "./navigation";

export function Sidebar() {
  const { selectedProject } = usePlatform();

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
        <span>Current project</span>
        <strong>{selectedProject.name}</strong>
        <small>{selectedProject.environment}</small>
      </div>

      <nav className="sidebar-nav" aria-label="Primary navigation">
        <span className="nav-section">Project</span>
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

        <span className="nav-section">Workspace</span>
        {workspaceItems.map((item) => {
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
