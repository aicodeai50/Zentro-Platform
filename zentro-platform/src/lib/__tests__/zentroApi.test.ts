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

  it("uses exact Phase G1 API-key route paths", async () => {
    const fetchMock = stubRuntimeFetch(
      jsonResponse([]),
      jsonResponse({ plaintextKey: "zt_once" }),
      jsonResponse({ id: "k1", name: "renamed" }),
      jsonResponse({}),
      jsonResponse([]),
      jsonResponse({ plaintextKey: "zt_project" }),
      jsonResponse({ plaintextKey: "zt_rotated" }),
      jsonResponse({})
    );
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    await zentroApi.developerApi.keys();
    await zentroApi.developerApi.create({
      name: "key",
      organizationId: "org1",
      workspaceId: "w1",
      projectId: "p1",
      expiresAt: "2030-01-01",
      allowedModels: ["m1"],
      allowedProviders: ["prov"],
      monthlyCreditLimit: 100,
      ipAllowlist: ["203.0.113.10"],
    });
    await zentroApi.developerApi.update("k1", { name: "renamed" });
    await zentroApi.developerApi.revoke("k1");
    await zentroApi.developerApi.projectKeys("p1");
    await zentroApi.developerApi.createProjectKey("p1", { name: "key" });
    await zentroApi.developerApi.rotateProjectKey("p1", "k1");
    await zentroApi.developerApi.revokeProjectKey("p1", "k1");

    expect(apiCalls(fetchMock).map((call) => String(call[0]))).toEqual([
      "https://api.example.test/v1/api-keys",
      "https://api.example.test/v1/api-keys",
      "https://api.example.test/v1/api-keys/k1",
      "https://api.example.test/v1/api-keys/k1",
      "https://api.example.test/v1/api-keys?projectId=p1",
      "https://api.example.test/v1/api-keys",
      "https://api.example.test/v1/api-keys/k1",
      "https://api.example.test/v1/api-keys/k1",
    ]);

    const createInit = apiCalls(fetchMock)[1][1];
    expect(createInit.method).toBe("POST");
    expect(JSON.parse(String(createInit.body))).toMatchObject({
      name: "key",
      organizationId: "org1",
      workspaceId: "w1",
      projectId: "p1",
      monthlyCreditLimit: 100,
    });

    const rotateInit = apiCalls(fetchMock)[6][1];
    expect(rotateInit.method).toBe("PATCH");
    expect(JSON.parse(String(rotateInit.body))).toEqual({ rotate: true });
  });

  it("uses Phase G1 workspace API-key metadata path", async () => {
    const fetchMock = stubRuntimeFetch(jsonResponse([]));
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    await zentroApi.developerApi.keys();

    expect(String(apiCalls(fetchMock)[0][0])).toBe("https://api.example.test/v1/api-keys");
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

  it("uses exact Phase D endpoint paths", async () => {
    const fetchMock = stubRuntimeFetch(
      jsonResponse({ response: "ok" }),
      jsonResponse({ items: [] }),
      jsonResponse({}),
      jsonResponse({}),
      jsonResponse({ items: [] }),
      jsonResponse([]),
      jsonResponse({ id: "wh1" }),
      jsonResponse({ id: "wh1" }),
      jsonResponse({ ok: true }),
      jsonResponse({ ok: true }),
      jsonResponse([]),
      jsonResponse({ id: "m1" }),
      jsonResponse({ id: "m1" }),
      jsonResponse({ ok: true })
    );
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    await zentroApi.projects.inference("p1", { provider: "prov", model: "model", temperature: 0.7, privacyMode: "strict", systemPrompt: "s", userPrompt: "u" });
    await zentroApi.projects.logs("p1", { status: "ok", requestId: "req1" });
    await zentroApi.projects.billingUsage("p1");
    await zentroApi.billing.summary("w1");
    await zentroApi.billing.transactions("w1");
    await zentroApi.webhooks.list("p1");
    await zentroApi.webhooks.create("p1", { url: "https://example.test" });
    await zentroApi.webhooks.update("p1", "wh1", { status: "disabled" });
    await zentroApi.webhooks.delete("p1", "wh1");
    await zentroApi.webhooks.test("p1", "wh1");
    await zentroApi.projects.members("p1");
    await zentroApi.projects.addMember("p1", { email: "a@example.test", role: "viewer" });
    await zentroApi.projects.updateMember("p1", "m1", { role: "owner" });
    await zentroApi.projects.removeMember("p1", "m1");

    expect(apiCalls(fetchMock).map((call) => String(call[0]))).toEqual([
      "https://api.example.test/v1/projects/p1/playground/inference",
      "https://api.example.test/v1/projects/p1/logs?status=ok&requestId=req1",
      "https://api.example.test/v1/projects/p1/billing/usage",
      "https://api.example.test/v1/workspaces/w1/billing/summary",
      "https://api.example.test/v1/workspaces/w1/transactions",
      "https://api.example.test/v1/projects/p1/webhooks",
      "https://api.example.test/v1/projects/p1/webhooks",
      "https://api.example.test/v1/projects/p1/webhooks/wh1",
      "https://api.example.test/v1/projects/p1/webhooks/wh1",
      "https://api.example.test/v1/projects/p1/webhooks/wh1/test",
      "https://api.example.test/v1/projects/p1/members",
      "https://api.example.test/v1/projects/p1/members",
      "https://api.example.test/v1/projects/p1/members/m1",
      "https://api.example.test/v1/projects/p1/members/m1",
    ]);
  });

  it("attaches Supabase JWT and project/workspace headers to Phase D calls", async () => {
    const fetchMock = stubRuntimeFetch(jsonResponse({ response: "ok" }), jsonResponse({}));
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "phase-d-token" }) as never,
      refreshSession: async () => null,
    });

    await zentroApi.projects.inference(
      "p1",
      { provider: "prov", model: "model", temperature: 0.2, privacyMode: "standard", systemPrompt: "s", userPrompt: "u" },
      { workspaceId: "w1" }
    );
    await zentroApi.billing.credits("w1", { workspaceId: "w1" });

    const projectHeaders = apiCalls(fetchMock)[0][1].headers as Headers;
    const workspaceHeaders = apiCalls(fetchMock)[1][1].headers as Headers;
    expect(projectHeaders.get("Authorization")).toBe("Bearer phase-d-token");
    expect(projectHeaders.get("X-Workspace-Id")).toBe("w1");
    expect(projectHeaders.get("X-Project-Id")).toBe("p1");
    expect(workspaceHeaders.get("Authorization")).toBe("Bearer phase-d-token");
    expect(workspaceHeaders.get("X-Workspace-Id")).toBe("w1");
  });

  it("sends playground request payload and parses response metadata", async () => {
    const fetchMock = stubRuntimeFetch(jsonResponse({ response: "hello", providerUsed: "prov", modelUsed: "m1", latencyMs: 42, tokenUsage: { total: 7 }, requestId: "req1" }));
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    const result = await zentroApi.projects.inference(
      "p1",
      { provider: "prov", model: "m1", temperature: 0.4, privacyMode: "strict", systemPrompt: "sys", userPrompt: "user", stream: true },
      { workspaceId: "w1" }
    );

    const init = apiCalls(fetchMock)[0][1];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({ provider: "prov", model: "m1", privacyMode: "strict", stream: true });
    expect(result.status).toBe("success");
    expect(result.status === "success" ? result.data.requestId : null).toBe("req1");
  });

  it("safely handles provider and gateway errors", async () => {
    stubRuntimeFetch(jsonResponse({ message: "provider failed for sk_secretValue" }, 503));

    const result = await zentroRequest("/provider-error");

    expect(result.status).toBe("backend-unavailable");
    expect(result.status === "backend-unavailable" ? result.message : "").toContain("[redacted]");
    expect(result.status === "backend-unavailable" ? result.message : "").not.toContain("sk_secretValue");
  });

  it.each([429, 502, 503])("handles HTTP %s without leaking unsafe details", async (status) => {
    stubRuntimeFetch(jsonResponse({ message: "temporary backend issue" }, status));

    const result = await zentroRequest("/status-test");

    expect(result.status).toBe(status === 429 ? "rate-limited" : "backend-unavailable");
    expect("statusCode" in result ? result.statusCode : null).toBe(status);
  });

  it("uses exact Phase G2 usage and billing route paths with auth headers", async () => {
    const fetchMock = stubRuntimeFetch(
      jsonResponse({ requestsToday: 1 }),
      jsonResponse({ requests: [{ day: "Mon", value: 2 }] }),
      jsonResponse([{ model: "m1", requests: 3 }]),
      jsonResponse({ providers: [{ provider: "p1", requests: 4 }] }),
      jsonResponse({ apiKeys: [{ name: "k", prefix: "zt_ab" }] }),
      jsonResponse({ items: [{ requestId: "r1", status: "ok" }], nextCursor: "c2" }),
      jsonResponse({ creditBalance: 50, plan: "pro" })
    );
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "usage-token" }) as never,
      refreshSession: async () => null,
    });

    const context = { workspaceId: "w1", projectId: "p1" };
    await zentroApi.usage.summary({ range: "7d" }, context);
    await zentroApi.usage.timeseries({ range: "30d" }, context);
    await zentroApi.usage.models({ range: "24h" }, context);
    await zentroApi.usage.providers({ range: "billing_period" }, context);
    await zentroApi.usage.apiKeys({ range: "7d" }, context);
    await zentroApi.usage.requests({ range: "7d", status: "error", cursor: "c1" }, context);
    await zentroApi.platformBilling.summary({}, context);

    expect(apiCalls(fetchMock).map((call) => String(call[0]))).toEqual([
      "https://api.example.test/v1/usage/summary?range=7d",
      "https://api.example.test/v1/usage/timeseries?range=30d",
      "https://api.example.test/v1/usage/models?range=24h",
      "https://api.example.test/v1/usage/providers?range=billing_period",
      "https://api.example.test/v1/usage/api-keys?range=7d",
      "https://api.example.test/v1/usage/requests?range=7d&status=error&cursor=c1",
      "https://api.example.test/v1/billing/summary",
    ]);

    const headers = apiCalls(fetchMock)[0][1].headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer usage-token");
    expect(headers.get("X-Workspace-Id")).toBe("w1");
    expect(headers.get("X-Project-Id")).toBe("p1");
  });

  it("parses Phase G2 usage list schemas for arrays and wrapped objects", async () => {
    stubRuntimeFetch(jsonResponse([{ model: "m1", requests: "9" }]), jsonResponse({ providers: [{ provider: "openai", successRate: 0.99 }] }));
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    const models = await zentroApi.usage.models();
    const providers = await zentroApi.usage.providers();

    expect(models.status).toBe("success");
    expect(providers.status).toBe("success");
    expect(models.status === "success" ? models.data : null).toEqual([{ model: "m1", requests: "9" }]);
    expect(providers.status === "success" ? providers.data : null).toMatchObject({ providers: [{ provider: "openai", successRate: 0.99 }] });
  });

  it("marks missing Phase G2 usage endpoints as capability-required", async () => {
    stubRuntimeFetch(jsonResponse({ message: "not found" }, 404));
    configureZentroApiAuth({
      getSession: async () => ({ access_token: "token" }) as never,
      refreshSession: async () => null,
    });

    const result = await zentroApi.usage.summary({ range: "7d" });
    expect(result.status).toBe("capability-required");
  });
});
