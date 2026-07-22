import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Billing } from "../Billing";
import { Usage } from "../Usage";

/**
 * End-to-end style UI flows for Phase G2 usage and billing dashboards.
 */

const apiMocks = vi.hoisted(() => ({
  summary: vi.fn(),
  timeseries: vi.fn(),
  models: vi.fn(),
  providers: vi.fn(),
  apiKeys: vi.fn(),
  requests: vi.fn(),
  platformBillingSummary: vi.fn(),
  billingSummary: vi.fn(),
  credits: vi.fn(),
  transactions: vi.fn(),
  projectBillingUsage: vi.fn(),
  analytics: vi.fn(),
  projectAnalytics: vi.fn(),
  logs: vi.fn(),
}));

const sessionMock = vi.hoisted(() => ({
  roles: ["owner"] as string[],
}));

vi.mock("../../lib/appSession", () => ({
  useAppSession: () => ({
    apiContext: { workspaceId: "workspace-1", projectId: "project-1" },
    activeProjectId: "project-1",
    activeWorkspaceId: "workspace-1",
    bootstrap: { roles: sessionMock.roles },
  }),
}));

vi.mock("../../lib/useApiResource", async () => {
  const React = await import("react");
  return {
    useApiResource: (load: () => Promise<unknown>, dependencies: unknown[] = []) => {
      const [resource, setResource] = React.useState<{ state: "loading" } | { state: "loaded"; result: unknown }>({ state: "loading" });
      const [reloadToken, setReloadToken] = React.useState(0);

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
      }, [...dependencies, reloadToken]);

      return {
        ...resource,
        reload: () => setReloadToken((value) => value + 1),
      };
    },
  };
});

vi.mock("../../lib/zentroApi", () => ({
  backendCapabilityRequired: (endpoint: string) => ({
    status: "capability-required",
    endpoint,
    statusCode: 501,
    message: "Backend capability required",
  }),
  zentroApi: {
    usage: {
      summary: apiMocks.summary,
      timeseries: apiMocks.timeseries,
      models: apiMocks.models,
      providers: apiMocks.providers,
      apiKeys: apiMocks.apiKeys,
      requests: apiMocks.requests,
    },
    platformBilling: { summary: apiMocks.platformBillingSummary },
    billing: {
      summary: apiMocks.billingSummary,
      credits: apiMocks.credits,
      transactions: apiMocks.transactions,
    },
    projects: {
      analytics: apiMocks.projectAnalytics,
      logs: apiMocks.logs,
      billingUsage: apiMocks.projectBillingUsage,
    },
    analytics: { summary: apiMocks.analytics },
  },
}));

describe("Phase G2 usage and billing e2e flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.roles = ["owner"];

    const success = (endpoint: string, data: unknown) => ({ status: "success" as const, endpoint, data });

    apiMocks.summary.mockResolvedValue(
      success("/v1/usage/summary", {
        requestsToday: 2,
        requestsThisMonth: 20,
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        creditsSpent: 5,
        averageLatency: 80,
        successRate: 1,
        errorCount: 0,
      })
    );
    apiMocks.timeseries.mockResolvedValue(
      success("/v1/usage/timeseries", {
        requests: [{ day: "Mon", value: 2 }],
        tokens: [{ day: "Mon", value: 30 }],
        credits: [{ day: "Mon", value: 5 }],
        latency: [{ day: "Mon", value: 80 }],
        success: [{ day: "Mon", value: 2 }],
        failed: [{ day: "Mon", value: 0 }],
      })
    );
    apiMocks.models.mockResolvedValue(success("/v1/usage/models", [{ model: "model-a", requests: 2, totalTokens: 30, creditsSpent: 5, averageLatency: 80, errorRate: 0 }]));
    apiMocks.providers.mockResolvedValue(success("/v1/usage/providers", [{ provider: "provider-a", requests: 2, fallbackCount: 0, successRate: 1, averageLatency: 80, totalTokens: 30, creditsSpent: 5 }]));
    apiMocks.apiKeys.mockResolvedValue(
      success("/v1/usage/api-keys", [{ name: "CI", prefix: "zt_ci", project: "project-1", requests: 2, tokens: 30, creditsSpent: 5, lastUsedAt: "2026-07-01", monthlyCreditLimit: 50 }])
    );
    apiMocks.requests.mockResolvedValue(
      success("/v1/usage/requests", {
        items: [{ requestId: "req-1", timestamp: "2026-07-01", status: "ok", model: "model-a", provider: "provider-a", apiKeyPrefix: "zt_ci", latencyMs: 80, inputTokens: 10, outputTokens: 20, creditsSpent: 5 }],
        nextCursor: "next-1",
      })
    );
    apiMocks.platformBillingSummary.mockResolvedValue(
      success("/v1/billing/summary", {
        creditBalance: 100,
        creditsUsedThisPeriod: 20,
        plan: "Scale",
        billingPeriodStart: "2026-07-01",
        billingPeriodEnd: "2026-07-31",
        monthlyLimit: 200,
      })
    );
    apiMocks.credits.mockResolvedValue(success("/v1/workspaces/workspace-1/credits", { balance: 100 }));
    apiMocks.transactions.mockResolvedValue(success("/v1/workspaces/workspace-1/transactions", { items: [{ id: "tx-1" }] }));
    apiMocks.projectBillingUsage.mockResolvedValue(success("/v1/projects/project-1/billing/usage", { creditsSpent: 5, totalTokens: 30, requestsThisMonth: 20, averageLatency: 80 }));
  });

  it("loads usage overview, applies filters, and paginates request history", async () => {
    render(<Usage />);

    expect(await screen.findByText("Requests today")).toBeInTheDocument();
    expect(screen.getAllByText("model-a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("provider-a").length).toBeGreaterThan(0);
    expect(screen.getAllByText("zt_ci").length).toBeGreaterThan(0);
    expect(screen.getByText("req-1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "error" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    fireEvent.click(await screen.findByRole("button", { name: "Next page" }));

    expect(apiMocks.requests.mock.calls.length).toBeGreaterThan(1);
  });

  it("loads billing overview metrics for owners", async () => {
    render(<Billing />);

    expect(await screen.findByText("Current credit balance")).toBeInTheDocument();
    expect(screen.getByLabelText("Current credit balance: 100")).toBeInTheDocument();
    expect(screen.getByText("Scale")).toBeInTheDocument();
    expect(screen.getByLabelText("Usage percentage: 10.0%")).toBeInTheDocument();
  });

  it("keeps organization billing hidden for members", async () => {
    sessionMock.roles = ["member"];
    render(<Billing />);

    expect(await screen.findByText("Organization billing restricted")).toBeInTheDocument();
    expect(screen.queryByText("Current credit balance")).not.toBeInTheDocument();
    expect(await screen.findByText("Project billing usage")).toBeInTheDocument();
  });
});
