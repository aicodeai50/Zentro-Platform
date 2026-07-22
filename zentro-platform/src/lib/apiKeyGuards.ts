import type { ApiKeyActionResult, ApiKeyMetadata } from "./zentroApi";

const apiKeyManagers = new Set(["owner", "admin", "maintainer"]);

export function canManageApiKeys(roles: string[] = []) {
  return roles.some((role) => apiKeyManagers.has(role.toLowerCase()));
}

export function getApiKeyStatus(key: ApiKeyMetadata, now = new Date()) {
  if (key.revokedAt || key.status?.toLowerCase() === "revoked") {
    return "revoked";
  }

  if (key.expiresAt && new Date(key.expiresAt).getTime() <= now.getTime()) {
    return "expired";
  }

  return key.status ?? "active";
}

export function extractPlaintextApiKey(result: ApiKeyActionResult) {
  const nestedKey = result.key && typeof result.key === "object" ? (result.key as Record<string, unknown>) : null;
  const nestedApiKey = result.apiKey && typeof result.apiKey === "object" ? (result.apiKey as Record<string, unknown>) : null;
  const value =
    result.plaintextKey ??
    result.secret ??
    result.token ??
    result.value ??
    nestedKey?.plaintextKey ??
    nestedKey?.secret ??
    nestedKey?.token ??
    nestedApiKey?.plaintextKey ??
    nestedApiKey?.secret ??
    nestedApiKey?.token;

  return typeof value === "string" && value ? value : null;
}

export function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
