export type StreamChunk = {
  raw: string;
  text?: string;
  done: boolean;
};

export function parseSseChunk(chunk: string): StreamChunk[] {
  const events: StreamChunk[] = [];
  const blocks = chunk.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split(/\n/).map((line) => line.trimEnd());
    const dataLines = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim());

    if (!dataLines.length) {
      continue;
    }

    const data = dataLines.join("\n");
    if (data === "[DONE]") {
      events.push({ raw: data, done: true });
      continue;
    }

    try {
      const parsed = JSON.parse(data) as {
        choices?: Array<{ delta?: { content?: string }; text?: string }>;
        content?: string;
        text?: string;
      };
      const text =
        parsed.choices?.[0]?.delta?.content ??
        parsed.choices?.[0]?.text ??
        (typeof parsed.content === "string" ? parsed.content : undefined) ??
        (typeof parsed.text === "string" ? parsed.text : undefined);
      events.push({ raw: data, text, done: false });
    } catch {
      events.push({ raw: data, text: data, done: false });
    }
  }

  return events;
}

export async function readEventStream(
  response: Response,
  onChunk: (chunk: StreamChunk) => void,
  signal?: AbortSignal
) {
  if (!response.body) {
    throw new Error("Streaming response body is unavailable.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\n\n/);
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        for (const event of parseSseChunk(`${part}\n\n`)) {
          onChunk(event);
          if (event.done) {
            return;
          }
        }
      }
    }

    if (buffer.trim()) {
      for (const event of parseSseChunk(`${buffer}\n\n`)) {
        onChunk(event);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function isEventStreamResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("text/event-stream") || contentType.includes("application/x-ndjson");
}
