export type Plan = "Free" | "Pro" | "Team" | "Enterprise";
export type Environment = "test" | "live" | "staging" | "production";
export type MemberRole = "owner" | "admin" | "developer" | "viewer";
export type ApiKeyStatus = "active" | "disabled" | "revoked";
export type ApiKeyPermission = "chat:write" | "models:read" | "usage:read" | "keys:manage";
export type ModelStatus = "available" | "beta" | "private";

export type OrganizationMember = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: "Active" | "Invited";
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  owner: string;
  members: OrganizationMember[];
  projects: string[];
  usageBalance: string;
  creditsRemaining: number;
};

export type UsageDay = {
  day: string;
  requests: number;
  credits: number;
};

export type UsageModel = {
  model: string;
  tokens: string;
  share: number;
};

export type Project = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  environment: Environment;
  createdAt: string;
  apiKeyIds: string[];
  usage: {
    requestsToday: number;
    requestsThisMonth: number;
    tokensThisMonth: number;
    creditsUsed: number;
    latestActivity: string;
    byDay: UsageDay[];
    byModel: UsageModel[];
    events: UsageEvent[];
  };
  modelsEnabled: string[];
  settings: ProjectSettings;
};

export type UsageEvent = {
  id: string;
  time: string;
  model: string;
  tokens: string;
  credits: string;
  status: "Completed" | "Errored" | "Rate limited";
};

export type ApiKey = {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  prefix: string;
  environment: "test" | "live";
  permissions: ApiKeyPermission[];
  expiresAt: string;
  status: ApiKeyStatus;
  createdAt: string;
  lastUsed: string;
};

export type ProjectSettings = {
  allowedOrigins: string[];
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  webhooks: {
    url: string;
    events: string[];
  };
  secretsPlaceholder: string;
};

export type CreateProjectInput = {
  organizationId: string;
  name: string;
  description: string;
  environment: Environment;
};

export type CreateApiKeyInput = {
  organizationId: string;
  projectId: string;
  name: string;
  permissions: ApiKeyPermission[];
  expiration: string;
  environment: "test" | "live";
};
