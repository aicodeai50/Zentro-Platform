import { describe, expect, it } from "vitest";
import {
  assertKeyNotPersisted,
  buildPlaygroundCode,
  buildQuickStartExamples,
  clearMemoryApiKey,
  containsEmbeddedApiKey,
  openApiHasPath,
  readMemoryApiKey,
  storeMemoryApiKey,
} from "../developerGuards";

describe("developerGuards", () => {
  it("keeps manual API keys in memory only", () => {
    const owner = { id: "playground" };
    storeMemoryApiKey(owner, "zt_test_memory_key_value");
    expect(readMemoryApiKey(owner)).toBe("zt_test_memory_key_value");
    clearMemoryApiKey(owner);
    expect(readMemoryApiKey(owner)).toBe("");
  });

  it("detects embedded real keys and allows env placeholders", () => {
    expect(containsEmbeddedApiKey("Authorization: Bearer $ZENTRO_API_KEY")).toBe(false);
    expect(containsEmbeddedApiKey("Authorization: Bearer <ZENTRO_API_KEY>")).toBe(false);
    expect(containsEmbeddedApiKey("Authorization: Bearer zt_live_abcdefghijklmnop")).toBe(true);
  });

  it("generates quick-start examples without embedding secrets", () => {
    const chat = buildQuickStartExamples("https://api.example.test/", true);
    expect(chat.endpoint).toBe("/v1/chat/completions");
    expect(chat.curl).toContain("$ZENTRO_API_KEY");
    expect(containsEmbeddedApiKey(chat.curl)).toBe(false);
    expect(containsEmbeddedApiKey(chat.typescript)).toBe(false);

    const fallback = buildQuickStartExamples("https://api.example.test/", false);
    expect(fallback.endpoint).toContain("/playground/inference");
    expect(fallback.python).toContain("SUPABASE_ACCESS_TOKEN");
  });

  it("generates stream and non-stream playground snippets with env vars", () => {
    const streamed = buildPlaygroundCode("TypeScript", {
      baseUrl: "https://api.example.test",
      mode: "gateway",
      projectId: "p1",
      model: "llama-3",
      provider: "groq",
      systemMessage: "sys",
      userMessage: "hi",
      temperature: 0.2,
      maxTokens: 128,
      stream: true,
    });
    expect(streamed).toContain("llama-3");
    expect(streamed).toContain("ZENTRO_API_KEY");
    expect(streamed).toContain('"stream": true');
    expect(containsEmbeddedApiKey(streamed)).toBe(false);

    const platform = buildPlaygroundCode("cURL", {
      baseUrl: "https://api.example.test",
      mode: "platform",
      projectId: "p1",
      model: "m1",
      provider: "auto",
      systemMessage: "",
      userMessage: "hello",
      temperature: 0.7,
      stream: false,
    });
    expect(platform).toContain("/v1/projects/p1/playground/inference");
    expect(platform).toContain("$SUPABASE_ACCESS_TOKEN");
  });

  it("detects OpenAPI paths and storage leaks", () => {
    expect(openApiHasPath({ paths: { "/v1/chat/completions": { post: {} } } }, "/v1/chat/completions")).toBe(true);
    expect(openApiHasPath({ paths: {} }, "/v1/chat/completions")).toBe(false);

    const storage = {
      length: 1,
      key: () => "x",
      getItem: () => "secret zt_live_abcdefghijklmnop",
    } as unknown as Storage;
    expect(assertKeyNotPersisted(storage, "zt_live_abcdefghijklmnop")).toBe(false);
  });
});
