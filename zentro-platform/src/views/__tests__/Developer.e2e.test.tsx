import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeveloperLayout } from "../developer/DeveloperLayout";
import { DeveloperOverview, DeveloperQuickStart } from "../developer/pages";
import { DeveloperPlayground } from "../developer/DeveloperPlayground";
import { containsEmbeddedApiKey } from "../../lib/developerGuards";

const inference = vi.hoisted(() =>
  vi.fn(async () => ({
    status: "success",
    endpoint: "/v1/projects/project-1/playground/inference",
    data: { response: "stream-or-json", modelUsed: "llama-3", providerUsed: "groq", latencyMs: 20, requestId: "req-9" },
  }))
);

let resourceCall = 0;

vi.mock("../../lib/publicConfig", () => ({
  getPublicConfig: async () => ({
    supabaseUrl: "https://supabase.example.test",
    supabasePublishableKey: "pub",
    zentroApiUrl: "https://api.example.test/",
    siteUrl: "https://app.example.test",
  }),
}));

vi.mock("../../lib/appSession", () => ({
  useAppSession: () => ({
    apiContext: { workspaceId: "workspace-1", projectId: "project-1" },
    activeProjectId: "project-1",
    activeWorkspaceId: "workspace-1",
    bootstrap: { projects: [{ id: "project-1", name: "Demo" }] },
    selectProject: vi.fn(),
  }),
}));

vi.mock("../../lib/useApiResource", () => ({
  useApiResource: () => {
    resourceCall += 1;
    const index = (resourceCall - 1) % 3;

    if (index === 1) {
      return {
        state: "loaded",
        reload: vi.fn(),
        result: {
          status: "success",
          endpoint: "/v1/api-keys",
          data: [{ id: "k1", name: "CI", prefix: "zt_ci" }],
        },
      };
    }

    if (index === 2) {
      return {
        state: "loaded",
        reload: vi.fn(),
        result: { status: "capability-required", endpoint: "/openapi.json", statusCode: 404, message: "missing" },
      };
    }

    return {
      state: "loaded",
      reload: vi.fn(),
      result: {
        status: "success",
        endpoint: "/providers",
        data: { providers: ["groq"], localModels: ["llama-3"] },
      },
    };
  },
}));

vi.mock("../../lib/zentroApi", () => ({
  getZentroApiBaseUrl: async () => "https://api.example.test",
  zentroApi: {
    ai: { providers: vi.fn() },
    developerApi: { keys: vi.fn(), projectKeys: vi.fn() },
    gateway: {
      openApi: vi.fn(),
      models: vi.fn(),
      chatCompletions: vi.fn(),
    },
    projects: { inference },
    operations: { models: vi.fn() },
  },
}));

describe("Phase G4 developer e2e flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resourceCall = 0;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("navigates docs and runs playground without embedding secrets", async () => {
    render(
      <MemoryRouter initialEntries={["/developer"]}>
        <Routes>
          <Route path="/developer" element={<DeveloperLayout />}>
            <Route index element={<DeveloperOverview />} />
            <Route path="quick-start" element={<DeveloperQuickStart />} />
            <Route path="playground" element={<DeveloperPlayground />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("https://api.example.test/")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "API Playground" }));

    expect(await screen.findByRole("heading", { name: "API Playground" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("User message"), { target: { value: "Ping" } });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByText("stream-or-json")).toBeInTheDocument();
    expect(inference).toHaveBeenCalled();
    const snippet = screen.getByLabelText("TypeScript example");
    expect(containsEmbeddedApiKey(snippet.textContent ?? "")).toBe(false);
  });
});
