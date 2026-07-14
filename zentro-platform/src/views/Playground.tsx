import { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { redactSecretLikeText } from "../lib/phaseDGuards";
import { zentroApi, type ApiResult, type PlaygroundInferenceResult } from "../lib/zentroApi";

const languages = ["cURL", "JavaScript", "Python"] as const;

type SnippetLanguage = (typeof languages)[number];

export function Playground() {
  const { apiContext, activeProjectId } = useAppSession();
  const ai = useApiResource(() => zentroApi.ai.providers(apiContext), [apiContext.workspaceId, apiContext.projectId]);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [privacyMode, setPrivacyMode] = useState("standard");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [language, setLanguage] = useState<SnippetLanguage>("cURL");
  const [result, setResult] = useState<ApiResult<PlaygroundInferenceResult> | null>(null);

  const snippet = useMemo(
    () => buildSnippet(language, activeProjectId ?? ":projectId", { provider, model, temperature, privacyMode, systemPrompt, userPrompt, streaming }),
    [activeProjectId, language, model, privacyMode, provider, streaming, systemPrompt, temperature, userPrompt]
  );

  async function copySnippet() {
    await navigator.clipboard.writeText(snippet);
  }

  async function runPlayground() {
    if (!activeProjectId) {
      setResult({ status: "error", endpoint: "/v1/projects/:projectId/playground/inference", message: "Select a project before running inference." });
      return;
    }

    const nextResult = await zentroApi.projects.inference(
      activeProjectId,
      {
        provider,
        model,
        temperature: Number(temperature),
        privacyMode,
        systemPrompt,
        userPrompt,
        stream: streaming,
      },
      apiContext
    );
    setResult(nextResult);
  }

  return (
    <>
      <PageHeader
        eyebrow="Playground"
        title="API playground"
        description="Run live Phase D project inference with provider, model, prompts, temperature, privacy mode, streaming, and safe error display."
      />

      <BackendState resource={ai}>
        {(data) => {
          const providers = extractNames(data.providers);
          const models = extractNames(data.localModels);

          return (
            <div className="playground-grid">
              <Card>
                <div className="card-heading">
                  <h2>Request</h2>
                  <span>GET /providers</span>
                </div>
                <div className="form-grid">
                  <label>
                    Provider
                    <select value={provider} onChange={(event) => setProvider(event.target.value)}>
                      <option value="">Select provider</option>
                      {providers.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Model
                    <select value={model} onChange={(event) => setModel(event.target.value)}>
                      <option value="">Select model</option>
                      {models.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Temperature
                    <input
                      min="0"
                      max="2"
                      step="0.1"
                      type="number"
                      value={temperature}
                      onChange={(event) => setTemperature(event.target.value)}
                    />
                  </label>
                  <label>
                    Privacy mode
                    <select value={privacyMode} onChange={(event) => setPrivacyMode(event.target.value)}>
                      <option value="standard">Standard</option>
                      <option value="strict">Strict</option>
                      <option value="zero-retention">Zero retention</option>
                    </select>
                  </label>
                  <label>
                    System prompt
                    <textarea rows={4} value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} />
                  </label>
                  <label>
                    User prompt
                    <textarea rows={6} value={userPrompt} onChange={(event) => setUserPrompt(event.target.value)} />
                  </label>
                  <label className="toggle-row">
                    <input type="checkbox" checked={streaming} onChange={(event) => setStreaming(event.target.checked)} />
                    Streaming
                  </label>
                  <button className="primary-button" type="button" onClick={runPlayground}>
                    Run using backend
                  </button>
                </div>
              </Card>

              <div className="stack-list">
                <Card>
                  <div className="card-heading">
                    <h2>Response</h2>
                    <span>POST /v1/projects/:projectId/playground/inference</span>
                  </div>
                  <ValueList value={result ? renderPlaygroundResult(result) : "Run a request to see the live backend response."} />
                  <div className="metric-grid compact">
                    <div className="mini-stat"><span>Latency</span><strong>{result?.status === "success" ? formatMetric(result.data.latencyMs ?? result.data.latency) : "Not returned"}</strong></div>
                    <div className="mini-stat"><span>Provider</span><strong>{result?.status === "success" ? result.data.providerUsed ?? result.data.provider ?? "Not returned" : "Not returned"}</strong></div>
                    <div className="mini-stat"><span>Model</span><strong>{result?.status === "success" ? result.data.modelUsed ?? result.data.model ?? "Not returned" : "Not returned"}</strong></div>
                    <div className="mini-stat"><span>Token usage</span><strong>{result?.status === "success" ? formatMetric(result.data.tokenUsage ?? result.data.usage) : "Not returned"}</strong></div>
                    <div className="mini-stat"><span>Request id</span><strong>{result?.status === "success" ? result.data.requestId ?? result.data.id ?? "Not returned" : "Not returned"}</strong></div>
                  </div>
                </Card>

                <Card>
                  <div className="card-heading">
                    <h2>Copy request</h2>
                    <select value={language} onChange={(event) => setLanguage(event.target.value as SnippetLanguage)}>
                      {languages.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <pre><code>{snippet}</code></pre>
                  <button className="ghost-button" type="button" onClick={copySnippet}>
                    Copy {language}
                  </button>
                </Card>
              </div>
            </div>
          );
        }}
      </BackendState>
    </>
  );
}

function extractNames(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        return record.name ?? record.id ?? record.model;
      }

      return null;
    })
    .filter((item): item is string => typeof item === "string" && item.length > 0);
}

function buildSnippet(
  language: SnippetLanguage,
  projectId: string,
  payload: {
    provider: string;
    model: string;
    temperature: string;
    privacyMode: string;
    systemPrompt: string;
    userPrompt: string;
    streaming: boolean;
  }
) {
  const body = {
    provider: payload.provider,
    model: payload.model,
    temperature: Number(payload.temperature),
    privacyMode: payload.privacyMode,
    stream: payload.streaming,
    systemPrompt: payload.systemPrompt,
    userPrompt: payload.userPrompt,
  };
  const endpoint = `/v1/projects/${projectId}/playground/inference`;
  const json = JSON.stringify(body, null, 2);

  switch (language) {
    case "JavaScript":
      return `await fetch("${endpoint}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json", Authorization: "Bearer <supabase-jwt>" },\n  body: JSON.stringify(${json})\n});`;
    case "Python":
      return `import requests\n\nrequests.post("${endpoint}", headers={"Authorization": "Bearer <supabase-jwt>"}, json=${json})`;
    case "cURL":
    default:
      return `curl ${endpoint} \\\n  -H "Authorization: Bearer <supabase-jwt>" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`;
  }
}

function renderPlaygroundResult(result: ApiResult<PlaygroundInferenceResult>) {
  if (result.status !== "success") {
    return redactSecretLikeText(result.message);
  }

  return result.data.response ?? result.data.content ?? result.data.text ?? result.data;
}

function formatMetric(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not returned";
  }

  return typeof value === "object" ? JSON.stringify(value) : String(value);
}
