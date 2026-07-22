import { describe, expect, it } from "vitest";
import {
  canManageApiKeys,
  extractPlaintextApiKey,
  getApiKeyStatus,
  parseOptionalNumber,
  splitCsv,
} from "../apiKeyGuards";

describe("API key guards", () => {
  it("allows only owner, admin, and maintainer permissions", () => {
    expect(canManageApiKeys(["viewer"])).toBe(false);
    expect(canManageApiKeys(["developer"])).toBe(false);
    expect(canManageApiKeys(["owner"])).toBe(true);
    expect(canManageApiKeys(["admin"])).toBe(true);
    expect(canManageApiKeys(["maintainer"])).toBe(true);
  });

  it("derives active, expired, and revoked statuses", () => {
    expect(getApiKeyStatus({ status: "active" }, new Date("2026-01-01"))).toBe("active");
    expect(getApiKeyStatus({ expiresAt: "2025-12-31" }, new Date("2026-01-01"))).toBe("expired");
    expect(getApiKeyStatus({ revokedAt: "2026-01-01T00:00:00.000Z" }, new Date("2026-01-02"))).toBe("revoked");
    expect(getApiKeyStatus({ status: "revoked" }, new Date("2026-01-02"))).toBe("revoked");
  });

  it("extracts one-time plaintext keys without inventing storage", () => {
    expect(extractPlaintextApiKey({ plaintextKey: "zt_plain" })).toBe("zt_plain");
    expect(extractPlaintextApiKey({ secret: "zt_secret" })).toBe("zt_secret");
    expect(extractPlaintextApiKey({ key: { token: "zt_token" } })).toBe("zt_token");
    expect(extractPlaintextApiKey({})).toBeNull();
  });

  it("parses restriction form values", () => {
    expect(splitCsv(" a, b , ,c ")).toEqual(["a", "b", "c"]);
    expect(parseOptionalNumber("")).toBeNull();
    expect(parseOptionalNumber("42")).toBe(42);
    expect(parseOptionalNumber("nope")).toBeNull();
  });
});
