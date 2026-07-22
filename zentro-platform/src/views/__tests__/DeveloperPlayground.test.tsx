import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeveloperPlayground } from "../developer/DeveloperPlayground";
import { assertKeyNotPersisted, containsEmbeddedApiKey } from "../../lib/developerGuards";

const sessionMock = vi.hoisted(() => ({
  activeProjectId: "project-1" as string | null,
  selectProject: vi.fn(),
}));

let resourceCall = 0;

vi.mock("../../lib/appSession", () => ({
  useAppSession: () => ({
    apiContext: { workspaceId: "workspace-1", projectId: sessionMock.activeProjectId },
    activeProjectId: sessionMock.activeProjectId,
    activeWorkspaceId: "workspace-1",
    bootstrap: { projects: [{ id: "project-1", name: "Demo" }] },
    selectProject: sessionMock.selectProject,
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
          data: [{ id: "key-1", name: "CI", prefix: "zt_ci" }],
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

vi.mock("../../lib/publicConfig", () => ({
  getPublicConfig: async () => ({
    supabaseUrl: "https://supabase.example.test",
    supabasePublishableKey: "pub",
    zentroApiUrl: "https://api.example.test/",
    siteUrl: "https://app.example.test",
  }),
}));

vi.mock("../../lib/zentroApi", () => ({
  getZentroApiBaseUrl: async () => "https://api.example.test",
  zentroApi: {
    ai: { providers: vi.fn() },
    developerApi: { keys: vi.fn(), projectKeys: vi.fn() },
    gateway: { openApi: vi.fn(), chatCompletions: vi.fn(), models: vi.fn() },
    projects: {
      inference: vi.fn(async () => ({
        status: "success",
        endpoint: "/v1/projects/project-1/playground/inference",
        data: { response: "hello", modelUsed: "llama-3", providerUsed: "groq", latencyMs: 12, requestId: "req-1", usage: { total: 3 } },
      })),
    },
  },
}));

describe("DeveloperPlayground", () => {
  beforeEach(() => {
    sessionMock.activeProjectId = "project-1";
    resourceCall = 0;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("renders accessible controls and generates env-based snippets without embedded keys", () => {
    render(<DeveloperPlayground />);

    expect(screen.getByLabelText("Playground authentication mode")).toBeInTheDocument();
    expect(screen.getByLabelText("Project selector")).toBeInTheDocument();
    expect(screen.getByLabelText("API key selector")).toBeInTheDocument();
    expect(screen.getByLabelText("Model selector")).toBeInTheDocument();
    expect(screen.getByLabelText("Copy TypeScript example code")).toBeInTheDocument();

    const snippet = screen.getByLabelText("TypeScript example");
    expect(snippet.textContent).toContain("playground/inference");
    expect(containsEmbeddedApiKey(snippet.textContent ?? "")).toBe(false);
  });

  it("keeps key metadata out of web storage", () => {
    render(<DeveloperPlayground />);
    expect(assertKeyNotPersisted(window.localStorage, "zt_ci")).toBe(true);
    expect(assertKeyNotPersisted(window.sessionStorage, "zt_ci")).toBe(true);
  });

  it("runs platform inference and shows response metrics", async () => {
    render(<DeveloperPlayground />);
    fireEvent.change(screen.getByLabelText("User message"), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));

    expect(await screen.findByText("hello")).toBeInTheDocument();
    expect(screen.getByLabelText("Playground response metrics")).toHaveTextContent("llama-3");
    expect(screen.getByText("req-1")).toBeInTheDocument();
  });
});
