import type { ApiResult } from "./zentroApi";
import { extractRows, extractSeries, formatMetricValue, formatPercent, toNumber, type ChartPoint } from "./usageGuards";

export type OpsRange = "1h" | "24h" | "7d" | "30d";

export type ProviderHealthStatus = "healthy" | "degraded" | "offline" | "disabled" | "unknown";

export type OpsOverviewMetrics = {
  totalRequests: number | null;
  requestsPerMinute: number | null;
  successRate: number | null;
  errorRate: number | null;
  averageLatency: number | null;
  p95Latency: number | null;
  activeProviders: number | null;
  degradedProviders: number | null;
  offlineProviders: number | null;
  fallbackRate: number | null;
};

const operationsRoles = new Set([
  "owner",
  "admin",
  "platform_ops",
  "platform-ops",
  "platform_operations",
  "platform-operations",
  "operations",
  "ops",
]);

export function canViewProviderOperations(roles: string[] = []) {
  return roles.some((role) => operationsRoles.has(role.toLowerCase()));
}

export function normalizeProviderStatus(value: unknown): ProviderHealthStatus {
  if (typeof value !== "string" || !value.trim()) {
    return "unknown";
  }

  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-");

  if (["healthy", "ok", "up", "online", "active", "ready"].includes(normalized)) {
    return "healthy";
  }

  if (["degraded", "partial", "slow", "warning", "unstable"].includes(normalized)) {
    return "degraded";
  }

  if (["offline", "down", "unreachable", "unavailable", "error", "failed"].includes(normalized)) {
    return "offline";
  }

  if (["disabled", "inactive", "off", "paused"].includes(normalized)) {
    return "disabled";
  }

  return "unknown";
}

export function providerStatusLabel(status: ProviderHealthStatus) {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "offline":
      return "Offline";
    case "disabled":
      return "Disabled";
    default:
      return "Unknown";
  }
}

export function providerStatusTone(status: ProviderHealthStatus): "success" | "warning" | "danger" | "neutral" | "info" {
  switch (status) {
    case "healthy":
      return "success";
    case "degraded":
      return "warning";
    case "offline":
      return "danger";
    case "disabled":
      return "neutral";
    default:
      return "info";
  }
}

export function opsRangeToQuery(range: OpsRange) {
  return { range };
}

export function extractOpsOverview(data: unknown): OpsOverviewMetrics {
  const record = asRecord(data);

  return {
    totalRequests: firstNumber(record, ["totalRequests", "requests", "requestCount"]),
    requestsPerMinute: firstNumber(record, ["requestsPerMinute", "rpm", "requests_per_minute"]),
    successRate: firstNumber(record, ["successRate", "success_rate"]),
    errorRate: firstNumber(record, ["errorRate", "error_rate"]),
    averageLatency: firstNumber(record, ["averageLatency", "avgLatency", "latency", "latencyMs"]),
    p95Latency: firstNumber(record, ["p95Latency", "latencyP95", "p95", "p95_latency"]),
    activeProviders: firstNumber(record, ["activeProviders", "healthyProviders", "providersHealthy"]),
    degradedProviders: firstNumber(record, ["degradedProviders", "providersDegraded"]),
    offlineProviders: firstNumber(record, ["offlineProviders", "providersOffline"]),
    fallbackRate: firstNumber(record, ["fallbackRate", "fallback_rate"]),
  };
}

export function extractProviderRows(data: unknown) {
  const rows = extractRows(data, ["providers", "items", "data"]);
  if (rows.length) {
    return rows.map(sanitizeOperationsRecord);
  }

  const record = asRecord(data);
  const nested = record.providers;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return Object.entries(nested as Record<string, unknown>).map(([name, value]) =>
      sanitizeOperationsRecord({
        name,
        provider: name,
        ...(asRecord(value) as Record<string, unknown>),
      })
    );
  }

  return [];
}

export function extractModelRows(data: unknown) {
  return extractRows(data, ["models", "localModels", "items", "data"]).map(sanitizeOperationsRecord);
}

export function extractFallbackRows(data: unknown) {
  return extractRows(data, ["fallbacks", "events", "items", "data"]).map(sanitizeOperationsRecord);
}

export function extractErrorRows(data: unknown) {
  return extractRows(data, ["errors", "items", "data", "byProvider", "byModel", "byCode"]).map(sanitizeOperationsRecord);
}

export function extractIncidentRows(data: unknown) {
  return extractRows(data, ["incidents", "items", "data"]).map(sanitizeOperationsRecord);
}

export function extractOpsSeries(data: unknown, keys: string[]): ChartPoint[] {
  return extractSeries(data, keys);
}

export function countProvidersByStatus(rows: Record<string, unknown>[]) {
  const counts = { healthy: 0, degraded: 0, offline: 0, disabled: 0, unknown: 0 };

  for (const row of rows) {
    const status = normalizeProviderStatus(row.status ?? row.health ?? row.state);
    counts[status] += 1;
  }

  return counts;
}

export function formatOpsMetric(value: unknown, suffix = "") {
  return formatMetricValue(value, suffix);
}

export function formatOpsPercent(value: unknown) {
  return formatPercent(value);
}

export function formatTimestamp(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Not returned";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function sanitizeOperationsRecord(record: Record<string, unknown>) {
  const blockedExact = new Set([
    "prompt",
    "prompts",
    "response",
    "responses",
    "messages",
    "authorization",
    "authorizationHeader",
    "apiKey",
    "api_key",
    "secret",
    "token",
    "accessToken",
    "connectionString",
    "connection_string",
    "baseUrl",
    "base_url",
    "endpointUrl",
    "internalUrl",
    "hostname",
    "host",
    "stack",
    "stackTrace",
    "requestBody",
    "body",
    "rawError",
    "headers",
  ]);

  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => {
        const lower = key.toLowerCase();
        if (blockedExact.has(key) || blockedExact.has(lower)) {
          return false;
        }

        if (lower.includes("secret") || lower.includes("password") || lower.includes("apikey")) {
          return false;
        }

        if (lower.includes("connection") && lower.includes("string")) {
          return false;
        }

        return true;
      })
      .map(([key, value]) => [key, sanitizeOperationsValue(value)])
  );
}

export function sanitizeOperationsValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactSensitiveText(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeOperationsValue);
  }

  if (value && typeof value === "object") {
    return sanitizeOperationsRecord(value as Record<string, unknown>);
  }

  return value;
}

export function redactSensitiveText(value: string) {
  return value
    .replace(/(?:sk|pk|whsec|zentro|zt|gsk)_[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/https?:\/\/[^\s"'<>]+/gi, "[redacted-url]")
    .replace(/\b(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(?::\d+)?\b/gi, "[redacted-host]");
}

export async function firstSuccessfulResult<T>(loaders: Array<() => Promise<ApiResult<T>>>): Promise<ApiResult<T>> {
  let lastResult: ApiResult<T> | null = null;

  for (const loader of loaders) {
    const result = await loader();
    lastResult = result;

    if (result.status === "success") {
      return result;
    }

    if (result.status !== "capability-required") {
      return result;
    }
  }

  return (
    lastResult ?? {
      status: "capability-required",
      endpoint: "/v1/operations",
      statusCode: 501,
      message: "Backend capability required",
    }
  );
}

export function filterModelRows(
  rows: Record<string, unknown>[],
  filters: { provider?: string; status?: string; capability?: string; search?: string }
) {
  const provider = filters.provider?.trim().toLowerCase() ?? "";
  const status = filters.status?.trim().toLowerCase() ?? "";
  const capability = filters.capability?.trim().toLowerCase() ?? "";
  const search = filters.search?.trim().toLowerCase() ?? "";

  return rows.filter((row) => {
    const rowProvider = String(row.provider ?? row.providerName ?? "").toLowerCase();
    const rowStatus = normalizeProviderStatus(row.status ?? row.availability ?? row.available);
    const rowName = String(row.model ?? row.name ?? row.canonicalName ?? "").toLowerCase();
    const capabilities = String(row.capability ?? row.capabilities ?? row.streaming ?? "").toLowerCase();

    if (provider && !rowProvider.includes(provider)) {
      return false;
    }

    if (status && rowStatus !== status && String(row.status ?? "").toLowerCase() !== status) {
      return false;
    }

    if (capability && !capabilities.includes(capability)) {
      return false;
    }

    if (search && !rowName.includes(search) && !rowProvider.includes(search)) {
      return false;
    }

    return true;
  });
}

export { toNumber };

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toNumber(record[key]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}
