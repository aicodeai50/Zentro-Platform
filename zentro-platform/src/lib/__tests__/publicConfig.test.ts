import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicConfig, resetPublicConfigCacheForTests } from "../publicConfig";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

describe("public runtime config client", () => {
  beforeEach(() => {
    resetPublicConfigCacheForTests();
  });

  afterEach(() => {
    resetPublicConfigCacheForTests();
  });

  it("caches the public config request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        supabaseUrl: "https://supabase.example.test",
        supabasePublishableKey: "publishable-key",
        zentroApiUrl: "https://api.example.test",
        siteUrl: "https://app.example.test",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const [firstConfig, secondConfig] = await Promise.all([getPublicConfig(), getPublicConfig()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/public-config", { cache: "no-store" });
    expect(firstConfig).toBe(secondConfig);
  });
});
