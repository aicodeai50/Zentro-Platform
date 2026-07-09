import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { organizations } from "./data/organizations";
import { projects } from "./data/projects";
import { PlatformContext } from "./lib/platformState";
import { ApiKeys } from "./pages/ApiKeys";
import { Billing } from "./pages/Billing";
import { Dashboard } from "./pages/Dashboard";
import { Docs } from "./pages/Docs";
import { Logs } from "./pages/Logs";
import { Models } from "./pages/Models";
import { Playground } from "./pages/Playground";
import { ProjectDetail } from "./pages/ProjectDetail";
import { ProjectNew } from "./pages/ProjectNew";
import { Projects } from "./pages/Projects";
import { Settings } from "./pages/Settings";
import { Team } from "./pages/Team";
import { Usage } from "./pages/Usage";

type Theme = "light" | "dark";

export function App() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("org_zentro");
  const [selectedProjectId, setSelectedProjectId] = useState("proj_prod_api");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const platformState = useMemo(() => {
    const selectedOrganization =
      organizations.find((organization) => organization.id === selectedOrganizationId) ?? organizations[0];
    const organizationProjects = projects.filter(
      (project) => project.organizationId === selectedOrganization.id
    );
    const selectedProject =
      organizationProjects.find((project) => project.id === selectedProjectId) ?? organizationProjects[0];

    if (!selectedProject) {
      throw new Error(`No projects configured for ${selectedOrganization.name}`);
    }

    return {
      organizations,
      selectedOrganization,
      selectedProject,
      organizationProjects,
      selectOrganization: (organizationId: string) => {
        const nextOrganization =
          organizations.find((organization) => organization.id === organizationId) ?? organizations[0];
        const nextProject = projects.find((project) => project.organizationId === nextOrganization.id);

        setSelectedOrganizationId(nextOrganization.id);
        if (nextProject) {
          setSelectedProjectId(nextProject.id);
        }
      },
      selectProject: setSelectedProjectId,
    };
  }, [selectedOrganizationId, selectedProjectId]);

  return (
    <PlatformContext.Provider value={platformState}>
      <AppLayout theme={theme} onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<ProjectNew />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/models" element={<Models />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/team" element={<Team />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </PlatformContext.Provider>
  );
}
