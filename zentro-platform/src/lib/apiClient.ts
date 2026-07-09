import { apiKeys as keyRecords } from "../data/apikeys";
import { organizations } from "../data/organizations";
import { projects } from "../data/projects";
import { billingPlans, docsSections, invoices, models } from "../data/mockData";
import type { ApiKey, ApiKeyStatus, CreateApiKeyInput, CreateProjectInput } from "../data/types";

let mockKeys: ApiKey[] = [...keyRecords];

function getProjectOrThrow(projectId: string) {
  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  return project;
}

function getOrganizationOrThrow(organizationId: string) {
  const organization = organizations.find((item) => item.id === organizationId);

  if (!organization) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  return organization;
}

function buildSecret(environment: "test" | "live") {
  const prefix = environment === "live" ? "zt_live" : "zt_test";
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID()
    .replaceAll("-", "")
    .slice(0, 8)}`;
}

export const api = {
  organizations: {
    async list() {
      // TODO: Replace mock data with GET /v1/organizations.
      return organizations;
    },
    async get(id: string) {
      // TODO: Replace mock data with GET /v1/organizations/:id.
      return getOrganizationOrThrow(id);
    },
  },
  projects: {
    async list(organizationId: string) {
      // TODO: Replace mock data with GET /v1/organizations/:id/projects.
      return projects.filter((project) => project.organizationId === organizationId);
    },
    async get(projectId: string) {
      // TODO: Replace mock data with GET /v1/projects/:id.
      return getProjectOrThrow(projectId);
    },
    async create(input: CreateProjectInput) {
      // TODO: Replace mock data with POST /v1/organizations/:id/projects.
      const project = {
        id: `proj_${Date.now()}`,
        organizationId: input.organizationId,
        name: input.name,
        description: input.description,
        environment: input.environment,
        createdAt: "Just now",
        apiKeyIds: [],
        modelsEnabled: ["Zentro Fast"],
        usage: {
          requestsToday: 0,
          requestsThisMonth: 0,
          tokensThisMonth: 0,
          creditsUsed: 0,
          latestActivity: "No activity yet",
          byDay: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
            day,
            requests: 0,
            credits: 0,
          })),
          byModel: [],
          events: [],
        },
        settings: {
          allowedOrigins: [],
          rateLimits: { requestsPerMinute: 60, tokensPerMinute: 30000 },
          webhooks: { url: "", events: [] },
          secretsPlaceholder: "Secrets will be encrypted and stored by the backend.",
        },
      };

      projects.push(project);
      return project;
    },
  },
  keys: {
    async list(projectId: string) {
      // TODO: Replace mock data with GET /v1/projects/:id/api-keys.
      return mockKeys.filter((key) => key.projectId === projectId);
    },
    async create(input: CreateApiKeyInput) {
      // TODO: Replace mock data with POST /v1/projects/:id/api-keys.
      const secret = buildSecret(input.environment);
      const key: ApiKey = {
        id: `key_${Date.now()}`,
        organizationId: input.organizationId,
        projectId: input.projectId,
        name: input.name,
        prefix: secret.slice(0, 18),
        environment: input.environment,
        permissions: input.permissions,
        expiresAt: input.expiration,
        status: "active",
        createdAt: "Just now",
        lastUsed: "Never",
      };

      mockKeys = [key, ...mockKeys];
      return { key, secret };
    },
    async regenerate(id: string) {
      // TODO: Replace mock data with POST /v1/api-keys/:id/regenerate.
      const current = mockKeys.find((key) => key.id === id);

      if (!current) {
        throw new Error(`API key not found: ${id}`);
      }

      const secret = buildSecret(current.environment);
      mockKeys = mockKeys.map((key) => (key.id === id ? { ...key, prefix: secret.slice(0, 18) } : key));
      return { secret };
    },
    async updateStatus(id: string, status: ApiKeyStatus) {
      // TODO: Replace mock data with PATCH /v1/api-keys/:id.
      mockKeys = mockKeys.map((key) => (key.id === id ? { ...key, status } : key));
      return mockKeys.find((key) => key.id === id);
    },
    async delete(id: string) {
      // TODO: Replace mock data with DELETE /v1/api-keys/:id.
      mockKeys = mockKeys.filter((key) => key.id !== id);
      return { id };
    },
  },
  billing: {
    async get(organizationId: string) {
      // TODO: Replace mock data with GET /v1/organizations/:id/billing.
      return { billingPlans, invoices, currentPlan: getOrganizationOrThrow(organizationId).plan };
    },
  },
  docs: {
    async list() {
      // TODO: Replace mock data with GET /v1/docs.
      return docsSections;
    },
  },
  models: {
    async list(projectId: string) {
      // TODO: Replace mock data with GET /v1/projects/:id/models.
      const project = getProjectOrThrow(projectId);
      return models.map((model) => ({
        ...model,
        enabled: project.modelsEnabled.includes(model.name),
      }));
    },
  },
  playground: {
    async run(projectId: string, model: string) {
      // TODO: Replace mock data with POST /v1/projects/:id/playground/runs.
      const project = getProjectOrThrow(projectId);
      return `Mock response from ${model} in ${project.name}: start with authentication, validate the request contract, instrument usage, document errors, and invite a teammate to review production access.`;
    },
  },
};

export const apiClient = api;
