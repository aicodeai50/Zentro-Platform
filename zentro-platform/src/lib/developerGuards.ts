export type SnippetLanguage = "cURL" | "JavaScript" | "TypeScript" | "Python";

export type PlaygroundCodeConfig = {
  baseUrl: string;
  mode: "platform" | "gateway";
  projectId: string;
  model: string;
  provider: string;
  systemMessage: string;
  userMessage: string;
  temperature: number;
  maxTokens?: number;
  stream: boolean;
};

export const CONFIRMED_PLATFORM_INFERENCE = "/v1/projects/:projectId/playground/inference";
export const PREFERRED_CHAT_COMPLETIONS = "/v1/chat/completions";
export const PREFERRED_TEXT_COMPLETIONS = "/v1/completions";
export const PREFERRED_MODELS = "/v1/models";

const memoryKeys = new WeakMap<object, string>();

export function storeMemoryApiKey(owner: object, value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    memoryKeys.delete(owner);
    return;
  }

  memoryKeys.set(owner, trimmed);
}

export function readMemoryApiKey(owner: object) {
  return memoryKeys.get(owner) ?? "";
}

export function clearMemoryApiKey(owner: object) {
  memoryKeys.delete(owner);
}

export function assertKeyNotPersisted(storage: Storage, needle: string) {
  if (!needle) {
    return true;
  }

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) {
      continue;
    }

    if (storage.getItem(key)?.includes(needle)) {
      return false;
    }
  }

  return true;
}

export function containsEmbeddedApiKey(value: string) {
  return /(?:sk|pk|whsec|zentro|zt|gsk)_[A-Za-z0-9_-]{8,}/.test(value) || /Bearer\s+(?!\$\{|<ZENTRO_API_KEY>|<supabase-jwt>)[A-Za-z0-9._-]{12,}/i.test(value);
}

export function openApiHasPath(document: unknown, path: string) {
  if (!document || typeof document !== "object") {
    return false;
  }

  const paths = (document as { paths?: Record<string, unknown> }).paths;
  if (!paths || typeof paths !== "object") {
    return false;
  }

  return Object.keys(paths).some((entry) => entry === path || entry.replace(/\{[^}]+\}/g, ":param") === path);
}

export function extractGatewayModelRows(data: unknown) {
  if (Array.isArray(data)) {
    return data.map(asRecord);
  }

  const record = asRecord(data);
  for (const key of ["data", "models", "items"]) {
    if (Array.isArray(record[key])) {
      return (record[key] as unknown[]).map(asRecord);
    }
  }

  return [];
}

export function filterGatewayModels(
  rows: Record<string, unknown>[],
  filters: { provider?: string; capability?: string; availability?: string; streaming?: string; search?: string }
) {
  const provider = filters.provider?.trim().toLowerCase() ?? "";
  const capability = filters.capability?.trim().toLowerCase() ?? "";
  const availability = filters.availability?.trim().toLowerCase() ?? "";
  const streaming = filters.streaming?.trim().toLowerCase() ?? "";
  const search = filters.search?.trim().toLowerCase() ?? "";

  return rows.filter((row) => {
    const id = String(row.id ?? row.model ?? row.name ?? "").toLowerCase();
    const rowProvider = String(row.provider ?? row.owned_by ?? "").toLowerCase();
    const caps = String(row.capabilities ?? row.capability ?? "").toLowerCase();
    const avail = String(row.availability ?? row.status ?? "").toLowerCase();
    const streamValue = String(row.streaming ?? row.supportsStreaming ?? "").toLowerCase();

    if (provider && !rowProvider.includes(provider)) return false;
    if (capability && !caps.includes(capability)) return false;
    if (availability && !avail.includes(availability)) return false;
    if (streaming === "true" && !(streamValue === "true" || streamValue === "yes" || streamValue === "1")) return false;
    if (streaming === "false" && (streamValue === "true" || streamValue === "yes" || streamValue === "1")) return false;
    if (search && !id.includes(search) && !rowProvider.includes(search)) return false;
    return true;
  });
}

export function fieldOrNotReported(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not reported";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

export function buildPlaygroundCode(language: SnippetLanguage, config: PlaygroundCodeConfig) {
  if (config.mode === "gateway") {
    return buildGatewayCode(language, config);
  }

  return buildPlatformCode(language, config);
}

function buildPlatformCode(language: SnippetLanguage, config: PlaygroundCodeConfig) {
  const endpoint = `${trimSlash(config.baseUrl)}/v1/projects/${config.projectId || ":projectId"}/playground/inference`;
  const body = {
    provider: config.provider,
    model: config.model,
    temperature: config.temperature,
    privacyMode: "standard",
    stream: config.stream,
    systemPrompt: config.systemMessage,
    userPrompt: config.userMessage,
    ...(config.maxTokens ? { maxTokens: config.maxTokens } : {}),
  };
  const json = JSON.stringify(body, null, 2);

  switch (language) {
    case "JavaScript":
      return `const response = await fetch(${JSON.stringify(endpoint)}, {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    Authorization: \`Bearer \${session.access_token}\`,\n  },\n  body: JSON.stringify(${json}),\n});\nconst data = await response.json();`;
    case "TypeScript":
      return `const response = await fetch(${JSON.stringify(endpoint)}, {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    Authorization: \`Bearer \${session.access_token}\`,\n  },\n  body: JSON.stringify(${json} satisfies Record<string, unknown>),\n});\nconst data: unknown = await response.json();`;
    case "Python":
      return `import os\nimport requests\n\nresponse = requests.post(\n    ${JSON.stringify(endpoint)},\n    headers={"Authorization": f"Bearer {os.environ['SUPABASE_ACCESS_TOKEN']}"},\n    json=${json},\n)\nprint(response.json())`;
    case "cURL":
    default:
      return `curl ${JSON.stringify(endpoint)} \\\n  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d ${JSON.stringify(JSON.stringify(body))}`;
  }
}

function buildGatewayCode(language: SnippetLanguage, config: PlaygroundCodeConfig) {
  const endpoint = `${trimSlash(config.baseUrl)}${PREFERRED_CHAT_COMPLETIONS}`;
  const body = {
    model: config.model || "auto",
    ...(config.provider ? { provider: config.provider } : {}),
    temperature: config.temperature,
    stream: config.stream,
    ...(config.maxTokens ? { max_tokens: config.maxTokens } : {}),
    messages: [
      ...(config.systemMessage ? [{ role: "system", content: config.systemMessage }] : []),
      { role: "user", content: config.userMessage || "Hello from Zentro" },
    ],
  };
  const json = JSON.stringify(body, null, 2);

  switch (language) {
    case "JavaScript":
      return `const response = await fetch(${JSON.stringify(endpoint)}, {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    Authorization: \`Bearer \${process.env.ZENTRO_API_KEY}\`,\n  },\n  body: JSON.stringify(${json}),\n});${config.stream ? "\n// Handle SSE stream from response.body.getReader()" : "\nconst data = await response.json();"}`;
    case "TypeScript":
      return `const apiKey = process.env.ZENTRO_API_KEY!;\nconst response = await fetch(${JSON.stringify(endpoint)}, {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    Authorization: \`Bearer \${apiKey}\`,\n  },\n  body: JSON.stringify(${json}),\n});${config.stream ? "\n// Parse text/event-stream chunks until [DONE]" : "\nconst data: unknown = await response.json();"}`;
    case "Python":
      return `import os\nimport requests\n\nresponse = requests.post(\n    ${JSON.stringify(endpoint)},\n    headers={"Authorization": f"Bearer {os.environ['ZENTRO_API_KEY']}"},\n    json=${json},\n    stream=${config.stream ? "True" : "False"},\n)\n${config.stream ? "for line in response.iter_lines():\n    print(line)" : "print(response.json())"}`;
    case "cURL":
    default:
      return `curl ${JSON.stringify(endpoint)} \\\n  -H "Authorization: Bearer $ZENTRO_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d ${JSON.stringify(JSON.stringify(body))}`;
  }
}

export function buildQuickStartExamples(baseUrl: string, chatAvailable: boolean) {
  const root = trimSlash(baseUrl) || "https://api.example.invalid";

  if (chatAvailable) {
    const body = {
      model: "auto",
      messages: [{ role: "user", content: "Hello from Zentro" }],
    };

    return {
      curl: `curl ${root}/v1/chat/completions \\\n  -H "Authorization: Bearer $ZENTRO_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`,
      typescript: `const response = await fetch("${root}/v1/chat/completions", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    Authorization: \`Bearer \${process.env.ZENTRO_API_KEY}\`,\n  },\n  body: JSON.stringify(${JSON.stringify(body, null, 2)}),\n});\nconst data = await response.json();`,
      python: `import os\nimport requests\n\nresponse = requests.post(\n    "${root}/v1/chat/completions",\n    headers={"Authorization": f"Bearer {os.environ['ZENTRO_API_KEY']}"},\n    json=${JSON.stringify(body, null, 2)},\n)\nprint(response.json())`,
      endpoint: PREFERRED_CHAT_COMPLETIONS,
    };
  }

  const body = {
    provider: "auto",
    model: "auto",
    temperature: 0.7,
    privacyMode: "standard",
    stream: false,
    systemPrompt: "",
    userPrompt: "Hello from Zentro",
  };

  return {
    curl: `curl ${root}/v1/projects/$PROJECT_ID/playground/inference \\\n  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`,
    typescript: `const response = await fetch(\`${root}/v1/projects/\${projectId}/playground/inference\`, {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    Authorization: \`Bearer \${session.access_token}\`,\n  },\n  body: JSON.stringify(${JSON.stringify(body, null, 2)}),\n});`,
    python: `import os\nimport requests\n\nresponse = requests.post(\n    f"${root}/v1/projects/{os.environ['PROJECT_ID']}/playground/inference",\n    headers={"Authorization": f"Bearer {os.environ['SUPABASE_ACCESS_TOKEN']}"},\n    json=${JSON.stringify(body, null, 2)},\n)`,
    endpoint: CONFIRMED_PLATFORM_INFERENCE,
  };
}

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
