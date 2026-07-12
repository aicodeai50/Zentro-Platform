import { Bell, Moon, Search, Sun } from "lucide-react";
import { useAppSession } from "../../lib/appSession";
import { zentroApi } from "../../lib/zentroApi";

type TopbarProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

export function Topbar({ theme, onToggleTheme }: TopbarProps) {
  const {
    user,
    bootstrap,
    activeWorkspaceId,
    activeProjectId,
    selectWorkspace,
    selectProject,
    signOut,
  } = useAppSession();
  const workspaces = bootstrap?.workspaces ?? [];
  const projects = bootstrap?.projects ?? [];

  return (
    <header className="topbar">
      <div className="search-box">
        <Search size={16} />
        <span>Search will connect when backend search is available</span>
      </div>

      <div className="topbar-actions">
        <label className="switcher-label">
          <span>Workspace</span>
          <select value={activeWorkspaceId ?? ""} onChange={(event) => selectWorkspace(event.target.value || null)}>
            <option value="">Select workspace</option>
            {workspaces.map((workspace, index) => (
              <option key={workspace.id ?? index} value={workspace.id ?? ""}>
                {workspace.name ?? workspace.slug ?? workspace.id}
              </option>
            ))}
          </select>
        </label>
        <label className="switcher-label">
          <span>Project</span>
          <select value={activeProjectId ?? ""} onChange={(event) => selectProject(event.target.value || null)}>
            <option value="">Select project</option>
            {projects.map((project, index) => (
              <option key={project.id ?? index} value={project.id ?? ""}>
                {project.name ?? project.id}
              </option>
            ))}
          </select>
        </label>
        <div className="balance-pill">
          <span>API</span>
          <strong>{zentroApi.baseUrl ? "Connected" : "Configure URL"}</strong>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle color theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="icon-button" type="button" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <button className="user-menu" type="button" onClick={() => void signOut()}>
          <span>{getInitials(user?.email)}</span>
        </button>
      </div>
    </header>
  );
}

function getInitials(email?: string) {
  if (!email) {
    return "Z";
  }

  return email.slice(0, 2).toUpperCase();
}
