import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dynamic, GET, runtime } from "../route";

const envKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_ZENTRO_API_URL",
  "NEXT_PUBLIC_SITE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_SECRET",
  "DATABASE_URL",
  "INTERNAL_GATEWAY_SECRET",
] as const;

const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

describe("GET /api/public-config", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    process.env.NEXT_PUBLIC_ZENTRO_API_URL = "https://api.example.test";
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.example.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    process.env.JWT_SECRET = "jwt-secret";
    process.env.DATABASE_URL = "postgres://secret";
    process.env.INTERNAL_GATEWAY_SECRET = "gateway-secret";
  });

  afterEach(() => {
    for (const key of envKeys) {
      const originalValue = originalEnv[key];

      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
    }
  });

  it("returns only allowed public runtime fields", async () => {
    const response = GET();
    const body = await response.json();

    expect(body).toEqual({
      supabaseUrl: "https://supabase.example.test",
      supabasePublishableKey: "publishable-key",
      zentroApiUrl: "https://api.example.test",
      siteUrl: "https://app.example.test",
    });
    expect(Object.keys(body).sort()).toEqual(["siteUrl", "supabasePublishableKey", "supabaseUrl", "zentroApiUrl"]);
    expect(JSON.stringify(body)).not.toContain("service-role-secret");
    expect(JSON.stringify(body)).not.toContain("jwt-secret");
    expect(JSON.stringify(body)).not.toContain("postgres://secret");
    expect(JSON.stringify(body)).not.toContain("gateway-secret");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("uses Node runtime and dynamic execution", () => {
    expect(runtime).toBe("nodejs");
    expect(dynamic).toBe("force-dynamic");
  });

  it("reads environment values at request time", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://first-supabase.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "first-publishable-key";
    process.env.NEXT_PUBLIC_ZENTRO_API_URL = "https://first-api.example.test";
    process.env.NEXT_PUBLIC_SITE_URL = "https://first-app.example.test";

    const firstBody = await GET().json();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://second-supabase.example.test";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "second-publishable-key";
    process.env.NEXT_PUBLIC_ZENTRO_API_URL = "https://second-api.example.test";
    process.env.NEXT_PUBLIC_SITE_URL = "https://second-app.example.test";

    const secondBody = await GET().json();

    expect(firstBody).toEqual({
      supabaseUrl: "https://first-supabase.example.test",
      supabasePublishableKey: "first-publishable-key",
      zentroApiUrl: "https://first-api.example.test",
      siteUrl: "https://first-app.example.test",
    });
    expect(secondBody).toEqual({
      supabaseUrl: "https://second-supabase.example.test",
      supabasePublishableKey: "second-publishable-key",
      zentroApiUrl: "https://second-api.example.test",
      siteUrl: "https://second-app.example.test",
    });
  });
});
