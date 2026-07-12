"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { configureZentroApiAuth, type ApiContext, type SessionBootstrap, zentroApi } from "./zentroApi";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

type AppSessionContextValue = {
  authStatus: "loading" | "signed-out" | "signed-in" | "supabase-not-configured";
  user: User | null;
  session: Session | null;
  bootstrap: SessionBootstrap | null;
  activeWorkspaceId: string | null;
  activeProjectId: string | null;
  apiContext: ApiContext;
  permissionDenied: boolean;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshBootstrap: () => Promise<void>;
  selectWorkspace: (workspaceId: string | null) => void;
  selectProject: (projectId: string | null) => void;
  clearPermissionDenied: () => void;
};

const AppSessionContext = createContext<AppSessionContextValue | null>(null);

export function AppSessionProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AppSessionContextValue["authStatus"]>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [bootstrap, setBootstrap] = useState<SessionBootstrap | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem("zentro_active_workspace_id")
  );
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem("zentro_active_project_id")
  );
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthStatus("supabase-not-configured");
      configureZentroApiAuth(null);
      return;
    }

    const supabaseClient = supabase;

    configureZentroApiAuth({
      getSession: async () => {
        const { data } = await supabaseClient.auth.getSession();
        return data.session;
      },
      refreshSession: async () => {
        const { data } = await supabaseClient.auth.refreshSession();
        setSession(data.session);
        return data.session;
      },
      onUnauthorized: () => {
        setSession(null);
        setBootstrap(null);
        setActiveWorkspaceId(null);
        setActiveProjectId(null);
        setAuthStatus("signed-out");
      },
    });

    void supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthStatus(data.session ? "signed-in" : "signed-out");
    });

    const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthStatus(nextSession ? "signed-in" : "signed-out");

      if (!nextSession) {
        setBootstrap(null);
        setActiveWorkspaceId(null);
        setActiveProjectId(null);
        clearPlatformSelections();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
      configureZentroApiAuth(null);
    };
  }, []);

  const apiContext = useMemo(
    () => ({ workspaceId: activeWorkspaceId, projectId: activeProjectId }),
    [activeProjectId, activeWorkspaceId]
  );

  async function refreshBootstrap() {
    if (!session) {
      setBootstrap(null);
      return;
    }

    const result = await zentroApi.session.bootstrap(apiContext);

    if (result.status === "success") {
      setBootstrap(result.data);
      const firstWorkspaceId = getId(result.data.currentWorkspace) ?? getId(result.data.workspaces?.[0]);
      const firstProjectId = getId(result.data.projects?.[0]);

      if (!activeWorkspaceId && firstWorkspaceId) {
        selectWorkspace(firstWorkspaceId);
      }

      if (!activeProjectId && firstProjectId) {
        selectProject(firstProjectId);
      }
      return;
    }

    if (result.status === "forbidden") {
      setPermissionDenied(true);
    }
  }

  useEffect(() => {
    void refreshBootstrap();
  }, [session?.access_token]);

  async function signInWithEmail(email: string, password: string) {
    if (!supabase) {
      return "Supabase is not configured.";
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async function signOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setSession(null);
    setBootstrap(null);
    selectWorkspace(null);
    selectProject(null);
    setAuthStatus("signed-out");
  }

  function selectWorkspace(workspaceId: string | null) {
    setActiveWorkspaceId(workspaceId);
    persistSelection("zentro_active_workspace_id", workspaceId);
  }

  function selectProject(projectId: string | null) {
    setActiveProjectId(projectId);
    persistSelection("zentro_active_project_id", projectId);
  }

  return (
    <AppSessionContext.Provider
      value={{
        authStatus,
        user: session?.user ?? null,
        session,
        bootstrap,
        activeWorkspaceId,
        activeProjectId,
        apiContext,
        permissionDenied,
        signInWithEmail,
        signOut,
        refreshBootstrap,
        selectWorkspace,
        selectProject,
        clearPermissionDenied: () => setPermissionDenied(false),
      }}
    >
      {children}
    </AppSessionContext.Provider>
  );
}

export function useAppSession() {
  const context = useContext(AppSessionContext);

  if (!context) {
    throw new Error("useAppSession must be used within AppSessionProvider");
  }

  return context;
}

export function clearPlatformSelections() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("zentro_active_workspace_id");
  window.localStorage.removeItem("zentro_active_project_id");
}

function persistSelection(key: string, value: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    window.localStorage.setItem(key, value);
  } else {
    window.localStorage.removeItem(key);
  }
}

function getId(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return typeof record.id === "string" ? record.id : null;
}
