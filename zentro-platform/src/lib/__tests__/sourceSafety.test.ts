import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = join(process.cwd(), "src");

function readSourceFiles(directory: string): string {
  return readdirSync(directory)
    .filter((entry) => entry !== "__tests__" && entry !== "test")
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory() ? readSourceFiles(path) : readFileSync(path, "utf8");
    })
    .join("\n");
}

describe("source safety", () => {
  const source = readSourceFiles(srcRoot);

  it("does not import mock data or duplicate API clients", () => {
    expect(source).not.toMatch(/mockData|data\/organizations|data\/projects|data\/apikeys|apiClient|platformState/);
  });

  it("does not call providers directly", () => {
    expect(source).not.toMatch(/OpenAI|Groq|Gemini|OpenRouter|Ollama/);
  });

  it("does not reference service-role keys or backend secrets", () => {
    expect(source).not.toMatch(/service[_-]?role|SERVICE_ROLE|JWT_SECRET|provider API key|gateway secret/i);
  });

  it("does not call health all from ordinary health page", () => {
    const healthPage = readFileSync(join(srcRoot, "views", "Health.tsx"), "utf8");
    expect(healthPage).not.toContain("healthAll");
    expect(healthPage).not.toContain("/health/all");
  });
});
