import { describe, expect, it } from "vitest";
import {
  canViewProviderOperations,
  countProvidersByStatus,
  extractOpsOverview,
  extractOpsSeries,
  filterModelRows,
  normalizeProviderStatus,
  providerStatusLabel,
  redactSensitiveText,
  sanitizeOperationsRecord,
} from "../operationsGuards";

describe("operationsGuards", () => {
  it("limits provider operations to owners, admins, and platform ops roles", () => {
    expect(canViewProviderOperations(["owner"])).toBe(true);
    expect(canViewProviderOperations(["admin"])).toBe(true);
    expect(canViewProviderOperations(["platform_ops"])).toBe(true);
    expect(canViewProviderOperations(["operations"])).toBe(true);
    expect(canViewProviderOperations(["maintainer"])).toBe(false);
    expect(canViewProviderOperations(["member"])).toBe(false);
  });

  it("normalizes known and unknown provider statuses", () => {
    expect(normalizeProviderStatus("healthy")).toBe("healthy");
    expect(normalizeProviderStatus("OK")).toBe("healthy");
    expect(normalizeProviderStatus("degraded")).toBe("degraded");
    expect(normalizeProviderStatus("down")).toBe("offline");
    expect(normalizeProviderStatus("disabled")).toBe("disabled");
    expect(normalizeProviderStatus("weird-state")).toBe("unknown");
    expect(normalizeProviderStatus(null)).toBe("unknown");
    expect(providerStatusLabel("unknown")).toBe("Unknown");
  });

  it("extracts overview metrics and chart points without inventing values", () => {
    expect(
      extractOpsOverview({
        totalRequests: "100",
        requestsPerMinute: 2,
        successRate: 0.99,
        errorRate: 0.01,
        averageLatency: 80,
        p95Latency: 120,
        activeProviders: 3,
        degradedProviders: 1,
        offlineProviders: 0,
        fallbackRate: 0.05,
      })
    ).toMatchObject({
      totalRequests: 100,
      requestsPerMinute: 2,
      p95Latency: 120,
      fallbackRate: 0.05,
    });

    expect(extractOpsSeries({ latencyTrend: [{ day: "Mon", value: 40 }] }, ["latencyTrend"])).toEqual([{ label: "Mon", value: 40 }]);
    expect(extractOpsSeries({}, ["latencyTrend"])).toEqual([]);
  });

  it("counts provider statuses and filters model rows", () => {
    expect(
      countProvidersByStatus([
        { status: "healthy" },
        { health: "degraded" },
        { state: "offline" },
        { status: "mystery" },
      ])
    ).toEqual({ healthy: 1, degraded: 1, offline: 1, disabled: 0, unknown: 1 });

    const filtered = filterModelRows(
      [
        { model: "llama", provider: "groq", status: "healthy", streaming: true },
        { model: "gpt", provider: "openrouter", status: "degraded", streaming: false },
      ],
      { provider: "groq", search: "lla", capability: "true" }
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].model).toBe("llama");
  });

  it("redacts secrets, hosts, URLs, and sensitive operations fields", () => {
    const sanitized = sanitizeOperationsRecord({
      provider: "groq",
      apiKey: "gsk_secretvalue",
      baseUrl: "https://internal.example",
      host: "10.0.0.8",
      prompt: "hidden",
      stackTrace: "boom",
      summary: "failed for sk_live_abcdefghijklmnop at http://localhost:11434",
    });

    expect(sanitized).toEqual({
      provider: "groq",
      summary: "failed for [redacted] at [redacted-url]",
    });
    expect(redactSensitiveText("Bearer abc.def.ghi")).toBe("Bearer [redacted]");
    expect(JSON.stringify(sanitized)).not.toContain("gsk_secretvalue");
    expect(JSON.stringify(sanitized)).not.toContain("internal.example");
  });
});
