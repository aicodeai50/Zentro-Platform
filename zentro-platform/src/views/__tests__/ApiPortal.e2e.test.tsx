import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiPortal } from "../ApiPortal";

/**
 * End-to-end style UI flows for Phase G1 API key management.
 * These exercise create → copy-once → rename → rotate → revoke against mocked /v1/api-keys.
 */

const apiMocks = vi.hoisted(() => ({
  createProjectKey: vi.fn(),
  update: vi.fn(),
  rotateProjectKey: vi.fn(),
  revokeProjectKey: vi.fn(),
}));

vi.mock("../../lib/appSession", () => ({
  useAppSession: () => ({
    apiContext: { workspaceId: "workspace-1", projectId: "project-1" },
    activeProjectId: "project-1",
    activeWorkspaceId: "workspace-1",
    bootstrap: {
      roles: ["maintainer"],
      currentOrganization: { id: "org-1" },
      organizations: [{ id: "org-1" }],
    },
  }),
}));

vi.mock("../../lib/useApiResource", () => ({
  useApiResource: () => ({
    state: "loaded",
    result: {
      status: "success",
      endpoint: "/v1/api-keys?projectId=project-1",
      data: [
        {
          id: "key-1",
          name: "CI key",
          prefix: "zt_ci",
          organizationId: "org-1",
          workspaceId: "workspace-1",
          projectId: "project-1",
          status: "active",
          createdAt: "2026-02-01",
          lastUsedAt: "2026-02-10",
          expiresAt: "2031-01-01",
          createdBy: "user-1",
          revokedAt: null,
          allowedModels: ["model-a"],
          allowedProviders: ["provider-a"],
          monthlyCreditLimit: 250,
          ipAllowlist: ["203.0.113.10"],
        },
      ],
    },
  }),
}));

vi.mock("../../lib/zentroApi", () => ({
  zentroApi: {
    developerApi: {
      keys: vi.fn(),
      projectKeys: vi.fn(),
      create: vi.fn(),
      createProjectKey: apiMocks.createProjectKey,
      update: apiMocks.update,
      rotateProjectKey: apiMocks.rotateProjectKey,
      revoke: vi.fn(),
      revokeProjectKey: apiMocks.revokeProjectKey,
    },
  },
}));

describe("Phase G1 API key e2e flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    apiMocks.createProjectKey.mockResolvedValue({
      status: "success",
      endpoint: "/v1/api-keys",
      data: { plaintextKey: "zt_e2e_secret" },
    });
    apiMocks.update.mockResolvedValue({ status: "success", endpoint: "/v1/api-keys/key-1", data: { id: "key-1", name: "CI key renamed" } });
    apiMocks.rotateProjectKey.mockResolvedValue({
      status: "success",
      endpoint: "/v1/api-keys/key-1",
      data: { plaintextKey: "zt_e2e_rotated" },
    });
    apiMocks.revokeProjectKey.mockResolvedValue({ status: "success", endpoint: "/v1/api-keys/key-1", data: {} });
  });

  it("completes create, copy-once, rename, rotate, and revoke", async () => {
    render(<ApiPortal />);

    expect(screen.getByText("CI key")).toBeInTheDocument();
    expect(screen.getByText("2026-02-10")).toBeInTheDocument();
    expect(screen.getByText(/models: model-a/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));
    fireEvent.change(screen.getByLabelText("Key name"), { target: { value: "Staging key" } });
    fireEvent.change(screen.getByLabelText("Monthly credit limit"), { target: { value: "100" } });
    fireEvent.change(screen.getByLabelText("IP allowlist"), { target: { value: "198.51.100.10" } });
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));

    expect(await screen.findByText("zt_e2e_secret")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("zt_e2e_secret");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.change(screen.getByLabelText("Rename CI key"), { target: { value: "CI key renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(apiMocks.update).toHaveBeenCalledWith("key-1", { name: "CI key renamed" }, expect.any(Object));

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Rotate" }));
    expect(await screen.findByText("zt_e2e_rotated")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    expect(apiMocks.revokeProjectKey).toHaveBeenCalledWith("project-1", "key-1", expect.any(Object));
    expect(await screen.findByText(/Audit event recorded by backend/i)).toBeInTheDocument();
  });
});
