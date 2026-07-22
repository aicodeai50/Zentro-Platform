import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Billing } from "../Billing";

const sessionMock = vi.hoisted(() => ({
  roles: ["owner"] as string[],
  activeProjectId: "project-1" as string | null,
  activeWorkspaceId: "workspace-1" as string | null,
}));

const resourceState = vi.hoisted(() => ({
  mode: "loaded" as "loading" | "loaded" | "unauthorized" | "empty",
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
        result: { status: "unauthorized", endpoint: "/v1/billing/summary", statusCode: 401, message: "Login required." },
      };
    }

    if (resourceState.mode === "empty") {
      return {
        state: "loaded",
        reload: vi.fn(),
        result: { status: "success", endpoint: "/v1/billing/summary", data: {} },
      };
    }

    return {
      state: "loaded",
      reload: vi.fn(),
      result: {
        status: "success",
        endpoint: "/v1/billing/summary",
        data: {
          creditBalance: 120,
          creditsUsedThisPeriod: 30,
          plan: "Growth",
          billingPeriodStart: "2026-07-01",
          billingPeriodEnd: "2026-07-31",
          monthlyLimit: 200,
          creditsSpent: 30,
          totalTokens: 900,
          requestsThisMonth: 40,
          averageLatency: 100,
          items: [{ id: "tx-1", type: "debit" }],
        },
      },
    };
  },
}));

vi.mock("../../lib/zentroApi", () => ({
  backendCapabilityRequired: (endpoint: string) => ({
    status: "capability-required",
    endpoint,
    statusCode: 501,
    message: "Backend capability required",
  }),
  zentroApi: {
    platformBilling: { summary: vi.fn() },
    billing: { summary: vi.fn(), credits: vi.fn(), transactions: vi.fn() },
    projects: { billingUsage: vi.fn() },
  },
}));

describe("Billing production dashboard", () => {
  beforeEach(() => {
    sessionMock.roles = ["owner"];
    sessionMock.activeProjectId = "project-1";
    sessionMock.activeWorkspaceId = "workspace-1";
    resourceState.mode = "loaded";
  });

  it("renders billing overview calculations for owners", () => {
    render(<Billing />);

    expect(screen.getByText("Billing overview")).toBeInTheDocument();
    expect(screen.getByText("Current credit balance")).toBeInTheDocument();
    expect(screen.getByLabelText("Current credit balance: 120")).toBeInTheDocument();
    expect(screen.getByText("Estimated remaining credits")).toBeInTheDocument();
    expect(screen.getByLabelText("Current plan: Growth")).toBeInTheDocument();
    expect(screen.getByLabelText("Usage percentage: 15.0%")).toBeInTheDocument();
  });

  it("hides organization billing for members while allowing project usage", () => {
    sessionMock.roles = ["member"];
    render(<Billing />);

    expect(screen.getByText("Organization billing restricted")).toBeInTheDocument();
    expect(screen.getByText("Project billing usage")).toBeInTheDocument();
  });

  it("shows loading and unauthorized states", () => {
    resourceState.mode = "loading";
    const { rerender } = render(<Billing />);
    expect(screen.getAllByText("Loading").length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[aria-busy="true"]').length).toBeGreaterThan(0);

    resourceState.mode = "unauthorized";
    rerender(<Billing />);
    expect(screen.getAllByText("Access denied").length).toBeGreaterThan(0);
  });
});
