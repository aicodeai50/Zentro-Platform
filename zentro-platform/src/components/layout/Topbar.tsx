import { Bell, Moon, Search, Sun } from "lucide-react";
import { usePlatform } from "../../lib/platformState";

type TopbarProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

export function Topbar({ theme, onToggleTheme }: TopbarProps) {
  const {
    organizations,
    organizationProjects,
    selectedOrganization,
    selectedProject,
    selectOrganization,
    selectProject,
  } = usePlatform();

  return (
    <header className="topbar">
      <div className="search-box">
        <Search size={16} />
        <span>Search docs, keys, models...</span>
      </div>

      <div className="topbar-actions">
        <label className="switcher-label">
          <span>Organization</span>
          <select
            value={selectedOrganization.id}
            onChange={(event) => selectOrganization(event.target.value)}
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
        <label className="switcher-label">
          <span>Project</span>
          <select value={selectedProject.id} onChange={(event) => selectProject(event.target.value)}>
            {organizationProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <div className="balance-pill">
          <span>Balance</span>
          <strong>{selectedOrganization.usageBalance}</strong>
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
        <button className="user-menu" type="button">
          <span>SL</span>
        </button>
      </div>
    </header>
  );
}
