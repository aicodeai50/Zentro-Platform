import type { Session } from "@supabase/supabase-js";
import { z } from "zod";

export type ApiStatus =
  | "success"
  | "missing-config"
  | "unauthorized"
  | "forbidden"
  | "offline"
  | "validation-error"
  | "contract-error"
  | "backend-unavailable"
  | "capability-required"
  | "error";

export type ApiResult<T> =
  | { status: "success"; endpoint: string; data: T }
  | { status: "missing-config"; endpoint: string; message: string }
  | { status: "unauthorized"; endpoint: string; message: string; statusCode: 401 }
  | { status: "forbidden"; endpoint: string; message: string; statusCode: 403 }
  | { status: "offline"; endpoint: string; message: string }
  | { status: "validation-error"; endpoint: string; message: string; statusCode: 400 | 422; details?: unknown }
  | { status: "contract-error"; endpoint: string; message: string; details?: unknown }
  | { status: "backend-unavailable"; endpoint: string; message: string; statusCode?: number }
  | { status: "capability-required"; endpoint: string; message: string; statusCode: number }
  | { status: "error"; endpoint: string; message: string; statusCode?: number };

export type ApiContext = {
  workspaceId?: string | null;
  projectId?: string | null;
  signal?: AbortSignal;
};

export type AuthBridge = {
  getSession: () => Promise<Session | null>;
  refreshSession: () => Promise<Session | null>;
  onUnauthorized?: () => void;
};

export type HealthStatus = z.infer<typeof healthSchema>;
export type SessionBootstrap = z.infer<typeof sessionBootstrapSchema>;
export type WorkspaceOverview = SessionBootstrap & {
  organization?: unknown;
  members?: unknown[];
  apiKeys?: unknown[];
  environment?: string;
  usage?: unknown;
  activity?: ActivityItem[];
};
export type CurrentUser = z.infer<typeof userSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type ProjectSummary = z.infer<typeof projectSchema>;
export type ProjectDetail = ProjectSummary & {
  members?: unknown[];
  apiKeys?: unknown[];
  analytics?: unknown;
};
export type AiControlCenter = {
  providers?: unknown[];
  localModels?: unknown[];
  planner?: unknown;
  defaultModel?: unknown;
  streaming?: unknown;
  providerHealth?: unknown;
  latency?: unknown;
  privacyMode?: unknown;
  autoRouting?: unknown;
};
export type ApiPortal = {
  keys?: ApiKeyMetadata[];
  scopes?: unknown[];
  usage?: unknown;
  authentication?: unknown;
  rateLimits?: unknown;
  documentation?: unknown;
};
export type CreateApiKeyPayload = {
  name: string;
  scopes?: string[];
  projectId?: string;
};
export type ApiKeyMetadata = z.infer<typeof apiKeyMetadataSchema>;
export type ApiKeyActionResult = z.infer<typeof apiKeyActionSchema>;
export type AnalyticsSummary = z.infer<typeof analyticsSchema>;
export type BackendSettings = z.infer<typeof settingsSchema>;
export type ActivityItem = {
  id?: string;
  type?: string;
  message?: string;
  createdAt?: string;
};
export type CreateProjectPayload = {
  name: string;
  description?: string;
  environment?: string;
};

const userSchema = z.object({ id: z.string().optional(), email: z.string().optional(), name: z.string().optional() }).passthrough();
const organizationSchema = z.object({ id: z.string().optional(), name: z.string().optional(), slug: z.string().optional(), role: z.string().optional() }).passthrough();
const workspaceSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    slug: z.string().optional(),
    organizationId: z.string().optional(),
    role: z.string().optional(),
    permissions: z.array(z.string()).optional(),
  })
  .passthrough();
const projectSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    environment: z.string().optional(),
    apiKeys: z.array(z.unknown()).optional(),
    models: z.array(z.unknown()).optional(),
    usage: z.unknown().optional(),
    logs: z.array(z.unknown()).optional(),
    secrets: z.unknown().optional(),
    health: z.unknown().optional(),
    deployments: z.unknown().optional(),
  })
  .passthrough();
const sessionBootstrapSchema = z
  .object({
    user: userSchema.optional(),
    currentUser: userSchema.optional(),
    organizations: z.array(organizationSchema).optional(),
    currentOrganization: organizationSchema.optional(),
    workspaces: z.array(workspaceSchema).optional(),
    currentWorkspace: workspaceSchema.optional(),
    roles: z.array(z.string()).optional(),
    permissions: z.array(z.string()).optional(),
    onboarding: z.unknown().optional(),
    projects: z.array(projectSchema).optional(),
  })
  .passthrough();
const healthSchema = z
  .object({
    status: z.string().optional(),
    ok: z.boolean().optional(),
    service: z.string().optional(),
    version: z.string().optional(),
    uptime: z.union([z.number(), z.string()]).optional(),
    timestamp: z.string().optional(),
    checks: z.record(z.string(), z.unknown()).optional(),
    application: z.unknown().optional(),
    database: z.unknown().optional(),
    redis: z.unknown().optional(),
    providers: z.unknown().optional(),
    memory: z.unknown().optional(),
  })
  .passthrough();
const apiKeyMetadataSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    prefix: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    lastUsedAt: z.string().optional(),
  })
  .passthrough();
const apiKeyActionSchema = z
  .object({
    key: z.unknown().optional(),
    apiKey: z.unknown().optional(),
    token: z.string().optional(),
    secret: z.string().optional(),
    value: z.string().optional(),
  })
  .passthrough();
const analyticsSchema = z.record(z.string(), z.unknown());
const settingsSchema = z.record(z.string(), z.unknown());

let authBridge: AuthBridge | null = null;
let refreshPromise: Promise<Session | null> | null = null;

export function configureZentroApiAuth(bridge: AuthBridge | null) {
  authBridge = bridge;
  refreshPromise = null;
}

export function getZentroApiBaseUrl() {
  return process.env.NEXT_PUBLIC_ZENTRO_API_URL?.replace(/\/$/, "") ?? "";
}

export async function zentroRequest<T>(
  endpoint: string,
  init: RequestInit = {},
  options: {
    authenticated?: boolean;
    context?: ApiContext;
    retryOnUnauthorized?: boolean;
    schema?: z.ZodType<T>;
  } = {}
): Promise<ApiResult<T>> {
  const baseUrl = getZentroApiBaseUrl();

  if (!baseUrl) {
    return {
      status: "missing-config",
      endpoint,
      message: "Set NEXT_PUBLIC_ZENTRO_API_URL to connect Zentro Platform to ZENTRO-OWN-API-V2.",
    };
  }

  const authenticated = options.authenticated ?? false;
  const context = options.context;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (context?.workspaceId) {
    headers.set("X-Workspace-Id", context.workspaceId);
  }

  if (context?.projectId) {
    headers.set("X-Project-Id", context.projectId);
  }

  if (authenticated) {
    const session = await authBridge?.getSession();
    const token = session?.access_token;

    if (!token) {
      return { status: "unauthorized", endpoint, statusCode: 401, message: "Login required." };
    }

    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: context?.signal,
    });

    if (response.status === 401 && authenticated && options.retryOnUnauthorized !== false) {
      const refreshed = await refreshOnce();

      if (refreshed?.access_token) {
        return zentroRequest<T>(endpoint, init, { ...options, retryOnUnauthorized: false });
      }

      authBridge?.onUnauthorized?.();
      return { status: "unauthorized", endpoint, statusCode: 401, message: "Session expired. Please log in again." };
    }

    if (response.status === 401) {
      authBridge?.onUnauthorized?.();
      return { status: "unauthorized", endpoint, statusCode: 401, message: "Unauthorized." };
    }

    if (response.status === 403) {
      return { status: "forbidden", endpoint, statusCode: 403, message: "Permission denied." };
    }

    if (response.status === 404 || response.status === 405 || response.status === 501) {
      return { status: "capability-required", endpoint, statusCode: response.status, message: "Backend capability unavailable." };
    }

    if (response.status === 400 || response.status === 422) {
      return {
        status: "validation-error",
        endpoint,
        statusCode: response.status,
        message: "Backend validation failed.",
        details: await parseResponseBody(response),
      };
    }

    if (response.status >= 500) {
      return { status: "backend-unavailable", endpoint, statusCode: response.status, message: `Backend unavailable. HTTP ${response.status}.` };
    }

    if (!response.ok) {
      return { status: "error", endpoint, statusCode: response.status, message: `Backend request failed with HTTP ${response.status}.` };
    }

    const rawData = await parseResponseBody(response);

    if (options.schema) {
      const parsed = options.schema.safeParse(rawData);

      if (!parsed.success) {
        return {
          status: "contract-error",
          endpoint,
          message: "Backend response did not match the frontend contract.",
          details: parsed.error.flatten(),
        };
      }

      return { status: "success", endpoint, data: parsed.data };
    }

    return { status: "success", endpoint, data: rawData as T };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "error", endpoint, message: "Request cancelled." };
    }

    return {
      status: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "backend-unavailable",
      endpoint,
      message: error instanceof Error ? error.message : "Backend request failed.",
    };
  }
}

async function refreshOnce() {
  if (!authBridge) {
    return null;
  }

  refreshPromise ??= authBridge.refreshSession().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function parseResponseBody(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (response.status === 204) {
    return null;
  }

  return contentType.includes("application/json") ? response.json() : response.text();
}

export const zentroApi = {
  get baseUrl() {
    return getZentroApiBaseUrl();
  },
  session: {
    bootstrap: (context?: ApiContext) =>
      zentroRequest<SessionBootstrap>("/api/auth/session", {}, { authenticated: true, context, schema: sessionBootstrapSchema }),
  },
  home: {
    overview: (context?: ApiContext) =>
      zentroRequest<WorkspaceOverview>("/platform/home", {}, { authenticated: true, context, schema: sessionBootstrapSchema }),
  },
  organizations: {
    list: (context?: ApiContext) =>
      zentroRequest<Organization[]>("/v1/organizations", {}, { authenticated: true, context, schema: z.array(organizationSchema) }),
    get: (organizationId: string, context?: ApiContext) =>
      zentroRequest<Organization>(`/v1/organizations/${encodeURIComponent(organizationId)}`, {}, { authenticated: true, context, schema: organizationSchema }),
    members: (organizationId: string, context?: ApiContext) =>
      zentroRequest<unknown[]>(`/v1/organizations/${encodeURIComponent(organizationId)}/members`, {}, { authenticated: true, context, schema: z.array(z.unknown()) }),
  },
  workspace: {
    overview: (context?: ApiContext) =>
      zentroRequest<Workspace>("/workspace", {}, { authenticated: true, context, schema: workspaceSchema }),
    list: (context?: ApiContext) =>
      zentroRequest<Workspace[]>("/v1/workspaces", {}, { authenticated: true, context, schema: z.array(workspaceSchema) }),
    get: (workspaceId: string, context?: ApiContext) =>
      zentroRequest<Workspace>(`/v1/workspaces/${encodeURIComponent(workspaceId)}`, {}, { authenticated: true, context, schema: workspaceSchema }),
    members: (workspaceId: string, context?: ApiContext) =>
      zentroRequest<unknown[]>(`/v1/workspaces/${encodeURIComponent(workspaceId)}/members`, {}, { authenticated: true, context, schema: z.array(z.unknown()) }),
    update: (payload: Record<string, unknown>, context?: ApiContext) =>
      zentroRequest<Workspace>("/workspace", { method: "PATCH", body: JSON.stringify(payload) }, { authenticated: true, context, schema: workspaceSchema }),
  },
  projects: {
    list: (context?: ApiContext) =>
      zentroRequest<ProjectSummary[]>("/projects", {}, { authenticated: true, context, schema: z.array(projectSchema) }),
    get: (projectId: string, context?: ApiContext) =>
      zentroRequest<ProjectDetail>(`/projects/${encodeURIComponent(projectId)}`, {}, { authenticated: true, context: { ...context, projectId }, schema: projectSchema }),
    create: (payload: CreateProjectPayload, context?: ApiContext) =>
      zentroRequest<ProjectSummary>("/projects", { method: "POST", body: JSON.stringify(payload) }, { authenticated: true, context, schema: projectSchema }),
    update: (projectId: string, payload: Partial<CreateProjectPayload>, context?: ApiContext) =>
      zentroRequest<ProjectSummary>(
        `/projects/${encodeURIComponent(projectId)}`,
        { method: "PATCH", body: JSON.stringify(payload) },
        { authenticated: true, context: { ...context, projectId }, schema: projectSchema }
      ),
    delete: (projectId: string, context?: ApiContext) =>
      zentroRequest<unknown>(`/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" }, { authenticated: true, context: { ...context, projectId } }),
    analytics: (projectId: string, context?: ApiContext) =>
      zentroRequest<AnalyticsSummary>(`/projects/${encodeURIComponent(projectId)}/analytics`, {}, { authenticated: true, context: { ...context, projectId }, schema: analyticsSchema }),
    health: (projectId: string, context?: ApiContext) =>
      zentroRequest<HealthStatus>(`/projects/${encodeURIComponent(projectId)}/health`, {}, { authenticated: true, context: { ...context, projectId }, schema: healthSchema }),
  },
  ai: {
    providers: (context?: ApiContext) =>
      zentroRequest<AiControlCenter>("/providers", {}, { authenticated: true, context, schema: z.record(z.string(), z.unknown()) }),
  },
  developerApi: {
    keys: (context?: ApiContext) =>
      zentroRequest<ApiKeyMetadata[]>("/api-keys", {}, { authenticated: true, context, schema: z.array(apiKeyMetadataSchema) }),
    projectKeys: (projectId: string, context?: ApiContext) =>
      zentroRequest<ApiKeyMetadata[]>(`/projects/${encodeURIComponent(projectId)}/api-keys`, {}, { authenticated: true, context: { ...context, projectId }, schema: z.array(apiKeyMetadataSchema) }),
    createProjectKey: (projectId: string, payload: Omit<CreateApiKeyPayload, "projectId">, context?: ApiContext) =>
      zentroRequest<ApiKeyActionResult>(
        `/projects/${encodeURIComponent(projectId)}/api-keys`,
        { method: "POST", body: JSON.stringify(payload) },
        { authenticated: true, context: { ...context, projectId }, schema: apiKeyActionSchema }
      ),
    rotateProjectKey: (projectId: string, keyId: string, context?: ApiContext) =>
      zentroRequest<ApiKeyActionResult>(
        `/projects/${encodeURIComponent(projectId)}/api-keys/${encodeURIComponent(keyId)}/rotate`,
        { method: "POST" },
        { authenticated: true, context: { ...context, projectId }, schema: apiKeyActionSchema }
      ),
    revokeProjectKey: (projectId: string, keyId: string, context?: ApiContext) =>
      zentroRequest<unknown>(
        `/projects/${encodeURIComponent(projectId)}/api-keys/${encodeURIComponent(keyId)}/revoke`,
        { method: "POST" },
        { authenticated: true, context: { ...context, projectId } }
      ),
    projectKeyUsage: (projectId: string, keyId: string, context?: ApiContext) =>
      zentroRequest<unknown>(
        `/projects/${encodeURIComponent(projectId)}/api-keys/${encodeURIComponent(keyId)}/usage`,
        {},
        { authenticated: true, context: { ...context, projectId } }
      ),
  },
  analytics: {
    summary: (context?: ApiContext) =>
      zentroRequest<AnalyticsSummary>("/analytics", {}, { authenticated: true, context, schema: analyticsSchema }),
  },
  health: {
    application: (context?: ApiContext) => zentroRequest<HealthStatus>("/health", {}, { context, schema: healthSchema }),
    ready: (context?: ApiContext) => zentroRequest<HealthStatus>("/health/ready", {}, { context, schema: healthSchema }),
  },
  settings: {
    get: (context?: ApiContext) =>
      zentroRequest<BackendSettings>("/settings", {}, { authenticated: true, context, schema: settingsSchema }),
    update: (payload: Record<string, unknown>, context?: ApiContext) =>
      zentroRequest<BackendSettings>("/settings", { method: "PATCH", body: JSON.stringify(payload) }, { authenticated: true, context, schema: settingsSchema }),
  },
};
