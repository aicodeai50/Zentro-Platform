import { describe, expect, it, vi } from "vitest";
import {
  canManageProjectMembers,
  canRemoveProjectMember,
  confirmWebhookDeletion,
  emptyBillingState,
  getWebhookSigningSecret,
  sanitizeLogRecord,
  validateWebhookUrl,
} from "../phaseDGuards";

describe("Phase D safety guards", () => {
  it("redacts private log fields and secret-like values", () => {
    const sanitized = sanitizeLogRecord({
      requestId: "req1",
      prompt: "hidden prompt",
      response: "hidden response",
      apiKey: "sk_hidden",
      provider: "provider sk_secret",
      status: "success",
    });

    expect(sanitized).toEqual({
      requestId: "req1",
      provider: "provider [redacted]",
      status: "success",
    });
    expect(JSON.stringify(sanitized)).not.toContain("hidden prompt");
    expect(JSON.stringify(sanitized)).not.toContain("hidden response");
    expect(JSON.stringify(sanitized)).not.toContain("sk_secret");
  });

  it("extracts one-time webhook signing secrets without requiring storage", () => {
    expect(getWebhookSigningSecret({ signingSecret: "whsec_once" })).toBe("whsec_once");
    expect(getWebhookSigningSecret({ id: "wh1" })).toBeNull();
  });

  it("requires deletion confirmation before removing webhooks", () => {
    const confirm = vi.fn(() => true);

    expect(confirmWebhookDeletion(confirm)).toBe(true);
    expect(confirm).toHaveBeenCalledWith("Delete this webhook? Event deliveries to this endpoint will stop.");
  });

  it("enforces HTTPS webhook URLs in production", () => {
    expect(validateWebhookUrl("http://example.test/hook", true)).toBe("Webhook URLs must use HTTPS in production.");
    expect(validateWebhookUrl("https://example.test/hook", true)).toBeNull();
  });

  it("protects the last project owner", () => {
    expect(canRemoveProjectMember([{ id: "owner-1", role: "owner" }], "owner-1")).toBe(false);
    expect(canRemoveProjectMember([{ id: "owner-1", role: "owner" }, { id: "owner-2", role: "owner" }], "owner-1")).toBe(true);
    expect(canRemoveProjectMember([{ id: "member-1", role: "developer" }], "member-1")).toBe(true);
  });

  it("respects owner and maintainer permissions for member management", () => {
    expect(canManageProjectMembers(["viewer"])).toBe(false);
    expect(canManageProjectMembers(["maintainer"])).toBe(true);
    expect(canManageProjectMembers(["owner"])).toBe(true);
  });

  it("renders empty billing states without fabricated records", () => {
    expect(emptyBillingState({})).toBe("No billing records returned by backend.");
    expect(emptyBillingState([])).toBe("No billing records returned by backend.");
    expect(emptyBillingState({ credits: 10 })).toEqual({ credits: 10 });
  });
});
