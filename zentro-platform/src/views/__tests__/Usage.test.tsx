import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Usage } from "../Usage";

const sessionMock = vi.hoisted(() => ({
  roles: ["maintainer"] as string[],
  activeProjectId: "project-1" as string | null,
  activeWorkspaceId: "workspace-1" as string | null,
}));

const resourceState = vi.hoisted(() => ({
  mode: "loaded" as "loading" | "loaded" | "empty" | "unauthorized" | "unavailable" | "forbidden",
}));

vi.mock("../../lib/appSession", () => ({
  useAppSession: () => ({
    apiContext: { workspaceId: sessionMock.activeWorkspaceId, projectId: sessionMock.activeProjectId },
    activeProjectId: sessionMock.activeProjectId,
    activeWorkspaceId: sessionMock.activeWorkspaceId,
    bootstrap: { roles: sessionMock.roles },
  }),
}));

vi.mock("../../lib/useApiResource", () => ({
  useApiResource: () => {
    if (resourceState.mode === "loading") {
      return { state: "loading", reload: vi.fn() };
    }

    if (resourceState.mode === "unauthorized") {
      return {
        state: "loaded",
        reload: vi.fn(),
        result: { status: "unauthorized", endpoint: "/v1/usage/summary", statusCode: 401, message: "Login required." },
      };
    }

    if (resourceState.mode === "forbidden") {
      return {
        state: "loaded",
        reload: vi.fn(),
        result: { status: "forbidden", endpoint: "/v1/usage/summary", statusCode: 403, message: "Permission denied." },
      };
    }

    if (resourceState.mode === "unavailable") {
      return {
        state: "loaded",
        reload: vi.fn(),
        result: { status: "backend-unavailable", endpoint: "/v1/usage/summary", statusCode: 503, message: "Backend unavailable." },
      };
    }

    if (resourceState.mode === "empty") {
      return {
        state: "loaded",
        reload: vi.fn(),
        result: { status: "success", endpoint: "/v1/usage/summary", data: {} },
      };
    }

    return {
      state: "loaded",
      reload: vi.fn(),
      result: {
        status: "success",
        endpoint: "/v1/usage/summary",
        data: {
          requestsToday: 5,
          requestsThisMonth: 40,
          inputTokens: 100,
          outputTokens: 200,
          totalTokens: 300,
          creditsSpent: 12,
          averageLatency: 110,
          successRate: 0.98,
          errorCount: 1,
          previousPeriod: { requests: 30, tokens: 250, credits: 10 },
          requestsByDay: [{ day: "Mon", value: 4 }],
          tokensByDay: [{ day: "Mon", value: 20 }],
          creditsByDay: [{ day: "Mon", value: 2 }],
          latencyByDay: [{ day: "Mon", value: 100 }],
          success: [{ day: "Mon", value: 3 }],
          failed: [{ day: "Mon", value: 1 }],
          models: [{ model: "gpt-test", requests: 8, inputTokens: 1, outputTokens: 2, totalTokens: 3, creditsSpent: 1, averageLatency: 90, errorRate: 0.1 }],
          providers: [{ provider: "openai", requests: 8, fallbackCount: 0, successRate: 0.99, averageLatency: 95, totalTokens: 3, creditsSpent: 1 }],
          apiKeys: [{ name: "CI", prefix: "zt_ci", projectId: "project-1", requests: 8, tokens: 3, creditsSpent: 1, lastUsedAt: "2026-07-01", monthlyCreditLimit: 100, limitConsumedPercent: 1 }],
          items: [
            {
              requestId: "req-1",
              timestamp: "2026-07-01T00:00:00Z",
              status: "ok",
              model: "gpt-test",
              provider: "openai",
              apiKeyPrefix: "zt_ci",
              latencyMs: 90,
              inputTokens: 1,
              outputTokens: 2,
              creditsSpent: 1,
              errorSummary: "none",
              prompt: "should-not-render",
              apiKey: "zt_secret_value",
            },
          ],
          nextCursor: "cursor-2",
        },
      },
    };
  },
}));

vi.mock("../../lib/zentroApi", () => ({
  zentroApi: {
    usage: {
      summary: vi.fn(),
      timeseries: vi.fn(),
      models: vi.fn(),
      providers: vi.fn(),
      apiKeys: vi.fn(),
      requests: vi.fn(),
    },
    analytics: { summary: vi.fn() },
    projects: { analytics: vi.fn(), logs: vi.fn() },
  },
}));

describe("Usage production dashboard", () => {
  beforeEach(() => {
    sessionMock.roles = ["maintainer"];
    sessionMock.activeProjectId = "project-1";
    sessionMock.activeWorkspaceId = "workspace-1";
    resourceState.mode = "loaded";
  });

  it("renders overview metrics, charts, tables, and filters", () => {
    render(<Usage />);

    expect(screen.getByText("Usage overview")).toBeInTheDocument();
    expect(screen.getByText("Requests today")).toBeInTheDocument();
    expect(screen.getByText("Requests by day")).toBeInTheDocument();
    expect(screen.getByText("Model usage")).toBeInTheDocument();
    expect(screen.getByText("Provider usage")).toBeInTheDocument();
    expect(screen.getByText("API key usage")).toBeInTheDocument();
    expect(screen.getByText("Request history filters")).toBeInTheDocument();
    expect(screen.getAllByText("zt_ci").length).toBeGreaterThan(0);
    expect(screen.queryByText("should-not-render")).not.toBeInTheDocument();
    expect(screen.queryByText("zt_secret_value")).not.toBeInTheDocument();
  });

  it("supports range selection including custom dates", () => {
    render(<Usage />);

    fireEvent.change(screen.getByLabelText("Range"), { target: { value: "custom" } });
    expect(screen.getByLabelText("Start date")).toBeInTheDocument();
    expect(screen.getByLabelText("End date")).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    resourceState.mode = "loading";
    render(<Usage />);
    expect(screen.getAllByText("Loading").length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);
  });

  it("shows empty states", () => {
    resourceState.mode = "empty";
    render(<Usage />);
    expect(screen.getAllByText(/No data|No records|No .* returned/i).length).toBeGreaterThan(0);
  });

  it("shows unauthorized and backend-unavailable states", () => {
    resourceState.mode = "unauthorized";
    const { rerender } = render(<Usage />);
    expect(screen.getAllByText("Access denied").length).toBeGreaterThan(0);

    resourceState.mode = "unavailable";
    rerender(<Usage />);
    expect(screen.getAllByText("Backend unavailable").length).toBeGreaterThan(0);
  });

  it("hides usage for roles outside the project usage model", () => {
    sessionMock.roles = ["guest"];
    render(<Usage />);
    expect(screen.getByText("Insufficient role for usage data")).toBeInTheDocument();
  });
});
