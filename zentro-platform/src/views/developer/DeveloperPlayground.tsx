import { useEffect, useMemo, useRef, useState } from "react";
import { CodeBlock } from "../../components/developer/CodeBlock";
import { Card } from "../../components/ui/Card";
import { BackendState } from "../../components/ui/BackendState";
import { useAppSession } from "../../lib/appSession";
import {
  buildPlaygroundCode,
  clearMemoryApiKey,
  containsEmbeddedApiKey,
  openApiHasPath,
  PREFERRED_CHAT_COMPLETIONS,
  readMemoryApiKey,
  storeMemoryApiKey,
  type SnippetLanguage,
} from "../../lib/developerGuards";
import { getPublicConfig } from "../../lib/publicConfig";
import { isEventStreamResponse, readEventStream } from "../../lib/streamClient";
import { useApiResource } from "../../lib/useApiResource";
import { getZentroApiBaseUrl, zentroApi, type ApiResult } from "../../lib/zentroApi";

type RunMode = "platform" | "gateway";

export function DeveloperPlayground() {
  const { apiContext, activeProjectId, activeWorkspaceId, bootstrap, selectProject } = useAppSession();
  const keyOwner = useRef({ scope: "developer-playground" });
  const abortRef = useRef<AbortController | null>(null);

  const projects = bootstrap?.projects ?? [];
  const ai = useApiResource(() => zentroApi.ai.providers(apiContext), [apiContext.workspaceId, apiContext.projectId]);
  const keys = useApiResource(
    () => (activeProjectId ? zentroApi.developerApi.projectKeys(activeProjectId, apiContext) : zentroApi.developerApi.keys(apiContext)),
    [activeProjectId, activeWorkspaceId]
  );
  const openApi = useApiResource(() => zentroApi.gateway.openApi(), []);

  const [mode, setMode] = useState<RunMode>("platform");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [systemMessage, setSystemMessage] = useState("You are a helpful assistant.");
  const [userMessage, setUserMessage] = useState("");
  const [temperature, setTemperature] = useState("0.7");
  const [maxTokens, setMaxTokens] = useState("");
  const [stream, setStream] = useState(false);
  const [manualKey, setManualKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState("");
  const [language, setLanguage] = useState<SnippetLanguage>("TypeScript");
  const [baseUrl, setBaseUrl] = useState("");
  const [status, setStatus] = useState("Idle");
  const [streamText, setStreamText] = useState("");
  const [result, setResult] = useState<ApiResult<Record<string, unknown>> | null>(null);
  const [rawJson, setRawJson] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  const gatewayAvailable =
    openApi.state === "loaded" && openApi.result.status === "success" && openApiHasPath(openApi.result.data, PREFERRED_CHAT_COMPLETIONS);

  useEffect(() => {
    void getPublicConfig()
      .then((config) => setBaseUrl(config.zentroApiUrl))
      .catch(() => setBaseUrl(""));
  }, []);

  useEffect(() => {
    const owner = keyOwner.current;
    return () => {
      clearMemoryApiKey(owner);
    };
  }, []);

  useEffect(() => {
    const owner = keyOwner.current;
    function onUnload() {
      clearMemoryApiKey(owner);
    }

    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      clearMemoryApiKey(owner);
    };
  }, []);

  const snippet = useMemo(
    () =>
      buildPlaygroundCode(language, {
        baseUrl: baseUrl || "https://api.example.invalid",
        mode: mode === "gateway" && gatewayAvailable ? "gateway" : "platform",
        projectId: activeProjectId ?? ":projectId",
        model,
        provider,
        systemMessage,
        userMessage,
        temperature: Number(temperature) || 0.7,
        maxTokens: maxTokens ? Number(maxTokens) : undefined,
        stream,
      }),
    [activeProjectId, baseUrl, gatewayAvailable, language, maxTokens, mode, model, provider, stream, systemMessage, temperature, userMessage]
  );

  const selectedKeyMeta =
    keys.state === "loaded" && keys.result.status === "success"
      ? keys.result.data.find((key) => key.id === selectedKeyId)
      : undefined;

  function onManualKeyChange(value: string) {
    setManualKey(value);
    storeMemoryApiKey(keyOwner.current, value);
  }

  function stopGeneration() {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("Stopped");
  }

  function clearOutput() {
    stopGeneration();
    setResult(null);
    setStreamText("");
    setRawJson("");
    setStatus("Idle");
  }

  async function runRequest() {
    clearOutput();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("Running");

    const context = { ...apiContext, signal: controller.signal };
    const temp = Number(temperature) || 0.7;
    const tokens = maxTokens ? Number(maxTokens) : undefined;

    try {
      if (mode === "gateway") {
        if (!gatewayAvailable) {
          setStatus("Gateway route unavailable");
          setResult({
            status: "capability-required",
            endpoint: PREFERRED_CHAT_COMPLETIONS,
            statusCode: 501,
            message: "Backend capability required for public chat completions.",
          });
          return;
        }

        const memoryKey = readMemoryApiKey(keyOwner.current) || manualKey.trim();
        if (!memoryKey) {
          setStatus("API key required");
          setResult({
            status: "unauthorized",
            endpoint: PREFERRED_CHAT_COMPLETIONS,
            statusCode: 401,
            message: "Paste a Zentro API key for gateway mode. Prefix-only key metadata cannot authenticate requests.",
          });
          return;
        }

        if (stream) {
          await runGatewayStream(memoryKey, temp, tokens, controller.signal);
          return;
        }

        const next = await zentroApi.gateway.chatCompletions(
          {
            model: model || "auto",
            provider: provider || undefined,
            temperature: temp,
            max_tokens: tokens,
            stream: false,
            messages: [
              ...(systemMessage ? [{ role: "system", content: systemMessage }] : []),
              { role: "user", content: userMessage },
            ],
          },
          context,
          memoryKey
        );
        setResult(next);
        setRawJson(next.status === "success" ? JSON.stringify(next.data, null, 2) : next.message);
        setStatus(next.status === "success" ? "Completed" : next.status);
        return;
      }

      if (!activeProjectId) {
        setStatus("Project required");
        setResult({
          status: "error",
          endpoint: "/v1/projects/:projectId/playground/inference",
          message: "Select a project before running Platform playground inference.",
        });
        return;
      }

      const next = await zentroApi.projects.inference(
        activeProjectId,
        {
          provider,
          model,
          temperature: temp,
          privacyMode: "standard",
          systemPrompt: systemMessage,
          userPrompt: userMessage,
          stream,
          maxTokens: tokens,
        },
        context
      );
      setResult(next as ApiResult<Record<string, unknown>>);
      if (next.status === "success") {
        const text = String(next.data.response ?? next.data.content ?? next.data.text ?? "");
        setStreamText(text);
        setRawJson(JSON.stringify(next.data, null, 2));
      } else {
        setRawJson(next.message);
      }
      setStatus(next.status === "success" ? "Completed" : next.status);
    } catch (error) {
      if (controller.signal.aborted) {
        setStatus("Stopped");
        return;
      }

      setStatus("Error");
      setResult({
        status: "error",
        endpoint: mode === "gateway" ? PREFERRED_CHAT_COMPLETIONS : "/v1/projects/:projectId/playground/inference",
        message: error instanceof Error ? error.message : "Request failed.",
      });
    } finally {
      abortRef.current = null;
    }
  }

  async function runGatewayStream(apiKey: string, temp: number, tokens: number | undefined, signal: AbortSignal) {
    const root = (await getZentroApiBaseUrl()).replace(/\/$/, "");
    const response = await fetch(`${root}${PREFERRED_CHAT_COMPLETIONS}`, {
      method: "POST",
      headers: {
        Accept: "text/event-stream, application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(apiContext.workspaceId ? { "X-Workspace-Id": apiContext.workspaceId } : {}),
        ...(apiContext.projectId ? { "X-Project-Id": apiContext.projectId } : {}),
      },
      body: JSON.stringify({
        model: model || "auto",
        provider: provider || undefined,
        temperature: temp,
        max_tokens: tokens,
        stream: true,
        messages: [
          ...(systemMessage ? [{ role: "system", content: systemMessage }] : []),
          { role: "user", content: userMessage },
        ],
      }),
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      setStatus("Error");
      if (response.status === 401) {
        setResult({ status: "unauthorized", endpoint: PREFERRED_CHAT_COMPLETIONS, statusCode: 401, message: "Unauthorized." });
      } else if (response.status === 404 || response.status === 405 || response.status === 501) {
        setResult({
          status: "capability-required",
          endpoint: PREFERRED_CHAT_COMPLETIONS,
          statusCode: response.status,
          message: "Backend capability unavailable.",
        });
      } else {
        setResult({ status: "error", endpoint: PREFERRED_CHAT_COMPLETIONS, statusCode: response.status, message: message.slice(0, 300) });
      }
      return;
    }

    if (!isEventStreamResponse(response)) {
      const data = (await response.json()) as Record<string, unknown>;
      setResult({ status: "success", endpoint: PREFERRED_CHAT_COMPLETIONS, data });
      setStreamText(String(data.content ?? data.text ?? JSON.stringify(data)));
      setRawJson(JSON.stringify(data, null, 2));
      setStatus("Completed");
      return;
    }

    let assembled = "";
    const rawParts: string[] = [];
    setStatus("Streaming");
    await readEventStream(
      response,
      (chunk) => {
        rawParts.push(chunk.raw);
        if (chunk.text) {
          assembled += chunk.text;
          setStreamText(assembled);
        }
        if (chunk.done) {
          setStatus("Completed");
        }
      },
      signal
    );
    setRawJson(rawParts.join("\n"));
    setResult({
      status: "success",
      endpoint: PREFERRED_CHAT_COMPLETIONS,
      data: { content: assembled, stream: true },
    });
    if (!signal.aborted) {
      setStatus("Completed");
    }
  }

  return (
    <div className="stack-list">
      <Card>
        <div className="card-heading">
          <h2>API Playground</h2>
          <span aria-live="polite">Status: {status}</span>
        </div>
        <p className="muted-text">
          Default mode uses the authenticated Supabase JWT through `{`POST /v1/projects/:projectId/playground/inference`}`. Gateway mode uses a
          memory-only pasted API key and never persists it.
        </p>
        <div className="form-grid">
          <label>
            Mode
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as RunMode)}
              aria-label="Playground authentication mode"
            >
              <option value="platform">Platform JWT playground endpoint</option>
              <option value="gateway" disabled={!gatewayAvailable}>
                Public chat completions {gatewayAvailable ? "" : "(unavailable)"}
              </option>
            </select>
          </label>
          <label>
            Project
            <select
              value={activeProjectId ?? ""}
              onChange={(event) => selectProject(event.target.value || null)}
              aria-label="Project selector"
            >
              <option value="">Select project</option>
              {projects.map((project) => (
                <option key={String(project.id)} value={String(project.id)}>
                  {String(project.name ?? project.id)}
                </option>
              ))}
            </select>
          </label>
          <BackendState resource={keys} title="API keys">
            {(data) => (
              <label>
                API key (metadata only)
                <select value={selectedKeyId} onChange={(event) => setSelectedKeyId(event.target.value)} aria-label="API key selector">
                  <option value="">No key selected</option>
                  {data.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.name ?? "Unnamed"} · {key.prefix ?? "prefix unavailable"}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </BackendState>
          {selectedKeyMeta ? (
            <p className="muted-text">
              Selected prefix `{selectedKeyMeta.prefix ?? "Not returned"}` cannot authenticate requests by itself.
            </p>
          ) : null}
          {mode === "gateway" ? (
            <>
              <label>
                API key (memory only)
                <input
                  type={showKey ? "text" : "password"}
                  value={manualKey}
                  autoComplete="off"
                  onChange={(event) => onManualKeyChange(event.target.value)}
                  aria-label="Manual API key"
                />
              </label>
              <label className="toggle-row">
                <input type="checkbox" checked={showKey} onChange={(event) => setShowKey(event.target.checked)} />
                Show key
              </label>
            </>
          ) : null}
        </div>
      </Card>

      <BackendState resource={ai} onRetry={ai.reload} title="Providers and models">
        {(data) => {
          const providers = extractNames(data.providers);
          const models = extractNames(data.localModels);

          return (
            <div className="playground-grid">
              <Card>
                <div className="card-heading">
                  <h2>Request</h2>
                  <span>{mode === "gateway" ? PREFERRED_CHAT_COMPLETIONS : "POST /v1/projects/:projectId/playground/inference"}</span>
                </div>
                <div className="form-grid">
                  <label>
                    Provider
                    <select value={provider} onChange={(event) => setProvider(event.target.value)} aria-label="Provider selector">
                      <option value="">Select provider</option>
                      <option value="auto">auto</option>
                      {providers.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Model
                    <select value={model} onChange={(event) => setModel(event.target.value)} aria-label="Model selector">
                      <option value="">Select model</option>
                      <option value="auto">auto</option>
                      {models.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Temperature
                    <input min="0" max="2" step="0.1" type="number" value={temperature} onChange={(event) => setTemperature(event.target.value)} />
                  </label>
                  <label>
                    Max tokens
                    <input min="1" type="number" value={maxTokens} onChange={(event) => setMaxTokens(event.target.value)} aria-label="Max tokens" />
                  </label>
                  <label>
                    System message
                    <textarea rows={3} value={systemMessage} onChange={(event) => setSystemMessage(event.target.value)} />
                  </label>
                  <label>
                    User message
                    <textarea rows={5} value={userMessage} onChange={(event) => setUserMessage(event.target.value)} />
                  </label>
                  <label className="toggle-row">
                    <input type="checkbox" checked={stream} onChange={(event) => setStream(event.target.checked)} />
                    Stream response
                  </label>
                  <div className="topbar-actions">
                    <button className="primary-button" type="button" onClick={() => void runRequest()}>
                      Run
                    </button>
                    <button className="ghost-button" type="button" onClick={stopGeneration}>
                      Stop generation
                    </button>
                    <button className="ghost-button" type="button" onClick={clearOutput}>
                      Clear
                    </button>
                    <button className="ghost-button" type="button" onClick={() => void runRequest()}>
                      Retry
                    </button>
                  </div>
                </div>
              </Card>

              <div className="stack-list">
                <Card>
                  <div className="card-heading">
                    <h2>Response</h2>
                    <span aria-live="polite">{status}</span>
                  </div>
                  <pre className="playground-output">
                    <code aria-label="Playground response output">{streamText || (result?.status === "success" ? "Empty response body" : result?.message || "Run a request to see output.")}</code>
                  </pre>
                  <div className="metric-grid compact" aria-label="Playground response metrics">
                    <div className="mini-stat">
                      <span>Model used</span>
                      <strong>{readMetric(result, ["modelUsed", "model"])}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Provider used</span>
                      <strong>{readMetric(result, ["providerUsed", "provider"])}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Latency</span>
                      <strong>{readMetric(result, ["latencyMs", "latency"])}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Token usage</span>
                      <strong>{readMetric(result, ["tokenUsage", "usage"])}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Credits spent</span>
                      <strong>{readMetric(result, ["creditsSpent", "credits"])}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Request ID</span>
                      <strong>{readMetric(result, ["requestId", "id"])}</strong>
                    </div>
                  </div>
                  <label className="toggle-row">
                    <input type="checkbox" checked={showRaw} onChange={(event) => setShowRaw(event.target.checked)} />
                    View safe raw JSON
                  </label>
                  {showRaw ? (
                    <pre>
                      <code aria-label="Safe raw JSON">{rawJson || "No raw payload"}</code>
                    </pre>
                  ) : null}
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(streamText || rawJson)}
                    aria-label="Copy response"
                  >
                    Copy response
                  </button>
                </Card>

                <Card>
                  <div className="card-heading">
                    <h2>Code generator</h2>
                    <select value={language} onChange={(event) => setLanguage(event.target.value as SnippetLanguage)} aria-label="Snippet language">
                      {(["cURL", "JavaScript", "TypeScript", "Python"] as const).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <CodeBlock label={`${language} example`} code={snippet} language={language.toLowerCase()} />
                  {containsEmbeddedApiKey(snippet) ? <p className="muted-text">Security warning: generated snippet unexpectedly contains a key-like token.</p> : null}
                </Card>
              </div>
            </div>
          );
        }}
      </BackendState>
    </div>
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

function readMetric(result: ApiResult<Record<string, unknown>> | null, keys: string[]) {
  if (!result || result.status !== "success") {
    return "Not returned";
  }

  for (const key of keys) {
    const value = result.data[key];
    if (value !== null && value !== undefined && value !== "") {
      return typeof value === "object" ? JSON.stringify(value) : String(value);
    }
  }

  return "Not returned";
}
