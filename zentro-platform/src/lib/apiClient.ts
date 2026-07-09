import {
  apiKeys,
  billingPlans,
  dashboardMetrics,
  docsSections,
  invoices,
  models,
  organization,
  settings,
  teamMembers,
  tokensByModel,
  usageByDay,
  usageEvents,
} from "../data/mockData";

export const apiClient = {
  async getDashboard() {
    // TODO: Replace mock data with GET /v1/platform/dashboard.
    return { organization, dashboardMetrics, usageEvents };
  },
  async getApiKeys() {
    // TODO: Replace mock data with GET /v1/platform/api-keys.
    return apiKeys;
  },
  async getUsage() {
    // TODO: Replace mock data with GET /v1/platform/usage.
    return { usageByDay, tokensByModel };
  },
  async getBilling() {
    // TODO: Replace mock data with GET /v1/platform/billing.
    return { billingPlans, invoices, currentPlan: organization.currentPlan };
  },
  async getModels() {
    // TODO: Replace mock data with GET /v1/platform/models.
    return models;
  },
  async getDocs() {
    // TODO: Replace mock data with GET /v1/platform/docs.
    return docsSections;
  },
  async getTeam() {
    // TODO: Replace mock data with GET /v1/platform/team.
    return teamMembers;
  },
  async getSettings() {
    // TODO: Replace mock data with GET /v1/platform/settings.
    return settings;
  },
};
