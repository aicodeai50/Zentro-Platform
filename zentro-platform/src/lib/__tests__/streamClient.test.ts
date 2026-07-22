import { describe, expect, it } from "vitest";
import { parseSseChunk } from "../streamClient";

describe("streamClient", () => {
  it("parses OpenAI-compatible SSE chunks and [DONE]", () => {
    const events = parseSseChunk(
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\ndata: [DONE]\n\n'
    );

    expect(events.map((event) => event.text ?? (event.done ? "[DONE]" : ""))).toEqual(["Hel", "lo", "[DONE]"]);
    expect(events.at(-1)?.done).toBe(true);
  });
});
