import {
  Activity,
  BarChart3,
  Bot,
  Code2,
  Gauge,
  ListTree,
  Settings,
  Users,
} from "lucide-react";

export const navigationItems = [
  { label: "Home", path: "/", icon: Gauge },
  { label: "Workspace", path: "/workspace", icon: Users },
  { label: "Projects", path: "/projects", icon: ListTree },
  { label: "AI", path: "/ai", icon: Bot },
  { label: "API", path: "/api", icon: Code2 },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Health", path: "/health", icon: Activity },
  { label: "Settings", path: "/settings", icon: Settings },
];
