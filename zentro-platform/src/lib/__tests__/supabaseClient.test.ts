import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn(() => ({ id: "supabase-client" })));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

import { resetPublicConfigCacheForTests } from "../publicConfig";
import { getSupabaseClient, resetSupabaseClientForTests } from "../supabaseClient";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
  });
}

describe("Supabase browser client", () => {
  beforeEach(() => {
    createClientMock.mockClear();
    resetPublicConfigCacheForTests();
    resetSupabaseClientForTests();
  });

  afterEach(() => {
    resetPublicConfigCacheForTests();
    resetSupabaseClientForTests();
  });

  it("uses the cached runtime config and creates one client instance", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        supabaseUrl: "https://supabase.example.test",
        supabasePublishableKey: "publishable-key",
        zentroApiUrl: "https://api.example.test",
        siteUrl: "https://app.example.test",
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const [firstClient, secondClient] = await Promise.all([getSupabaseClient(), getSupabaseClient()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith("https://supabase.example.test", "publishable-key", {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
    expect(firstClient).toBe(secondClient);
  });
});
