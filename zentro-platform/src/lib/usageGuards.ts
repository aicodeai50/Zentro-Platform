import type { ApiResult } from "./zentroApi";

export type UsageRange = "24h" | "7d" | "30d" | "billing_period" | "custom";

export type ChartPoint = {
  label: string;
  value: number;
};

export type UsageMetricSnapshot = {
  requestsToday?: number | null;
  requestsThisMonth?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  creditsSpent?: number | null;
  averageLatency?: number | null;
  successRate?: number | null;
  errorCount?: number | null;
  previousPeriod?: Record<string, number | null | undefined>;
};

const billingRoles = new Set(["owner", "admin"]);
const projectUsageRoles = new Set(["owner", "admin", "maintainer", "developer", "member", "viewer"]);

export function canViewOrganizationBilling(roles: string[] = []) {
  return roles.some((role) => billingRoles.has(role.toLowerCase()));
}

export function canViewProjectUsage(roles: string[] = []) {
  return roles.some((role) => projectUsageRoles.has(role.toLowerCase()));
}

export function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return null;
}

export function formatMetricValue(value: unknown, suffix = "") {
  const numeric = toNumber(value);
  if (numeric === null) {
    return "Not returned";
  }

  return `${numeric.toLocaleString()}${suffix}`;
}

export function formatPercent(value: unknown) {
  const numeric = toNumber(value);
  if (numeric === null) {
    return "Not returned";
  }

  const normalized = numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
  return `${normalized.toFixed(1)}%`;
}

export function formatDelta(current: unknown, previous: unknown) {
  const currentValue = toNumber(current);
  const previousValue = toNumber(previous);

  if (currentValue === null || previousValue === null) {
    return "No comparison";
  }

  const delta = currentValue - previousValue;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toLocaleString()} vs previous`;
}

export function usagePercentage(used: unknown, limit: unknown) {
  const usedValue = toNumber(used);
  const limitValue = toNumber(limit);

  if (usedValue === null || limitValue === null || limitValue <= 0) {
    return null;
  }

  return Math.min(100, (usedValue / limitValue) * 100);
}

export function estimatedRemainingCredits(balance: unknown, used: unknown, limit: unknown) {
  const balanceValue = toNumber(balance);
  if (balanceValue !== null) {
    return balanceValue;
  }

  const usedValue = toNumber(used);
  const limitValue = toNumber(limit);
  if (usedValue === null || limitValue === null) {
    return null;
  }

  return Math.max(0, limitValue - usedValue);
}

export function extractMetricSnapshot(data: unknown): UsageMetricSnapshot {
  const record = asRecord(data);
  const previous = asRecord(record.previousPeriod ?? record.previous ?? record.comparison);

  return {
    requestsToday: firstNumber(record, ["requestsToday", "requests_today", "todayRequests"]),
    requestsThisMonth: firstNumber(record, ["requestsThisMonth", "requests_this_month", "monthRequests", "requests"]),
    inputTokens: firstNumber(record, ["inputTokens", "input_tokens", "promptTokens"]),
    outputTokens: firstNumber(record, ["outputTokens", "output_tokens", "completionTokens"]),
    totalTokens: firstNumber(record, ["totalTokens", "total_tokens", "tokens"]),
    creditsSpent: firstNumber(record, ["creditsSpent", "credits_spent", "credits", "spend"]),
    averageLatency: firstNumber(record, ["averageLatency", "avgLatency", "latency", "latencyMs"]),
    successRate: firstNumber(record, ["successRate", "success_rate"]),
    errorCount: firstNumber(record, ["errorCount", "errors", "failedRequests"]),
    previousPeriod: {
      requestsThisMonth: firstNumber(previous, ["requestsThisMonth", "requests", "monthRequests"]),
      totalTokens: firstNumber(previous, ["totalTokens", "tokens"]),
      creditsSpent: firstNumber(previous, ["creditsSpent", "credits"]),
      averageLatency: firstNumber(previous, ["averageLatency", "latency"]),
      successRate: firstNumber(previous, ["successRate"]),
      errorCount: firstNumber(previous, ["errorCount", "errors"]),
    },
  };
}

export function extractSeries(data: unknown, keys: string[]): ChartPoint[] {
  const record = asRecord(data);

  for (const key of keys) {
    const series = record[key];
    if (Array.isArray(series)) {
      return series
        .map((item, index) => {
          const point = asRecord(item);
          const label = String(point.label ?? point.day ?? point.date ?? point.timestamp ?? `Point ${index + 1}`);
          const value = firstNumber(point, ["value", "count", "requests", "tokens", "credits", "latency", "failed", "success"]) ?? 0;
          return { label, value };
        })
        .filter((point) => point.label);
    }
  }

  return [];
}

export function extractRows(data: unknown, keys: string[]) {
  if (Array.isArray(data)) {
    return data.map(asRecord);
  }

  const record = asRecord(data);
  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return (record[key] as unknown[]).map(asRecord);
    }
  }

  return [];
}

export function sanitizeUsageRecord(record: Record<string, unknown>) {
  const blocked = new Set([
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
    "hash",
    "plaintextKey",
    "body",
    "requestBody",
  ]);

  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !blocked.has(key) && !key.toLowerCase().includes("secret") && !key.toLowerCase().includes("hash"))
      .map(([key, value]) => {
        if (key === "apiKeyPrefix" || key === "prefix" || key === "keyPrefix") {
          return [key, typeof value === "string" ? value : "Not returned"];
        }

        if (typeof value === "string" && /(?:sk|pk|whsec|zentro|zt)_[A-Za-z0-9_-]{12,}/.test(value)) {
          return [key, "[redacted]"];
        }

        return [key, value];
      })
  );
}

export function rangeToQuery(range: UsageRange, customStart = "", customEnd = "") {
  if (range === "custom") {
    return {
      range,
      startDate: customStart || undefined,
      endDate: customEnd || undefined,
    };
  }

  return { range };
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
      endpoint: "/v1/usage",
      statusCode: 501,
      message: "Backend capability required",
    }
  );
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toNumber(record[key]);
    if (value !== null) {
      return value;
    }

    const nested = record[key];
    if (nested && typeof nested === "object") {
      const nestedRecord = nested as Record<string, unknown>;
      const nestedValue = toNumber(nestedRecord.total ?? nestedRecord.count ?? nestedRecord.value);
      if (nestedValue !== null) {
        return nestedValue;
      }
    }
  }

  return null;
}
