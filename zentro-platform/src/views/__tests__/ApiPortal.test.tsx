import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiPortal } from "../ApiPortal";

const apiMocks = vi.hoisted(() => ({
  createProjectKey: vi.fn(),
  rotateProjectKey: vi.fn(),
  revokeProjectKey: vi.fn(),
  projectKeyUsage: vi.fn(),
}));

vi.mock("../../lib/appSession", () => ({
  useAppSession: () => ({
    apiContext: { workspaceId: "workspace-1", projectId: "project-1" },
    activeProjectId: "project-1",
  }),
}));

vi.mock("../../lib/useApiResource", () => ({
  useApiResource: () => ({ state: "loaded", result: { status: "success", endpoint: "/test", data: [] } }),
}));

vi.mock("../../lib/zentroApi", () => ({
  zentroApi: {
    developerApi: {
      keys: vi.fn(),
      projectKeys: vi.fn(),
      createProjectKey: apiMocks.createProjectKey,
      rotateProjectKey: apiMocks.rotateProjectKey,
      revokeProjectKey: apiMocks.revokeProjectKey,
      projectKeyUsage: apiMocks.projectKeyUsage,
    },
  },
}));

describe("ApiPortal API-key UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    apiMocks.createProjectKey.mockResolvedValue({ status: "success", endpoint: "/projects/project-1/api-keys", data: { secret: "zt_secret_once" } });
    apiMocks.rotateProjectKey.mockResolvedValue({ status: "success", endpoint: "/projects/project-1/api-keys/key-1/rotate", data: { secret: "zt_rotated_once" } });
    apiMocks.revokeProjectKey.mockResolvedValue({ status: "success", endpoint: "/projects/project-1/api-keys/key-1/revoke", data: {} });
    apiMocks.projectKeyUsage.mockResolvedValue({ status: "success", endpoint: "/usage", data: { requests: 0 } });
  });

  it("shows a created key once and never persists it", async () => {
    render(<ApiPortal />);

    fireEvent.change(screen.getByLabelText("New key name"), { target: { value: "Production key" } });
    fireEvent.click(screen.getByRole("button", { name: "Create key using backend" }));

    expect(await screen.findByText("zt_secret_once")).toBeInTheDocument();
    expect(window.localStorage.getItem("zt_secret_once")).toBeNull();
    expect(window.sessionStorage.getItem("zt_secret_once")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("zt_secret_once")).not.toBeInTheDocument();
  });

  it("copies the one-time key with temporary copied state", async () => {
    render(<ApiPortal />);

    fireEvent.click(screen.getByRole("button", { name: "Create key using backend" }));
    expect(await screen.findByText("zt_secret_once")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("zt_secret_once");
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
  });

  it("requires confirmation before rotation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ApiPortal />);

    fireEvent.change(screen.getByLabelText("Existing key id"), { target: { value: "key-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Rotate using backend" }));

    expect(apiMocks.rotateProjectKey).not.toHaveBeenCalled();
  });

  it("requires confirmation before revocation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ApiPortal />);

    fireEvent.change(screen.getByLabelText("Existing key id"), { target: { value: "key-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Revoke using backend" }));

    expect(apiMocks.revokeProjectKey).toHaveBeenCalledWith("project-1", "key-1", {
      workspaceId: "workspace-1",
      projectId: "project-1",
    });
  });
});
