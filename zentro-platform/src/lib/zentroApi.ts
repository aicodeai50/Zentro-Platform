import type { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { getPublicConfig } from "./publicConfig";

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
  | "rate-limited"
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
  | { status: "rate-limited"; endpoint: string; message: string; statusCode: 429; details?: unknown }
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
  organizationId?: string | null;
  workspaceId?: string | null;
  projectId?: string | null;
  expiresAt?: string;
  allowedModels?: string[];
  allowedProviders?: string[];
  monthlyCreditLimit?: number | null;
  ipAllowlist?: string[];
  permissions?: string[];
};
export type UpdateApiKeyPayload = Partial<CreateApiKeyPayload>;
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
export type PlaygroundInferencePayload = {
  provider: string;
  model: string;
  temperature: number;
  privacyMode: string;
  systemPrompt: string;
  userPrompt: string;
  stream?: boolean;
};
export type PlaygroundInferenceResult = z.infer<typeof playgroundInferenceSchema>;
export type ProjectLogs = z.infer<typeof projectLogsSchema>;
export type BillingUsage = z.infer<typeof billingUsageSchema>;
export type BillingSummary = z.infer<typeof billingSummarySchema>;
export type WorkspaceCredits = z.infer<typeof workspaceCreditsSchema>;
export type WorkspaceTransactions = z.infer<typeof workspaceTransactionsSchema>;
export type UsageSummary = z.infer<typeof usageSummarySchema>;
export type UsageTimeseries = z.infer<typeof usageTimeseriesSchema>;
export type UsageModelRow = z.infer<typeof usageModelRowSchema>;
export type UsageProviderRow = z.infer<typeof usageProviderRowSchema>;
export type UsageApiKeyRow = z.infer<typeof usageApiKeyRowSchema>;
export type UsageRequestRow = z.infer<typeof usageRequestRowSchema>;
export type UsageRequestsPage = z.infer<typeof usageRequestsPageSchema>;
export type UsageModelsResponse = z.infer<typeof usageModelsResponseSchema>;
export type UsageProvidersResponse = z.infer<typeof usageProvidersResponseSchema>;
export type UsageApiKeysResponse = z.infer<typeof usageApiKeysResponseSchema>;
export type UsageQuery = {
  range?: string;
  startDate?: string;
  endDate?: string;
  model?: string;
  provider?: string;
  apiKeyId?: string;
  status?: string;
  projectId?: string;
  cursor?: string;
  page?: string;
};
export type Webhook = z.infer<typeof webhookSchema>;
export type WebhookActionResult = z.infer<typeof webhookActionSchema>;
export type ProjectMember = z.infer<typeof projectMemberSchema>;
export type ProjectMemberPayload = {
  email?: string;
  role?: string;
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
    organizationId: z.string().optional(),
    workspaceId: z.string().optional(),
    projectId: z.string().optional(),
    scopes: z.array(z.string()).optional(),
    permissions: z.array(z.string()).optional(),
    allowedModels: z.array(z.string()).optional(),
    allowedProviders: z.array(z.string()).optional(),
    monthlyCreditLimit: z.union([z.number(), z.string()]).nullable().optional(),
    ipAllowlist: z.array(z.string()).optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    expiresAt: z.string().nullable().optional(),
    lastUsedAt: z.string().optional(),
    createdBy: z.string().optional(),
    revokedAt: z.string().nullable().optional(),
  })
  .passthrough();
const apiKeyActionSchema = z
  .object({
    key: z.unknown().optional(),
    apiKey: z.unknown().optional(),
    token: z.string().optional(),
    secret: z.string().optional(),
    value: z.string().optional(),
    plaintextKey: z.string().optional(),
  })
  .passthrough();
const analyticsSchema = z.record(z.string(), z.unknown());
const settingsSchema = z.record(z.string(), z.unknown());
const playgroundInferenceSchema = z
  .object({
    response: z.unknown().optional(),
    content: z.unknown().optional(),
    text: z.string().optional(),
    provider: z.string().optional(),
    providerUsed: z.string().optional(),
    model: z.string().optional(),
    modelUsed: z.string().optional(),
    latency: z.union([z.number(), z.string()]).optional(),
    latencyMs: z.union([z.number(), z.string()]).optional(),
    tokenUsage: z.unknown().optional(),
    usage: z.unknown().optional(),
    requestId: z.string().optional(),
    id: z.string().optional(),
    error: z.unknown().optional(),
  })
  .passthrough();
const projectLogsSchema = z
  .object({
    items: z.array(z.record(z.string(), z.unknown())).optional(),
    logs: z.array(z.record(z.string(), z.unknown())).optional(),
    data: z.array(z.record(z.string(), z.unknown())).optional(),
    nextCursor: z.string().nullable().optional(),
    cursor: z.string().nullable().optional(),
    page: z.union([z.number(), z.string()]).optional(),
    total: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();
const billingUsageSchema = z.record(z.string(), z.unknown());
const billingSummarySchema = z.record(z.string(), z.unknown());
const workspaceCreditsSchema = z.record(z.string(), z.unknown());
const workspaceTransactionsSchema = z
  .object({
    items: z.array(z.record(z.string(), z.unknown())).optional(),
    transactions: z.array(z.record(z.string(), z.unknown())).optional(),
    data: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();
const usageSummarySchema = z.record(z.string(), z.unknown());
const usageTimeseriesSchema = z.record(z.string(), z.unknown());
const usageModelRowSchema = z
  .object({
    model: z.string().optional(),
    name: z.string().optional(),
    requestCount: z.union([z.number(), z.string()]).optional(),
    requests: z.union([z.number(), z.string()]).optional(),
    inputTokens: z.union([z.number(), z.string()]).optional(),
    outputTokens: z.union([z.number(), z.string()]).optional(),
    totalTokens: z.union([z.number(), z.string()]).optional(),
    creditsSpent: z.union([z.number(), z.string()]).optional(),
    averageLatency: z.union([z.number(), z.string()]).optional(),
    errorRate: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();
const usageProviderRowSchema = z
  .object({
    provider: z.string().optional(),
    name: z.string().optional(),
    requestCount: z.union([z.number(), z.string()]).optional(),
    requests: z.union([z.number(), z.string()]).optional(),
    fallbackCount: z.union([z.number(), z.string()]).optional(),
    successRate: z.union([z.number(), z.string()]).optional(),
    averageLatency: z.union([z.number(), z.string()]).optional(),
    totalTokens: z.union([z.number(), z.string()]).optional(),
    creditsSpent: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();
const usageApiKeyRowSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    prefix: z.string().optional(),
    apiKeyPrefix: z.string().optional(),
    projectId: z.string().optional(),
    project: z.string().optional(),
    requests: z.union([z.number(), z.string()]).optional(),
    tokens: z.union([z.number(), z.string()]).optional(),
    creditsSpent: z.union([z.number(), z.string()]).optional(),
    lastUsedAt: z.string().optional(),
    monthlyCreditLimit: z.union([z.number(), z.string()]).nullable().optional(),
    limitConsumedPercent: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();
const usageRequestRowSchema = z
  .object({
    id: z.string().optional(),
    requestId: z.string().optional(),
    timestamp: z.string().optional(),
    createdAt: z.string().optional(),
    status: z.string().optional(),
    model: z.string().optional(),
    provider: z.string().optional(),
    apiKeyPrefix: z.string().optional(),
    prefix: z.string().optional(),
    latency: z.union([z.number(), z.string()]).optional(),
    latencyMs: z.union([z.number(), z.string()]).optional(),
    inputTokens: z.union([z.number(), z.string()]).optional(),
    outputTokens: z.union([z.number(), z.string()]).optional(),
    creditsSpent: z.union([z.number(), z.string()]).optional(),
    error: z.unknown().optional(),
    errorSummary: z.string().optional(),
  })
  .passthrough();
const usageRequestsPageSchema = z
  .object({
    items: z.array(usageRequestRowSchema).optional(),
    requests: z.array(usageRequestRowSchema).optional(),
    data: z.array(usageRequestRowSchema).optional(),
    nextCursor: z.string().nullable().optional(),
    cursor: z.string().nullable().optional(),
    page: z.union([z.number(), z.string()]).optional(),
    total: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();
const usageModelsResponseSchema = z.union([
  z.array(usageModelRowSchema),
  z
    .object({
      models: z.array(usageModelRowSchema).optional(),
      items: z.array(usageModelRowSchema).optional(),
      data: z.array(usageModelRowSchema).optional(),
    })
    .passthrough(),
]);
const usageProvidersResponseSchema = z.union([
  z.array(usageProviderRowSchema),
  z
    .object({
      providers: z.array(usageProviderRowSchema).optional(),
      items: z.array(usageProviderRowSchema).optional(),
      data: z.array(usageProviderRowSchema).optional(),
    })
    .passthrough(),
]);
const usageApiKeysResponseSchema = z.union([
  z.array(usageApiKeyRowSchema),
  z
    .object({
      apiKeys: z.array(usageApiKeyRowSchema).optional(),
      keys: z.array(usageApiKeyRowSchema).optional(),
      items: z.array(usageApiKeyRowSchema).optional(),
      data: z.array(usageApiKeyRowSchema).optional(),
    })
    .passthrough(),
]);
const webhookSchema = z
  .object({
    id: z.string().optional(),
    url: z.string().optional(),
    events: z.array(z.string()).optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();
const webhookActionSchema = webhookSchema
  .extend({
    signingSecret: z.string().optional(),
    secret: z.string().optional(),
  })
  .passthrough();
const projectMemberSchema = z
  .object({
    id: z.string().optional(),
    userId: z.string().optional(),
    email: z.string().optional(),
    name: z.string().optional(),
    role: z.string().optional(),
    status: z.string().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough();

let authBridge: AuthBridge | null = null;
let refreshPromise: Promise<Session | null> | null = null;

export function configureZentroApiAuth(bridge: AuthBridge | null) {
  authBridge = bridge;
  refreshPromise = null;
}

export function backendCapabilityRequired<T>(endpoint: string): ApiResult<T> {
  return {
    status: "capability-required",
    endpoint,
    statusCode: 501,
    message: "Backend capability required",
  };
}

export async function getZentroApiBaseUrl() {
  const config = await getPublicConfig();
  return config.zentroApiUrl.replace(/\/$/, "");
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
  const baseUrl = await getZentroApiBaseUrl();

  if (!baseUrl) {
    return {
      status: "missing-config",
      endpoint,
      message: "Set NEXT_PUBLIC_ZENTRO_API_URL at runtime to connect Zentro Platform to ZENTRO-OWN-API-V2.",
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

    if (response.status === 429) {
      return { status: "rate-limited", endpoint, statusCode: 429, message: "Rate limit exceeded.", details: await parseResponseBody(response) };
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
      return {
        status: "backend-unavailable",
        endpoint,
        statusCode: response.status,
        message: safeBackendErrorMessage(await parseResponseBody(response), response.status),
      };
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
  getBaseUrl: getZentroApiBaseUrl,
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
    inference: (projectId: string, payload: PlaygroundInferencePayload, context?: ApiContext) =>
      zentroRequest<PlaygroundInferenceResult>(
        `/v1/projects/${encodeURIComponent(projectId)}/playground/inference`,
        { method: "POST", body: JSON.stringify(payload) },
        { authenticated: true, context: { ...context, projectId }, schema: playgroundInferenceSchema }
      ),
    logs: (projectId: string, query: Record<string, string | undefined> = {}, context?: ApiContext) =>
      zentroRequest<ProjectLogs>(
        `/v1/projects/${encodeURIComponent(projectId)}/logs${toQueryString(query)}`,
        {},
        { authenticated: true, context: { ...context, projectId }, schema: projectLogsSchema }
      ),
    billingUsage: (projectId: string, context?: ApiContext) =>
      zentroRequest<BillingUsage>(
        `/v1/projects/${encodeURIComponent(projectId)}/billing/usage`,
        {},
        { authenticated: true, context: { ...context, projectId }, schema: billingUsageSchema }
      ),
    members: (projectId: string, context?: ApiContext) =>
      zentroRequest<ProjectMember[]>(
        `/v1/projects/${encodeURIComponent(projectId)}/members`,
        {},
        { authenticated: true, context: { ...context, projectId }, schema: z.array(projectMemberSchema) }
      ),
    addMember: (projectId: string, payload: ProjectMemberPayload, context?: ApiContext) =>
      zentroRequest<ProjectMember>(
        `/v1/projects/${encodeURIComponent(projectId)}/members`,
        { method: "POST", body: JSON.stringify(payload) },
        { authenticated: true, context: { ...context, projectId }, schema: projectMemberSchema }
      ),
    updateMember: (projectId: string, memberId: string, payload: ProjectMemberPayload, context?: ApiContext) =>
      zentroRequest<ProjectMember>(
        `/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
        { method: "PATCH", body: JSON.stringify(payload) },
        { authenticated: true, context: { ...context, projectId }, schema: projectMemberSchema }
      ),
    removeMember: (projectId: string, memberId: string, context?: ApiContext) =>
      zentroRequest<unknown>(
        `/v1/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
        { method: "DELETE" },
        { authenticated: true, context: { ...context, projectId } }
      ),
  },
  billing: {
    summary: (workspaceId: string, context?: ApiContext) =>
      zentroRequest<BillingSummary>(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/billing/summary`,
        {},
        { authenticated: true, context: { ...context, workspaceId }, schema: billingSummarySchema }
      ),
    credits: (workspaceId: string, context?: ApiContext) =>
      zentroRequest<WorkspaceCredits>(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/credits`,
        {},
        { authenticated: true, context: { ...context, workspaceId }, schema: workspaceCreditsSchema }
      ),
    transactions: (workspaceId: string, context?: ApiContext) =>
      zentroRequest<WorkspaceTransactions>(
        `/v1/workspaces/${encodeURIComponent(workspaceId)}/transactions`,
        {},
        { authenticated: true, context: { ...context, workspaceId }, schema: workspaceTransactionsSchema }
      ),
  },
  webhooks: {
    list: (projectId: string, context?: ApiContext) =>
      zentroRequest<Webhook[]>(
        `/v1/projects/${encodeURIComponent(projectId)}/webhooks`,
        {},
        { authenticated: true, context: { ...context, projectId }, schema: z.array(webhookSchema) }
      ),
    create: (projectId: string, payload: Record<string, unknown>, context?: ApiContext) =>
      zentroRequest<WebhookActionResult>(
        `/v1/projects/${encodeURIComponent(projectId)}/webhooks`,
        { method: "POST", body: JSON.stringify(payload) },
        { authenticated: true, context: { ...context, projectId }, schema: webhookActionSchema }
      ),
    update: (projectId: string, webhookId: string, payload: Record<string, unknown>, context?: ApiContext) =>
      zentroRequest<Webhook>(
        `/v1/projects/${encodeURIComponent(projectId)}/webhooks/${encodeURIComponent(webhookId)}`,
        { method: "PATCH", body: JSON.stringify(payload) },
        { authenticated: true, context: { ...context, projectId }, schema: webhookSchema }
      ),
    delete: (projectId: string, webhookId: string, context?: ApiContext) =>
      zentroRequest<unknown>(
        `/v1/projects/${encodeURIComponent(projectId)}/webhooks/${encodeURIComponent(webhookId)}`,
        { method: "DELETE" },
        { authenticated: true, context: { ...context, projectId } }
      ),
    test: (projectId: string, webhookId: string, context?: ApiContext) =>
      zentroRequest<unknown>(
        `/v1/projects/${encodeURIComponent(projectId)}/webhooks/${encodeURIComponent(webhookId)}/test`,
        { method: "POST" },
        { authenticated: true, context: { ...context, projectId } }
      ),
  },
  ai: {
    providers: (context?: ApiContext) =>
      zentroRequest<AiControlCenter>("/providers", {}, { authenticated: true, context, schema: z.record(z.string(), z.unknown()) }),
  },
  developerApi: {
    keys: (context?: ApiContext) =>
      zentroRequest<ApiKeyMetadata[]>("/v1/api-keys", {}, { authenticated: true, context, schema: z.array(apiKeyMetadataSchema) }),
    create: (payload: CreateApiKeyPayload, context?: ApiContext) =>
      zentroRequest<ApiKeyActionResult>(
        "/v1/api-keys",
        { method: "POST", body: JSON.stringify(payload) },
        { authenticated: true, context: { ...context, workspaceId: payload.workspaceId ?? context?.workspaceId, projectId: payload.projectId ?? context?.projectId }, schema: apiKeyActionSchema }
      ),
    update: (keyId: string, payload: UpdateApiKeyPayload, context?: ApiContext) =>
      zentroRequest<ApiKeyMetadata>(
        `/v1/api-keys/${encodeURIComponent(keyId)}`,
        { method: "PATCH", body: JSON.stringify(payload) },
        { authenticated: true, context, schema: apiKeyMetadataSchema }
      ),
    revoke: (keyId: string, context?: ApiContext) =>
      zentroRequest<unknown>(`/v1/api-keys/${encodeURIComponent(keyId)}`, { method: "DELETE" }, { authenticated: true, context }),
    projectKeys: (projectId: string, context?: ApiContext) =>
      zentroRequest<ApiKeyMetadata[]>(`/v1/api-keys?projectId=${encodeURIComponent(projectId)}`, {}, { authenticated: true, context: { ...context, projectId }, schema: z.array(apiKeyMetadataSchema) }),
    createProjectKey: (projectId: string, payload: Omit<CreateApiKeyPayload, "projectId">, context?: ApiContext) =>
      zentroRequest<ApiKeyActionResult>(
        "/v1/api-keys",
        { method: "POST", body: JSON.stringify({ ...payload, projectId }) },
        { authenticated: true, context: { ...context, projectId }, schema: apiKeyActionSchema }
      ),
    rotateProjectKey: (projectId: string, keyId: string, context?: ApiContext) =>
      zentroRequest<ApiKeyActionResult>(`/v1/api-keys/${encodeURIComponent(keyId)}`, { method: "PATCH", body: JSON.stringify({ rotate: true }) }, { authenticated: true, context: { ...context, projectId }, schema: apiKeyActionSchema }),
    revokeProjectKey: (projectId: string, keyId: string, context?: ApiContext) =>
      zentroRequest<unknown>(`/v1/api-keys/${encodeURIComponent(keyId)}`, { method: "DELETE" }, { authenticated: true, context: { ...context, projectId } }),
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
  usage: {
    summary: (query: UsageQuery = {}, context?: ApiContext) =>
      zentroRequest<UsageSummary>(`/v1/usage/summary${toQueryString(query)}`, {}, { authenticated: true, context, schema: usageSummarySchema }),
    timeseries: (query: UsageQuery = {}, context?: ApiContext) =>
      zentroRequest<UsageTimeseries>(`/v1/usage/timeseries${toQueryString(query)}`, {}, { authenticated: true, context, schema: usageTimeseriesSchema }),
    models: (query: UsageQuery = {}, context?: ApiContext) =>
      zentroRequest<UsageModelsResponse>(`/v1/usage/models${toQueryString(query)}`, {}, { authenticated: true, context, schema: usageModelsResponseSchema }),
    providers: (query: UsageQuery = {}, context?: ApiContext) =>
      zentroRequest<UsageProvidersResponse>(`/v1/usage/providers${toQueryString(query)}`, {}, { authenticated: true, context, schema: usageProvidersResponseSchema }),
    apiKeys: (query: UsageQuery = {}, context?: ApiContext) =>
      zentroRequest<UsageApiKeysResponse>(`/v1/usage/api-keys${toQueryString(query)}`, {}, { authenticated: true, context, schema: usageApiKeysResponseSchema }),
    requests: (query: UsageQuery = {}, context?: ApiContext) =>
      zentroRequest<UsageRequestsPage>(`/v1/usage/requests${toQueryString(query)}`, {}, { authenticated: true, context, schema: usageRequestsPageSchema }),
  },
  platformBilling: {
    summary: (query: UsageQuery = {}, context?: ApiContext) =>
      zentroRequest<BillingSummary>(`/v1/billing/summary${toQueryString(query)}`, {}, { authenticated: true, context, schema: billingSummarySchema }),
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

function toQueryString(query: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value);
    }
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function safeBackendErrorMessage(body: unknown, status: number) {
  if (!body || typeof body !== "object") {
    return `Backend unavailable. HTTP ${status}.`;
  }

  const record = body as Record<string, unknown>;
  const error = typeof record.error === "string" ? record.error : undefined;
  const message = typeof record.message === "string" ? record.message : undefined;
  const safe = error ?? message;

  return safe ? redactSecretLikeText(safe) : `Backend unavailable. HTTP ${status}.`;
}

function redactSecretLikeText(value: string) {
  return value.replace(/(?:sk|pk|whsec|zentro)_[A-Za-z0-9_-]+/g, "[redacted]");
}
