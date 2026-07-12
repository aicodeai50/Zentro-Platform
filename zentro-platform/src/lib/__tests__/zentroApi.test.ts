import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureZentroApiAuth, zentroApi, zentroRequest } from "../zentroApi";

const originalEnv = process.env.NEXT_PUBLIC_ZENTRO_API_URL;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("zentroApi client", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ZENTRO_API_URL = "https://api.example.test";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    configureZentroApiAuth(null);
    process.env.NEXT_PUBLIC_ZENTRO_API_URL = originalEnv;
  });

  it("adds Supabase access token to authenticated requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "access-token" }) as never,
      refreshSession: async () => null,
    });

    await zentroRequest("/projects", {}, { authenticated: true });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer access-token");
  });

  it("shares one refresh operation across concurrent 401 responses", async () => {
    let session = { access_token: "old-token" } as never;
    const refreshSession = vi.fn(async () => {
      session = { access_token: "new-token" } as never;
      return session;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    configureZentroApiAuth({
      getSession: async () => session,
      refreshSession,
    });

    await Promise.all([
      zentroRequest("/projects", {}, { authenticated: true }),
      zentroRequest("/projects", {}, { authenticated: true }),
    ]);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("retries only once after 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 401));
    const onUnauthorized = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => ({ access_token: "new-token" }) as never,
      onUnauthorized,
    });

    const result = await zentroRequest("/projects", {}, { authenticated: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("unauthorized");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("treats 403 as forbidden without logging out", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 403));
    const onUnauthorized = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
      onUnauthorized,
    });

    const result = await zentroRequest("/projects", {}, { authenticated: true });

    expect(result.status).toBe("forbidden");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("omits workspace header before selection and scopes project headers to project calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    await zentroApi.projects.list({});
    await zentroApi.projects.get("project-1", { workspaceId: "workspace-1" });

    const listHeaders = fetchMock.mock.calls[0][1].headers as Headers;
    const detailHeaders = fetchMock.mock.calls[1][1].headers as Headers;
    expect(listHeaders.has("X-Workspace-Id")).toBe(false);
    expect(listHeaders.has("X-Project-Id")).toBe(false);
    expect(detailHeaders.get("X-Workspace-Id")).toBe("workspace-1");
    expect(detailHeaders.get("X-Project-Id")).toBe("project-1");
  });

  it("uses exact canonical project API-key route paths", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    await zentroApi.developerApi.projectKeys("p1");
    await zentroApi.developerApi.createProjectKey("p1", { name: "key" });
    await zentroApi.developerApi.rotateProjectKey("p1", "k1");
    await zentroApi.developerApi.revokeProjectKey("p1", "k1");
    await zentroApi.developerApi.projectKeyUsage("p1", "k1");

    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      "https://api.example.test/projects/p1/api-keys",
      "https://api.example.test/projects/p1/api-keys",
      "https://api.example.test/projects/p1/api-keys/k1/rotate",
      "https://api.example.test/projects/p1/api-keys/k1/revoke",
      "https://api.example.test/projects/p1/api-keys/k1/usage",
    ]);
  });

  it("uses canonical workspace API-key metadata path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    await zentroApi.developerApi.keys();

    expect(String(fetchMock.mock.calls[0][0])).toBe("https://api.example.test/api-keys");
  });

  it("returns contract-error for malformed validated responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ not: "an array" })));
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    const result = await zentroApi.projects.list();

    expect(result.status).toBe("contract-error");
  });
});
