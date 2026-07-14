const hiddenLogFields = new Set(["prompt", "prompts", "response", "responses", "completion", "messages", "apiKey", "api_key", "key", "secret"]);

export function sanitizeLogRecord(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => !hiddenLogFields.has(key))
      .map(([key, value]) => [key, typeof value === "string" ? redactSecretLikeText(value) : value])
  );
}

export function redactSecretLikeText(value: string) {
  return value.replace(/(?:sk|pk|whsec|zentro)_[A-Za-z0-9_-]+/g, "[redacted]");
}

export function getWebhookSigningSecret(value: Record<string, unknown>) {
  const secret = value.signingSecret ?? value.secret;
  return typeof secret === "string" && secret ? secret : null;
}

export function validateWebhookUrl(url: string, isProduction = process.env.NODE_ENV === "production") {
  if (!url) {
    return "Webhook URL is required.";
  }

  if (isProduction && !url.startsWith("https://")) {
    return "Webhook URLs must use HTTPS in production.";
  }

  return null;
}

export function confirmWebhookDeletion(confirmFn: (message: string) => boolean = window.confirm) {
  return confirmFn("Delete this webhook? Event deliveries to this endpoint will stop.");
}

export function emptyBillingState(value: unknown) {
  if (Array.isArray(value) && value.length === 0) {
    return "No billing records returned by backend.";
  }

  if (value && typeof value === "object" && Object.keys(value).length === 0) {
    return "No billing records returned by backend.";
  }

  return value;
}

export function canManageProjectMembers(roles: string[] = []) {
  return roles.some((role) => ["owner", "maintainer"].includes(role.toLowerCase()));
}

export function canRemoveProjectMember(members: Array<{ id?: string; role?: string }>, memberId: string) {
  const member = members.find((item) => item.id === memberId);

  if (member?.role?.toLowerCase() !== "owner") {
    return true;
  }

  const ownerCount = members.filter((item) => item.role?.toLowerCase() === "owner").length;
  return ownerCount > 1;
}

export function normalizeBackendList<T extends Record<string, unknown>>(value: unknown, keys: string[]) {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;

  for (const key of keys) {
    if (Array.isArray(record[key])) {
      return record[key] as T[];
    }
  }

  return [];
}
