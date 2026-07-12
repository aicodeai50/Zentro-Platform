import { describe, expect, it } from "vitest";
import { clearPlatformSelections } from "../appSession";

describe("app session state cleanup", () => {
  it("clears workspace and project state on logout", () => {
    window.localStorage.setItem("zentro_active_workspace_id", "workspace-1");
    window.localStorage.setItem("zentro_active_project_id", "project-1");

    clearPlatformSelections();

    expect(window.localStorage.getItem("zentro_active_workspace_id")).toBeNull();
    expect(window.localStorage.getItem("zentro_active_project_id")).toBeNull();
  });
});
