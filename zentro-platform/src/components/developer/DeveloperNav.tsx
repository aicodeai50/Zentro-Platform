import { NavLink } from "react-router-dom";

export const developerNavItems = [
  { label: "Overview", path: "/developer" },
  { label: "Quick Start", path: "/developer/quick-start" },
  { label: "Authentication", path: "/developer/authentication" },
  { label: "API Keys", path: "/developer/api-keys" },
  { label: "Chat Completions", path: "/developer/chat-completions" },
  { label: "Text Completions", path: "/developer/text-completions" },
  { label: "Streaming", path: "/developer/streaming" },
  { label: "Models", path: "/developer/models" },
  { label: "Errors", path: "/developer/errors" },
  { label: "Rate Limits", path: "/developer/rate-limits" },
  { label: "Usage and Billing", path: "/developer/usage-billing" },
  { label: "API Playground", path: "/developer/playground" },
] as const;

export function DeveloperNav() {
  return (
    <nav className="developer-nav" aria-label="Developer documentation">
      <ul>
        {developerNavItems.map((item) => (
          <li key={item.path}>
            <NavLink to={item.path} end={item.path === "/developer"}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
