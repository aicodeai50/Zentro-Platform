import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CodeBlock } from "../../components/developer/CodeBlock";
import { Card } from "../../components/ui/Card";
import { BackendState } from "../../components/ui/BackendState";
import { getPublicConfig } from "../../lib/publicConfig";
import {
  buildQuickStartExamples,
  extractGatewayModelRows,
  fieldOrNotReported,
  filterGatewayModels,
  openApiHasPath,
  PREFERRED_CHAT_COMPLETIONS,
  PREFERRED_MODELS,
  PREFERRED_TEXT_COMPLETIONS,
  CONFIRMED_PLATFORM_INFERENCE,
} from "../../lib/developerGuards";
import { useApiResource } from "../../lib/useApiResource";
import { firstSuccessfulResult } from "../../lib/operationsGuards";
import { useAppSession } from "../../lib/appSession";
import { zentroApi } from "../../lib/zentroApi";

export function DeveloperOverview() {
  const [baseUrl, setBaseUrl] = useState("Loading…");

  useEffect(() => {
    void getPublicConfig()
      .then((config) => setBaseUrl(config.zentroApiUrl || "Not configured"))
      .catch(() => setBaseUrl("Unavailable"));
  }, []);

  return (
    <div className="stack-list">
      <Card>
        <h2>Architecture</h2>
        <ul className="doc-list">
          <li>
            <strong>Zentro AI</strong> is the end-user application experience.
          </li>
          <li>
            <strong>Zentro Platform</strong> manages organizations, workspaces, projects, API keys, usage, and billing.
          </li>
          <li>
            <strong>ZENTRO-OWN-API-V2</strong> is the public intelligence gateway used by server-side clients.
          </li>
        </ul>
        <p className="muted-text">Public API base URL from runtime configuration:</p>
        <CodeBlock label="Public API base URL" code={baseUrl} language="text" />
        <p className="muted-text">Internal provider URLs are never exposed in Platform documentation or playground responses.</p>
      </Card>
      <Card>
        <h2>Related guides</h2>
        <div className="docs-grid">
          <Link className="doc-card card" to="/developer/quick-start">
            <h3>Quick Start</h3>
            <p>Create a project, key, and first request.</p>
          </Link>
          <Link className="doc-card card" to="/developer/authentication">
            <h3>Authentication</h3>
            <p>API keys and dashboard JWT rules.</p>
          </Link>
          <Link className="doc-card card" to="/developer/playground">
            <h3>API Playground</h3>
            <p>Run live requests with safe key handling.</p>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export function DeveloperQuickStart() {
  const openApi = useApiResource(() => zentroApi.gateway.openApi(), []);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    void getPublicConfig()
      .then((config) => setBaseUrl(config.zentroApiUrl))
      .catch(() => setBaseUrl(""));
  }, []);

  const chatAvailable = openApi.state === "loaded" && openApi.result.status === "success" && openApiHasPath(openApi.result.data, PREFERRED_CHAT_COMPLETIONS);
  const examples = useMemo(() => buildQuickStartExamples(baseUrl, chatAvailable), [baseUrl, chatAvailable]);

  return (
    <div className="stack-list">
      <Card>
        <h2>Quick Start</h2>
        <ol className="doc-list">
          <li>Create a project in Zentro Platform.</li>
          <li>
            Create an API key under <Link to="/api-keys">API Keys</Link>.
          </li>
          <li>Store the plaintext key in an environment variable (`ZENTRO_API_KEY`). It is shown only once.</li>
          <li>Send the first request using the confirmed contract below.</li>
          <li>
            Inspect usage in <Link to="/usage">Usage</Link>.
          </li>
        </ol>
      </Card>
      <Card>
        <div className="card-heading">
          <h2>First request contract</h2>
          <span>{examples.endpoint}</span>
        </div>
        {chatAvailable ? (
          <p>Live OpenAPI probe confirmed `{PREFERRED_CHAT_COMPLETIONS}`.</p>
        ) : (
          <p className="muted-text">
            Preferred public chat route was not confirmed by OpenAPI. Examples use the confirmed Platform playground contract `{CONFIRMED_PLATFORM_INFERENCE}` with a dashboard access token.
          </p>
        )}
        <CodeBlock label="cURL" code={examples.curl} language="bash" />
        <CodeBlock label="TypeScript fetch" code={examples.typescript} language="typescript" />
        <CodeBlock label="Python requests" code={examples.python} language="python" />
      </Card>
    </div>
  );
}

export function DeveloperAuthentication() {
  return (
    <div className="stack-list">
      <Card>
        <h2>API-key authentication</h2>
        <p>Server-to-server callers authenticate with:</p>
        <CodeBlock label="Authorization header" code={"Authorization: Bearer <ZENTRO_API_KEY>"} language="http" />
        <ul className="doc-list">
          <li>Plaintext keys are shown only once at create/rotate time.</li>
          <li>Store keys in environment variables such as `ZENTRO_API_KEY`.</li>
          <li>Never embed keys in client-side frontend bundles.</li>
          <li>Revoked and expired keys stop working immediately at the gateway.</li>
          <li>Project restrictions may limit allowed models or providers.</li>
          <li>IP allowlists and monthly credit limits may apply per key.</li>
        </ul>
        <CodeBlock
          label="Safe environment example"
          code={`export ZENTRO_API_KEY="your-key-here"\ncurl "$ZENTRO_API_URL/v1/models" -H "Authorization: Bearer $ZENTRO_API_KEY"`}
          language="bash"
        />
      </Card>
      <Card>
        <h2>Dashboard authentication</h2>
        <p>
          Zentro Platform UI calls use a Supabase JWT through `zentroApi`. The confirmed interactive inference path is{" "}
          <code>{CONFIRMED_PLATFORM_INFERENCE}</code>. See <Link to="/developer/playground">API Playground</Link>.
        </p>
      </Card>
    </div>
  );
}

export function DeveloperApiKeys() {
  return (
    <div className="stack-list">
      <Card>
        <h2>API Keys</h2>
        <p>
          Manage keys in <Link to="/api-keys">API Keys</Link>. Confirmed routes:
        </p>
        <ul className="doc-list">
          <li>
            <code>GET /v1/api-keys</code>
          </li>
          <li>
            <code>POST /v1/api-keys</code>
          </li>
          <li>
            <code>PATCH /v1/api-keys/:id</code>
          </li>
          <li>
            <code>DELETE /v1/api-keys/:id</code>
          </li>
        </ul>
        <p className="muted-text">Lists expose safe prefixes only. Hashes and plaintext secrets are never rendered in tables.</p>
      </Card>
    </div>
  );
}

export function DeveloperChatCompletions() {
  const openApi = useApiResource(() => zentroApi.gateway.openApi(), []);
  const available =
    openApi.state === "loaded" && openApi.result.status === "success" && openApiHasPath(openApi.result.data, PREFERRED_CHAT_COMPLETIONS);

  return (
    <div className="stack-list">
      <Card>
        <div className="card-heading">
          <h2>Chat Completions</h2>
          <span>{PREFERRED_CHAT_COMPLETIONS}</span>
        </div>
        {openApi.state === "loading" ? <p className="muted-text">Probing OpenAPI for route availability…</p> : null}
        {openApi.state === "loaded" && openApi.result.status !== "success" ? (
          <p className="muted-text">OpenAPI unavailable: {openApi.result.message}. Showing confirmed Platform alternative.</p>
        ) : null}
        {available ? (
          <>
            <p>OpenAPI confirms this route. Use standard chat-completions payloads with Zentro API keys.</p>
            <CodeBlock
              label="Minimum request"
              code={`POST ${PREFERRED_CHAT_COMPLETIONS}\nAuthorization: Bearer $ZENTRO_API_KEY\n\n${JSON.stringify({ model: "auto", messages: [{ role: "user", content: "Hello" }] }, null, 2)}`}
              language="http"
            />
            <CodeBlock
              label="Multi-turn request"
              code={JSON.stringify(
                {
                  model: "auto",
                  messages: [
                    { role: "system", content: "You are helpful." },
                    { role: "user", content: "Summarize Zentro." },
                    { role: "assistant", content: "Zentro is an AI platform." },
                    { role: "user", content: "What manages API keys?" },
                  ],
                },
                null,
                2
              )}
              language="json"
            />
            <CodeBlock
              label="Streaming request"
              code={JSON.stringify({ model: "auto", stream: true, messages: [{ role: "user", content: "Stream a short hello." }] }, null, 2)}
              language="json"
            />
            <CodeBlock
              label="Example error shape"
              code={JSON.stringify({ error: { message: "Invalid request", type: "invalid_request_error", code: "bad_request" }, requestId: "req_..." }, null, 2)}
              language="json"
            />
          </>
        ) : (
          <>
            <p className="empty-state">Backend capability required for `{PREFERRED_CHAT_COMPLETIONS}`.</p>
            <p>
              Confirmed Platform alternative: <code>{CONFIRMED_PLATFORM_INFERENCE}</code> with fields{" "}
              <code>provider</code>, <code>model</code>, <code>temperature</code>, <code>privacyMode</code>, <code>systemPrompt</code>,{" "}
              <code>userPrompt</code>, optional <code>stream</code>.
            </p>
            <Link to="/developer/playground">Open playground</Link>
          </>
        )}
      </Card>
    </div>
  );
}

export function DeveloperTextCompletions() {
  const openApi = useApiResource(() => zentroApi.gateway.openApi(), []);
  const available =
    openApi.state === "loaded" && openApi.result.status === "success" && openApiHasPath(openApi.result.data, PREFERRED_TEXT_COMPLETIONS);

  return (
    <Card>
      <div className="card-heading">
        <h2>Text Completions</h2>
        <span>{PREFERRED_TEXT_COMPLETIONS}</span>
      </div>
      {available ? (
        <>
          <p>OpenAPI confirms text completions. Do not assume full vendor parity beyond the live schema.</p>
          <CodeBlock
            label="Example request"
            code={JSON.stringify({ model: "auto", prompt: "Write a haiku about APIs.", temperature: 0.7 }, null, 2)}
            language="json"
          />
        </>
      ) : (
        <p className="empty-state">
          Backend capability required for `{PREFERRED_TEXT_COMPLETIONS}`. Prefer chat completions or the Platform playground inference contract when available.
        </p>
      )}
      {openApi.state === "loaded" && openApi.result.status !== "success" ? (
        <p className="muted-text">OpenAPI probe: {openApi.result.message}</p>
      ) : null}
    </Card>
  );
}

export function DeveloperStreaming() {
  return (
    <div className="stack-list">
      <Card>
        <h2>Streaming</h2>
        <p>
          The Platform playground can request <code>stream: true</code> on <code>{CONFIRMED_PLATFORM_INFERENCE}</code>. When the gateway returns{" "}
          <code>text/event-stream</code>, the playground parses SSE <code>data:</code> chunks and treats <code>[DONE]</code> as the terminator.
        </p>
        <p className="muted-text">
          If the backend responds with JSON instead of an event stream, Platform renders the final JSON body and does not invent chunk framing.
        </p>
        <ul className="doc-list">
          <li>Cancel in-flight streams with `AbortController`.</li>
          <li>Partial output is appended as chunks arrive.</li>
          <li>Reconnection is not automatic; retry explicitly.</li>
          <li>Timeouts surface as backend-unavailable or aborted client errors.</li>
        </ul>
        <CodeBlock
          label="Browser fetch stream reader"
          code={`const controller = new AbortController();\nconst response = await fetch(url, { signal: controller.signal, headers });\nconst reader = response.body.getReader();\n// decode SSE data: lines until [DONE]\n// controller.abort() stops generation`}
          language="javascript"
        />
        <CodeBlock
          label="Node.js"
          code={`import { fetch } from "undici";\nconst response = await fetch(url, { headers });\nfor await (const chunk of response.body) {\n  process.stdout.write(chunk);\n}`}
          language="javascript"
        />
        <CodeBlock
          label="Python"
          code={`import os, requests\nwith requests.post(url, headers={"Authorization": f"Bearer {os.environ['ZENTRO_API_KEY']}"}, json=payload, stream=True) as response:\n    for line in response.iter_lines():\n        print(line)`}
          language="python"
        />
      </Card>
    </div>
  );
}

export function DeveloperModels() {
  const { apiContext } = useAppSession();
  const [filters, setFilters] = useState({ provider: "", capability: "", availability: "", streaming: "", search: "" });
  const models = useApiResource(
    () =>
      firstSuccessfulResult([
        () => zentroApi.gateway.models(apiContext),
        () => zentroApi.ai.localModels(apiContext),
        () => zentroApi.operations.models({}, apiContext),
      ]),
    [apiContext.workspaceId]
  );

  return (
    <div className="stack-list">
      <Card>
        <div className="card-heading">
          <h2>Models reference</h2>
          <span>{PREFERRED_MODELS}</span>
        </div>
        <p className="muted-text">Prefers `{PREFERRED_MODELS}`; falls back to `/models/local` or operations models when the public registry is unavailable.</p>
        <div className="settings-grid" role="group" aria-label="Model filters">
          <label>
            Provider
            <input value={filters.provider} onChange={(event) => setFilters({ ...filters, provider: event.target.value })} />
          </label>
          <label>
            Capability
            <input value={filters.capability} onChange={(event) => setFilters({ ...filters, capability: event.target.value })} />
          </label>
          <label>
            Availability
            <input value={filters.availability} onChange={(event) => setFilters({ ...filters, availability: event.target.value })} />
          </label>
          <label>
            Streaming
            <select value={filters.streaming} onChange={(event) => setFilters({ ...filters, streaming: event.target.value })}>
              <option value="">Any</option>
              <option value="true">Streaming</option>
              <option value="false">Non-streaming</option>
            </select>
          </label>
          <label>
            Search
            <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          </label>
        </div>
      </Card>
      <BackendState resource={models} onRetry={models.reload} title="Model registry" emptyWhen={(data) => filterGatewayModels(extractGatewayModelRows(data), filters).length === 0}>
        {(data) => (
          <Card>
            <div className="table-scroll">
              <table className="usage-table">
                <caption className="sr-only">Canonical model registry</caption>
                <thead>
                  <tr>
                    <th scope="col">Model ID</th>
                    <th scope="col">Display name</th>
                    <th scope="col">Provider</th>
                    <th scope="col">Capabilities</th>
                    <th scope="col">Streaming</th>
                    <th scope="col">Context window</th>
                    <th scope="col">Availability</th>
                    <th scope="col">Vision</th>
                    <th scope="col">Embeddings</th>
                  </tr>
                </thead>
                <tbody>
                  {filterGatewayModels(extractGatewayModelRows(data), filters).map((row, index) => (
                    <tr key={String(row.id ?? row.model ?? row.name ?? index)}>
                      <td>{fieldOrNotReported(row.id ?? row.model)}</td>
                      <td>{fieldOrNotReported(row.name ?? row.displayName)}</td>
                      <td>{fieldOrNotReported(row.provider ?? row.owned_by)}</td>
                      <td>{fieldOrNotReported(row.capabilities ?? row.capability)}</td>
                      <td>{fieldOrNotReported(row.streaming ?? row.supportsStreaming)}</td>
                      <td>{fieldOrNotReported(row.contextWindow ?? row.context_length)}</td>
                      <td>{fieldOrNotReported(row.availability ?? row.status)}</td>
                      <td>{fieldOrNotReported(row.vision ?? row.supportsVision)}</td>
                      <td>{fieldOrNotReported(row.embeddings ?? row.supportsEmbeddings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </BackendState>
    </div>
  );
}

export function DeveloperErrors() {
  return (
    <Card>
      <h2>Error reference</h2>
      <p>Platform normalizes gateway failures into safe statuses. Stack traces are never rendered.</p>
      <ul className="doc-list">
        <li>400 — invalid request / validation-error</li>
        <li>401 — missing or invalid authentication</li>
        <li>403 — permission or restriction failure</li>
        <li>404 / 405 / 501 — capability-required or unknown resource</li>
        <li>409 — conflict when returned by backend</li>
        <li>422 — unsupported capability / validation-error</li>
        <li>429 — rate or credit limit exceeded</li>
        <li>500 — internal error</li>
        <li>502 / 503 — provider or backend unavailable</li>
        <li>504 — timeout when returned by backend</li>
      </ul>
      <CodeBlock
        label="Safe error example"
        code={JSON.stringify({ status: "error", message: "Backend validation failed.", requestId: "req_123" }, null, 2)}
        language="json"
      />
      <p className="muted-text">Use request IDs from successful and failed responses when contacting support. Retry transient 429/5xx with exponential backoff.</p>
    </Card>
  );
}

export function DeveloperRateLimits() {
  return (
    <Card>
      <h2>Rate limits and billing</h2>
      <ul className="doc-list">
        <li>Request-per-minute, monthly request, and monthly credit limits may be configured per project or API key.</li>
        <li>Exact defaults are configuration-dependent and are not invented here.</li>
        <li>Credits and usage appear in Platform Usage and Billing views when backend contracts return them.</li>
        <li>On HTTP 429, back off exponentially (for example 1s, 2s, 4s) and honor `Retry-After` when present.</li>
      </ul>
      <p>
        See <Link to="/usage">Usage</Link> and <Link to="/billing">Billing</Link>.
      </p>
    </Card>
  );
}

export function DeveloperUsageBilling() {
  return (
    <Card>
      <h2>Usage and Billing</h2>
      <p>Platform surfaces live usage and billing from confirmed contracts such as `/v1/usage/*` and workspace billing endpoints.</p>
      <div className="docs-grid">
        <Link className="doc-card card" to="/usage">
          <h3>Usage dashboard</h3>
          <p>Requests, tokens, latency, and key usage.</p>
        </Link>
        <Link className="doc-card card" to="/billing">
          <h3>Billing dashboard</h3>
          <p>Credits, plan, and period limits.</p>
        </Link>
      </div>
    </Card>
  );
}
