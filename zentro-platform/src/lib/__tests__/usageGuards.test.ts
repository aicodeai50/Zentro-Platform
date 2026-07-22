import { describe, expect, it } from "vitest";
import {
  canViewOrganizationBilling,
  canViewProjectUsage,
  estimatedRemainingCredits,
  extractMetricSnapshot,
  extractSeries,
  formatDelta,
  rangeToQuery,
  sanitizeUsageRecord,
  usagePercentage,
} from "../usageGuards";

describe("usageGuards", () => {
  it("limits organization billing to owners and admins", () => {
    expect(canViewOrganizationBilling(["owner"])).toBe(true);
    expect(canViewOrganizationBilling(["admin"])).toBe(true);
    expect(canViewOrganizationBilling(["maintainer"])).toBe(false);
    expect(canViewOrganizationBilling(["member"])).toBe(false);
  });

  it("allows project usage for common workspace roles", () => {
    expect(canViewProjectUsage(["maintainer"])).toBe(true);
    expect(canViewProjectUsage(["member"])).toBe(true);
    expect(canViewProjectUsage(["guest"])).toBe(false);
  });

  it("normalizes metric snapshots and previous-period deltas", () => {
    const snapshot = extractMetricSnapshot({
      requestsToday: "12",
      requestsThisMonth: 100,
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: "30",
      creditsSpent: 4,
      averageLatency: 120,
      successRate: 0.95,
      errorCount: 2,
      previousPeriod: { requests: 80, tokens: 25, credits: 3, latency: 140, successRate: 0.9, errors: 5 },
    });

    expect(snapshot.requestsToday).toBe(12);
    expect(snapshot.totalTokens).toBe(30);
    expect(snapshot.previousPeriod?.requestsThisMonth).toBe(80);
    expect(formatDelta(100, 80)).toBe("+20 vs previous");
  });

  it("transforms chart series without inventing points", () => {
    expect(extractSeries({ requestsByDay: [{ day: "Mon", count: 3 }, { day: "Tue", value: 5 }] }, ["requestsByDay"])).toEqual([
      { label: "Mon", value: 3 },
      { label: "Tue", value: 5 },
    ]);
    expect(extractSeries({}, ["requestsByDay"])).toEqual([]);
  });

  it("computes billing percentages and remaining credits", () => {
    expect(usagePercentage(25, 100)).toBe(25);
    expect(usagePercentage(10, 0)).toBeNull();
    expect(estimatedRemainingCredits(40, 10, 100)).toBe(40);
    expect(estimatedRemainingCredits(null, 25, 100)).toBe(75);
  });

  it("maps ranges and custom dates into query params", () => {
    expect(rangeToQuery("7d")).toEqual({ range: "7d" });
    expect(rangeToQuery("custom", "2026-01-01", "2026-01-31")).toEqual({
      range: "custom",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
  });

  it("strips secrets, hashes, prompts, and plaintext keys from usage rows", () => {
    const sanitized = sanitizeUsageRecord({
      id: "req-1",
      apiKeyPrefix: "zt_abc",
      apiKey: "zt_secret_should_hide",
      hash: "abc123",
      prompt: "hidden",
      authorization: "Bearer secret",
      body: { text: "nope" },
      note: "zt_live_abcdefghijklmnopqrstuvwxyz",
    });

    expect(sanitized).toEqual({
      id: "req-1",
      apiKeyPrefix: "zt_abc",
      note: "[redacted]",
    });
    expect(JSON.stringify(sanitized)).not.toContain("zt_secret_should_hide");
    expect(JSON.stringify(sanitized)).not.toContain("hidden");
  });
});
