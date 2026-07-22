import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeveloperLayout } from "../developer/DeveloperLayout";
import { DeveloperOverview, DeveloperQuickStart } from "../developer/pages";

vi.mock("../../lib/publicConfig", () => ({
  getPublicConfig: async () => ({
    supabaseUrl: "https://supabase.example.test",
    supabasePublishableKey: "pub",
    zentroApiUrl: "https://api.example.test/",
    siteUrl: "https://app.example.test",
  }),
}));

vi.mock("../../lib/useApiResource", () => ({
  useApiResource: () => ({
    state: "loaded",
    reload: vi.fn(),
    result: {
      status: "capability-required",
      endpoint: "/openapi.json",
      statusCode: 404,
      message: "Backend capability unavailable.",
    },
  }),
}));

vi.mock("../../lib/zentroApi", () => ({
  zentroApi: {
    gateway: {
      openApi: vi.fn(),
      models: vi.fn(),
    },
  },
}));

function renderDeveloper(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/developer" element={<DeveloperLayout />}>
          <Route index element={<DeveloperOverview />} />
          <Route path="quick-start" element={<DeveloperQuickStart />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("Developer documentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders overview with runtime API base URL and navigation", async () => {
    renderDeveloper("/developer");
    expect(screen.getByText("Developer documentation")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Developer documentation" })).toBeInTheDocument();
    expect(await screen.findByText("https://api.example.test/")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quick Start" })).toBeInTheDocument();
  });

  it("uses confirmed playground contract when OpenAPI chat route is unavailable", async () => {
    renderDeveloper("/developer/quick-start");
    expect(await screen.findByLabelText("cURL")).toBeInTheDocument();
    expect(screen.getByLabelText("cURL").textContent).toContain("playground/inference");
    expect(screen.getByLabelText("cURL").textContent).toContain("$SUPABASE_ACCESS_TOKEN");
  });
});
