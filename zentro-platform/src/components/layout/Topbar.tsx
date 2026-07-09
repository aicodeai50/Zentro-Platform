import { Bell, ChevronDown, Moon, Search, Sun } from "lucide-react";
import { organization } from "../../data/mockData";

type TopbarProps = {
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

export function Topbar({ theme, onToggleTheme }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="search-box">
        <Search size={16} />
        <span>Search docs, keys, models...</span>
      </div>

      <div className="topbar-actions">
        <button className="org-switcher" type="button">
          <span>{organization.name}</span>
          <ChevronDown size={16} />
        </button>
        <div className="balance-pill">
          <span>Balance</span>
          <strong>{organization.usageBalance}</strong>
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
          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}
