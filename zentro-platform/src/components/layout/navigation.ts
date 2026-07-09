import {
  BarChart3,
  BookOpen,
  Boxes,
  CreditCard,
  Gauge,
  KeyRound,
  ListTree,
  ScrollText,
  Settings,
  TerminalSquare,
  Users,
} from "lucide-react";

export const navigationItems = [
  { label: "Overview", path: "/dashboard", icon: Gauge },
  { label: "API Keys", path: "/api-keys", icon: KeyRound },
  { label: "Usage", path: "/usage", icon: BarChart3 },
  { label: "Models", path: "/models", icon: Boxes },
  { label: "Playground", path: "/playground", icon: TerminalSquare },
  { label: "Logs", path: "/logs", icon: ScrollText },
  { label: "Members", path: "/team", icon: Users },
  { label: "Settings", path: "/settings", icon: Settings },
];

export const workspaceItems = [
  { label: "Projects", path: "/projects", icon: ListTree },
  { label: "Billing", path: "/billing", icon: CreditCard },
  { label: "Docs", path: "/docs", icon: BookOpen },
];
