import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiPortal } from "../ApiPortal";

const apiMocks = vi.hoisted(() => ({
  keys: vi.fn(),
  projectKeys: vi.fn(),
  create: vi.fn(),
  createProjectKey: vi.fn(),
  update: vi.fn(),
  rotateProjectKey: vi.fn(),
  revoke: vi.fn(),
  revokeProjectKey: vi.fn(),
}));

const sessionMock = vi.hoisted(() => ({
  roles: ["owner"] as string[],
  activeProjectId: "project-1" as string | null,
  activeWorkspaceId: "workspace-1" as string | null,
}));

vi.mock("../../lib/appSession", () => ({
  useAppSession: () => ({
    apiContext: { workspaceId: sessionMock.activeWorkspaceId, projectId: sessionMock.activeProjectId },
    activeProjectId: sessionMock.activeProjectId,
    activeWorkspaceId: sessionMock.activeWorkspaceId,
    bootstrap: {
      roles: sessionMock.roles,
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
      endpoint: "/v1/api-keys",
      data: [
        {
          id: "key-1",
          name: "Production key",
          prefix: "zt_prod",
          organizationId: "org-1",
          workspaceId: "workspace-1",
          projectId: "project-1",
          status: "active",
          createdAt: "2026-01-01",
          lastUsedAt: "2026-01-10",
          expiresAt: null,
          createdBy: "user-1",
          revokedAt: null,
        },
      ],
    },
  }),
}));

vi.mock("../../lib/zentroApi", () => ({
  zentroApi: {
    developerApi: {
      keys: apiMocks.keys,
      projectKeys: apiMocks.projectKeys,
      create: apiMocks.create,
      createProjectKey: apiMocks.createProjectKey,
      update: apiMocks.update,
      rotateProjectKey: apiMocks.rotateProjectKey,
      revoke: apiMocks.revoke,
      revokeProjectKey: apiMocks.revokeProjectKey,
    },
  },
}));

describe("ApiPortal production API-key UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock.roles = ["owner"];
    sessionMock.activeProjectId = "project-1";
    sessionMock.activeWorkspaceId = "workspace-1";
    window.localStorage.clear();
    window.sessionStorage.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    apiMocks.createProjectKey.mockResolvedValue({
      status: "success",
      endpoint: "/v1/api-keys",
      data: { plaintextKey: "zt_secret_once" },
    });
    apiMocks.update.mockResolvedValue({ status: "success", endpoint: "/v1/api-keys/key-1", data: { id: "key-1", name: "Renamed" } });
    apiMocks.rotateProjectKey.mockResolvedValue({
      status: "success",
      endpoint: "/v1/api-keys/key-1",
      data: { plaintextKey: "zt_rotated_once" },
    });
    apiMocks.revokeProjectKey.mockResolvedValue({ status: "success", endpoint: "/v1/api-keys/key-1", data: {} });
  });

  it("shows a created key once and never persists it", async () => {
    render(<ApiPortal />);

    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));
    fireEvent.change(screen.getByLabelText("Key name"), { target: { value: "Production key" } });
    fireEvent.change(screen.getByLabelText("Expiration date"), { target: { value: "2030-01-01" } });
    fireEvent.change(screen.getByLabelText("Allowed models"), { target: { value: "model-a" } });
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));

    expect(await screen.findByText("zt_secret_once")).toBeInTheDocument();
    expect(window.localStorage.getItem("zt_secret_once")).toBeNull();
    expect(window.sessionStorage.getItem("zt_secret_once")).toBeNull();
    expect(apiMocks.createProjectKey).toHaveBeenCalledWith(
      "project-1",
      expect.objectContaining({
        name: "Production key",
        organizationId: "org-1",
        workspaceId: "workspace-1",
        projectId: "project-1",
        expiresAt: "2030-01-01",
        allowedModels: ["model-a"],
      }),
      expect.any(Object)
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("zt_secret_once")).not.toBeInTheDocument();
  });

  it("copies the one-time key with temporary copied state", async () => {
    render(<ApiPortal />);

    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));
    fireEvent.change(screen.getByLabelText("Key name"), { target: { value: "Copy key" } });
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));
    expect(await screen.findByText("zt_secret_once")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("zt_secret_once");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("renames an existing key through PATCH /v1/api-keys/:id", async () => {
    render(<ApiPortal />);

    fireEvent.change(screen.getByLabelText("Rename Production key"), { target: { value: "Renamed key" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    expect(apiMocks.update).toHaveBeenCalledWith("key-1", { name: "Renamed key" }, expect.any(Object));
  });

  it("requires confirmation before rotation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ApiPortal />);

    fireEvent.click(screen.getByRole("button", { name: "Rotate" }));

    expect(apiMocks.rotateProjectKey).not.toHaveBeenCalled();
  });

  it("requires confirmation before revocation and audits via backend revoke", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ApiPortal />);

    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));

    expect(apiMocks.revokeProjectKey).toHaveBeenCalledWith("project-1", "key-1", {
      workspaceId: "workspace-1",
      projectId: "project-1",
    });
    expect(await screen.findByText(/Audit event recorded by backend/i)).toBeInTheDocument();
  });

  it("hides management actions for non-manager roles", () => {
    sessionMock.roles = ["viewer"];
    render(<ApiPortal />);

    expect(screen.queryByRole("button", { name: "Create API key" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke" })).not.toBeInTheDocument();
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
  });

  it("renders last-used and status badges from backend metadata", () => {
    render(<ApiPortal />);

    expect(screen.getByText("2026-01-10")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });
});
