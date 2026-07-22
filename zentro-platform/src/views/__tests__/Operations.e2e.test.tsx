import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Operations } from "../Operations";

const apiMocks = vi.hoisted(() => ({
  summary: vi.fn(),
  providers: vi.fn(),
  provider: vi.fn(),
  models: vi.fn(),
  fallbacks: vi.fn(),
  errors: vi.fn(),
  incidents: vi.fn(),
  usageSummary: vi.fn(),
  usageProviders: vi.fn(),
  usageModels: vi.fn(),
  aiProviders: vi.fn(),
  localModels: vi.fn(),
  health: vi.fn(),
}));

const sessionMock = vi.hoisted(() => ({
  roles: ["admin"] as string[],
}));

vi.mock("../../lib/appSession", () => ({
  useAppSession: () => ({
    apiContext: { workspaceId: "workspace-1", projectId: "project-1" },
    bootstrap: { roles: sessionMock.roles },
  }),
}));

vi.mock("../../lib/useApiResource", async () => {
  const React = await import("react");
  return {
    useApiResource: (load: () => Promise<unknown>, dependencies: unknown[] = [], options?: { pollKey?: number }) => {
      const [resource, setResource] = React.useState<{ state: "loading" } | { state: "loaded"; result: unknown }>({ state: "loading" });
      const [reloadToken, setReloadToken] = React.useState(0);
      const pollKey = options?.pollKey ?? 0;

      React.useEffect(() => {
        let current = true;
        setResource({ state: "loading" });
        void load().then((result) => {
          if (current) {
            setResource({ state: "loaded", result });
          }
        });
        return () => {
          current = false;
        };
      }, [...dependencies, reloadToken, pollKey]);

      return {
        ...resource,
        reload: () => setReloadToken((value) => value + 1),
      };
    },
  };
});

vi.mock("../../lib/zentroApi", () => ({
  zentroApi: {
    operations: {
      summary: apiMocks.summary,
      providers: apiMocks.providers,
      provider: apiMocks.provider,
      models: apiMocks.models,
      fallbacks: apiMocks.fallbacks,
      errors: apiMocks.errors,
      incidents: apiMocks.incidents,
    },
    usage: {
      summary: apiMocks.usageSummary,
      providers: apiMocks.usageProviders,
      models: apiMocks.usageModels,
    },
    ai: {
      providers: apiMocks.aiProviders,
      localModels: apiMocks.localModels,
    },
    health: {
      application: apiMocks.health,
    },
  },
}));

describe("Phase G3 operations e2e flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.roles = ["admin"];
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });

    const success = (endpoint: string, data: unknown) => ({ status: "success" as const, endpoint, data });

    apiMocks.summary.mockResolvedValue(
      success("/v1/operations/summary", {
        totalRequests: 40,
        requestsPerMinute: 2,
        successRate: 0.97,
        errorRate: 0.03,
        averageLatency: 100,
        p95Latency: 180,
        activeProviders: 2,
        degradedProviders: 0,
        offlineProviders: 0,
        fallbackRate: 0.04,
      })
    );
    apiMocks.providers.mockResolvedValue(
      success("/v1/operations/providers", [
        { id: "groq", name: "groq", status: "healthy", enabled: true, averageLatency: 90, p95Latency: 150, successRate: 0.99, errorRate: 0.01, requests: 20, activeModels: 3 },
        { id: "openrouter", name: "openrouter", status: "degraded", enabled: true, averageLatency: 200, successRate: 0.9, requests: 10 },
      ])
    );
    apiMocks.provider.mockResolvedValue(
      success("/v1/operations/providers/groq", {
        status: "healthy",
        averageLatency: 90,
        p95Latency: 150,
        successRate: 0.99,
        latencyTrend: [{ day: "Mon", value: 90 }],
        requests: [{ day: "Mon", value: 20 }],
        success: [{ day: "Mon", value: 19 }],
        failed: [{ day: "Mon", value: 1 }],
        models: [{ model: "llama-3", availability: "healthy" }],
        incidents: [],
        fallbacks: [],
        healthChecks: [{ timestamp: "2026-07-01T00:00:00Z", status: "healthy", latencyMs: 40, summary: "ok" }],
      })
    );
    apiMocks.models.mockResolvedValue(
      success("/v1/operations/models", [{ model: "llama-3", provider: "groq", availability: "healthy", streaming: true, requestCount: 20, successRate: 0.99, averageLatency: 90 }])
    );
    apiMocks.fallbacks.mockResolvedValue({
      status: "capability-required",
      endpoint: "/v1/operations/fallbacks",
      statusCode: 501,
      message: "Backend capability unavailable.",
    });
    apiMocks.errors.mockResolvedValue(
      success("/v1/operations/errors", {
        timeoutCount: 2,
        rateLimitCount: 1,
        authenticationFailureCount: 0,
        providerUnavailableCount: 1,
        byProvider: [{ provider: "openrouter", count: 2, code: "timeout" }],
        byModel: [{ model: "llama-3", count: 1, code: "timeout" }],
        byCode: [{ code: "timeout", count: 2 }],
      })
    );
    apiMocks.incidents.mockResolvedValue({
      status: "capability-required",
      endpoint: "/v1/operations/incidents",
      statusCode: 404,
      message: "Backend capability unavailable.",
    });
    apiMocks.health.mockResolvedValue(success("/health", { status: "ok", version: "2.0.0", uptime: 500 }));
  });

  afterEach(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  });

  it("loads overview, opens provider detail, filters models, and shows unavailable fallbacks/incidents", async () => {
    render(<Operations />);

    expect(await screen.findByText("Total requests")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Provider status: Healthy").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Provider status: Degraded")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Open" })[0]);
    expect(await screen.findByText("Provider detail: groq")).toBeInTheDocument();
    expect(await screen.findByText("Latency trend")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Model search"), { target: { value: "llama" } });
    expect(screen.getAllByText("llama-3").length).toBeGreaterThan(0);

    expect(screen.getAllByText("Backend capability required").length).toBeGreaterThan(0);
    expect(screen.getByText("Errors by provider")).toBeInTheDocument();
  });

  it("manual refresh reloads operations data and can disable auto-refresh", async () => {
    render(<Operations />);
    await screen.findByText("Total requests");

    const initialCalls = apiMocks.summary.mock.calls.length;
    fireEvent.click(screen.getByLabelText("Refresh operations data"));

    await waitFor(() => {
      expect(apiMocks.summary.mock.calls.length).toBeGreaterThan(initialCalls);
    });

    const toggle = screen.getByLabelText("Auto-refresh every 45 seconds") as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(true);
  });
});
