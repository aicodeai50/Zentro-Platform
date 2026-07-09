import {
  BarChart3,
  BookOpen,
  Boxes,
  CreditCard,
  Gauge,
  KeyRound,
  Settings,
  TerminalSquare,
  Users,
} from "lucide-react";

export const navigationItems = [
  { label: "Dashboard", path: "/dashboard", icon: Gauge },
  { label: "API Keys", path: "/api-keys", icon: KeyRound },
  { label: "Usage", path: "/usage", icon: BarChart3 },
  { label: "Billing", path: "/billing", icon: CreditCard },
  { label: "Models", path: "/models", icon: Boxes },
  { label: "Playground", path: "/playground", icon: TerminalSquare },
  { label: "Docs", path: "/docs", icon: BookOpen },
  { label: "Team", path: "/team", icon: Users },
  { label: "Settings", path: "/settings", icon: Settings },
];
