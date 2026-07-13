import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetPublicConfigCacheForTests } from "../publicConfig";
import { configureZentroApiAuth, zentroApi, zentroRequest } from "../zentroApi";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function runtimeConfigResponse() {
  return jsonResponse({
    supabaseUrl: "https://supabase.example.test",
    supabasePublishableKey: "publishable-key",
    zentroApiUrl: "https://api.example.test/",
    siteUrl: "https://app.example.test",
  });
}

function stubRuntimeFetch(...apiResponses: Response[]) {
  const responses = [...apiResponses];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input) === "/api/public-config") {
      return runtimeConfigResponse();
    }

    return responses.shift() ?? jsonResponse({ ok: true });
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function apiCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.filter((call) => String(call[0]) !== "/api/public-config");
}

describe("zentroApi client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetPublicConfigCacheForTests();
  });

  afterEach(() => {
    configureZentroApiAuth(null);
    resetPublicConfigCacheForTests();
  });

  it("adds Supabase access token to authenticated requests", async () => {
    const fetchMock = stubRuntimeFetch(jsonResponse({ ok: true }));
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "access-token" }) as never,
      refreshSession: async () => null,
    });

    await zentroRequest("/projects", {}, { authenticated: true });

    const headers = apiCalls(fetchMock)[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer access-token");
  });

  it("shares one refresh operation across concurrent 401 responses", async () => {
    let session = { access_token: "old-token" } as never;
    const refreshSession = vi.fn(async () => {
      session = { access_token: "new-token" } as never;
      return session;
    });
    const fetchMock = stubRuntimeFetch(
      jsonResponse({}, 401),
      jsonResponse({}, 401),
      jsonResponse({ ok: true }),
      jsonResponse({ ok: true })
    );
    configureZentroApiAuth({
      getSession: async () => session,
      refreshSession,
    });

    await Promise.all([
      zentroRequest("/projects", {}, { authenticated: true }),
      zentroRequest("/projects", {}, { authenticated: true }),
    ]);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(apiCalls(fetchMock)).toHaveLength(4);
  });

  it("retries only once after 401", async () => {
    const fetchMock = stubRuntimeFetch(jsonResponse({}, 401), jsonResponse({}, 401));
    const onUnauthorized = vi.fn();
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => ({ access_token: "new-token" }) as never,
      onUnauthorized,
    });

    const result = await zentroRequest("/projects", {}, { authenticated: true });

    expect(apiCalls(fetchMock)).toHaveLength(2);
    expect(result.status).toBe("unauthorized");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("treats 403 as forbidden without logging out", async () => {
    stubRuntimeFetch(jsonResponse({}, 403));
    const onUnauthorized = vi.fn();
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
    const fetchMock = stubRuntimeFetch(jsonResponse([]), jsonResponse({}));
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    await zentroApi.projects.list({});
    await zentroApi.projects.get("project-1", { workspaceId: "workspace-1" });

    const [listCall, detailCall] = apiCalls(fetchMock);
    const listHeaders = listCall[1].headers as Headers;
    const detailHeaders = detailCall[1].headers as Headers;
    expect(listHeaders.has("X-Workspace-Id")).toBe(false);
    expect(listHeaders.has("X-Project-Id")).toBe(false);
    expect(detailHeaders.get("X-Workspace-Id")).toBe("workspace-1");
    expect(detailHeaders.get("X-Project-Id")).toBe("project-1");
  });

  it("uses exact canonical project API-key route paths", async () => {
    const fetchMock = stubRuntimeFetch(jsonResponse([]), jsonResponse({}), jsonResponse({}), jsonResponse({}), jsonResponse({}));
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    await zentroApi.developerApi.projectKeys("p1");
    await zentroApi.developerApi.createProjectKey("p1", { name: "key" });
    await zentroApi.developerApi.rotateProjectKey("p1", "k1");
    await zentroApi.developerApi.revokeProjectKey("p1", "k1");
    await zentroApi.developerApi.projectKeyUsage("p1", "k1");

    expect(apiCalls(fetchMock).map((call) => String(call[0]))).toEqual([
      "https://api.example.test/projects/p1/api-keys",
      "https://api.example.test/projects/p1/api-keys",
      "https://api.example.test/projects/p1/api-keys/k1/rotate",
      "https://api.example.test/projects/p1/api-keys/k1/revoke",
      "https://api.example.test/projects/p1/api-keys/k1/usage",
    ]);
  });

  it("uses canonical workspace API-key metadata path", async () => {
    const fetchMock = stubRuntimeFetch(jsonResponse([]));
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    await zentroApi.developerApi.keys();

    expect(String(apiCalls(fetchMock)[0][0])).toBe("https://api.example.test/api-keys");
  });

  it("uses the runtime backend URL from public config", async () => {
    const fetchMock = stubRuntimeFetch(jsonResponse({ ok: true }));

    await zentroRequest("/health");

    expect(fetchMock).toHaveBeenCalledWith("/api/public-config", { cache: "no-store" });
    expect(String(apiCalls(fetchMock)[0][0])).toBe("https://api.example.test/health");
  });

  it("returns contract-error for malformed validated responses", async () => {
    stubRuntimeFetch(jsonResponse({ not: "an array" }));
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    const result = await zentroApi.projects.list();

    expect(result.status).toBe("contract-error");
  });
});
