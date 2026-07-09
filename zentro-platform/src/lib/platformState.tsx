import { createContext, useContext } from "react";
import type { Organization, Project } from "../data/types";

export type PlatformState = {
  organizations: Organization[];
  selectedOrganization: Organization;
  selectedProject: Project;
  organizationProjects: Project[];
  selectOrganization: (organizationId: string) => void;
  selectProject: (projectId: string) => void;
};

export const PlatformContext = createContext<PlatformState | null>(null);

export function usePlatform() {
  const context = useContext(PlatformContext);

  if (!context) {
    throw new Error("usePlatform must be used inside PlatformContext.Provider");
  }

  return context;
}
