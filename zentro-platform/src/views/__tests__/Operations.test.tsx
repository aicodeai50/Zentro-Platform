import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Operations } from "../Operations";

const sessionMock = vi.hoisted(() => ({
  roles: ["owner"] as string[],
}));

const resourceState = vi.hoisted(() => ({
  mode: "loaded" as "loading" | "loaded" | "unauthorized" | "unavailable" | "empty-fallbacks" | "empty-incidents" | "partial",
}));

vi.mock("../../lib/appSession", () => ({
  useAppSession: () => ({
    apiContext: { workspaceId: "workspace-1", projectId: "project-1" },
    bootstrap: { roles: sessionMock.roles },
  }),
}));

vi.mock("../../lib/useApiResource", () => ({
  useApiResource: (_load: unknown, _deps?: unknown[], options?: { pollKey?: number }) => {
    void options;

    if (resourceState.mode === "loading") {
      return { state: "loading", reload: vi.fn() };
    }

    if (resourceState.mode === "unauthorized") {
      return {
        state: "loaded",
        reload: vi.fn(),
        result: { status: "unauthorized", endpoint: "/v1/operations/summary", statusCode: 401, message: "Login required." },
      };
    }

    if (resourceState.mode === "unavailable") {
      return {
        state: "loaded",
        reload: vi.fn(),
        result: { status: "backend-unavailable", endpoint: "/v1/operations/summary", statusCode: 503, message: "Backend unavailable." },
      };
    }

    const success = (endpoint: string, data: unknown) => ({
      state: "loaded" as const,
      reload: vi.fn(),
      result: { status: "success" as const, endpoint, data },
    });

    if (resourceState.mode === "empty-fallbacks") {
      return {
        state: "loaded",
        reload: vi.fn(),
        result: { status: "capability-required", endpoint: "/v1/operations/fallbacks", statusCode: 501, message: "Backend capability unavailable." },
      };
    }

    if (resourceState.mode === "empty-incidents") {
      return {
        state: "loaded",
        reload: vi.fn(),
        result: { status: "capability-required", endpoint: "/v1/operations/incidents", statusCode: 404, message: "Backend capability unavailable." },
      };
    }

    return success("/v1/operations/summary", {
      totalRequests: 50,
      requestsPerMinute: 1,
      successRate: 0.98,
      errorRate: 0.02,
      averageLatency: 90,
      p95Latency: 140,
      activeProviders: 2,
      degradedProviders: 1,
      offlineProviders: 0,
      fallbackRate: 0.1,
      providers: [{ name: "groq", status: "healthy", enabled: true, requests: 20, averageLatency: 80, successRate: 0.99 }],
      models: [{ model: "llama-3", provider: "groq", availability: "healthy", streaming: true, requestCount: 20 }],
      fallbacks: [{ requestId: "req-1", reasonCode: "timeout", originalProvider: "groq", fallbackProvider: "openrouter", finalOutcome: "success", totalLatency: 200, timestamp: "2026-07-01T00:00:00Z" }],
      byProvider: [{ provider: "groq", count: 2, code: "timeout" }],
      byModel: [{ model: "llama-3", count: 1, code: "timeout" }],
      byCode: [{ code: "timeout", count: 2 }],
      timeoutCount: 2,
      rateLimitCount: 0,
      authenticationFailureCount: 0,
      providerUnavailableCount: 1,
      incidents: [{ id: "inc-1", provider: "groq", severity: "warning", status: "open", summary: "Elevated latency", startedAt: "2026-07-01T00:00:00Z" }],
      status: "ok",
      version: "1.0.0",
      uptime: 1000,
    });
  },
}));

vi.mock("../../lib/zentroApi", () => ({
  zentroApi: {
    operations: {
      summary: vi.fn(),
      providers: vi.fn(),
      provider: vi.fn(),
      models: vi.fn(),
      fallbacks: vi.fn(),
      errors: vi.fn(),
      incidents: vi.fn(),
    },
    usage: { summary: vi.fn(), providers: vi.fn(), models: vi.fn() },
    ai: { providers: vi.fn(), localModels: vi.fn() },
    health: { application: vi.fn() },
  },
}));

describe("Operations dashboard", () => {
  beforeEach(() => {
    sessionMock.roles = ["owner"];
    resourceState.mode = "loaded";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  });

  afterEach(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  });

  it("renders overview, provider health statuses, and model filters", () => {
    render(<Operations />);

    expect(screen.getByText("Provider operations")).toBeInTheDocument();
    expect(screen.getByText("Total requests")).toBeInTheDocument();
    expect(screen.getAllByText("Provider health").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Provider status: Healthy").length).toBeGreaterThan(0);
    expect(screen.getByText("Model operations filters")).toBeInTheDocument();
    expect(screen.getByLabelText("Refresh operations data")).toBeInTheDocument();
    expect(screen.getByText(/Last updated/)).toBeInTheDocument();
  });

  it("hides operations for members", () => {
    sessionMock.roles = ["member"];
    render(<Operations />);
    expect(screen.getByText("Insufficient role for provider operations")).toBeInTheDocument();
  });

  it("shows loading, unauthorized, and backend-unavailable states", () => {
    resourceState.mode = "loading";
    const { rerender } = render(<Operations />);
    expect(screen.getAllByText("Loading").length).toBeGreaterThan(0);

    resourceState.mode = "unauthorized";
    rerender(<Operations />);
    expect(screen.getAllByText("Access denied").length).toBeGreaterThan(0);

    resourceState.mode = "unavailable";
    rerender(<Operations />);
    expect(screen.getAllByText("Backend unavailable").length).toBeGreaterThan(0);
  });

  it("shows honest unavailable states for fallbacks and incidents", () => {
    resourceState.mode = "empty-fallbacks";
    const { rerender } = render(<Operations />);
    expect(screen.getAllByText("Backend capability required").length).toBeGreaterThan(0);

    resourceState.mode = "empty-incidents";
    rerender(<Operations />);
    expect(screen.getAllByText("Backend capability required").length).toBeGreaterThan(0);
  });

  it("supports range selection and auto-refresh toggle", () => {
    render(<Operations />);

    fireEvent.change(screen.getByLabelText("Range"), { target: { value: "7d" } });
    expect((screen.getByLabelText("Range") as HTMLSelectElement).value).toBe("7d");

    const toggle = screen.getByLabelText("Auto-refresh every 45 seconds") as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);
  });
});
