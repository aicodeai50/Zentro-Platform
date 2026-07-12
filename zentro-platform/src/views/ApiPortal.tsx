import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { zentroApi, type ApiKeyActionResult } from "../lib/zentroApi";

export function ApiPortal() {
  const { apiContext, activeProjectId } = useAppSession();
  const portal = useApiResource(() => zentroApi.developerApi.keys(apiContext), [apiContext.workspaceId]);
  const projectKeys = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.developerApi.projectKeys(activeProjectId, apiContext)
        : Promise.resolve({
            status: "error" as const,
            endpoint: "/projects/:projectId/api-keys",
            message: "Select a project to load project-scoped API keys.",
          }),
    [activeProjectId, apiContext.workspaceId]
  );
  const [keyName, setKeyName] = useState("");
  const [keyId, setKeyId] = useState("");
  const [usageKeyId, setUsageKeyId] = useState("");
  const [oneTimeSecret, setOneTimeSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<unknown>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => () => setOneTimeSecret(null), []);

  async function runAction(action: "create" | "rotate" | "revoke") {
    if (!activeProjectId) {
      setActionMessage("Select a project before managing project API keys.");
      return;
    }

    if (action === "rotate") {
      const confirmed = window.confirm("Rotate this key? The old key will stop working after rotation.");
      if (!confirmed) return;
    }

    if (action === "revoke") {
      const confirmed = window.confirm("Revoke this key? Existing clients using it will stop working.");
      if (!confirmed) return;
    }

    const result =
      action === "create"
        ? await zentroApi.developerApi.createProjectKey(activeProjectId, { name: keyName }, apiContext)
        : action === "rotate"
          ? await zentroApi.developerApi.rotateProjectKey(activeProjectId, keyId, apiContext)
          : await zentroApi.developerApi.revokeProjectKey(activeProjectId, keyId, apiContext);

    if (result.status === "success") {
      setActionMessage("Backend action completed.");
      setOneTimeSecret(action === "revoke" ? null : extractSecret(result.data as ApiKeyActionResult));
      return;
    }

    setActionMessage(`${result.message} Endpoint: ${result.endpoint}`);
  }

  async function loadUsage() {
    if (!activeProjectId || !usageKeyId) {
      setActionMessage("Select a project and enter a key id to load usage.");
      return;
    }

    const result = await zentroApi.developerApi.projectKeyUsage(activeProjectId, usageKeyId, apiContext);
    if (result.status === "success") {
      setUsage(result.data);
      return;
    }

    setActionMessage(`${result.message} Endpoint: ${result.endpoint}`);
  }

  async function copySecret() {
    if (!oneTimeSecret) return;
    await navigator.clipboard.writeText(oneTimeSecret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <>
      <PageHeader
        eyebrow="API"
        title="Developer portal"
        description="API keys, scopes, usage, authentication, rate limits, and documentation from ZENTRO-OWN-API-V2."
      />

      <BackendState resource={portal}>
        {(data) => (
          <Card>
            <div className="card-heading">
              <h2>Workspace API key metadata</h2>
              <span>GET /api-keys</span>
            </div>
            <ValueList value={data} />
          </Card>
        )}
      </BackendState>

      <BackendState resource={projectKeys}>
        {(data) => (
          <Card className="privacy-card">
            <div className="card-heading">
              <h2>Project API keys</h2>
              <span>GET /projects/:projectId/api-keys</span>
            </div>
            <ValueList value={data} />
          </Card>
        )}
      </BackendState>

      <Card className="privacy-card">
        <div className="card-heading">
          <h2>Key actions</h2>
          <span>Backend only</span>
        </div>
        <div className="form-grid">
          {oneTimeSecret ? (
            <Card className="success-card">
              <div>
                <span className="eyebrow">Shown once</span>
                <h2>New API key secret</h2>
                <p>Copy it now. The full key is never stored by the frontend.</p>
              </div>
              <code>{oneTimeSecret}</code>
              <button className="ghost-button" type="button" onClick={copySecret}>
                {copied ? "Copied" : "Copy"}
              </button>
              <button className="ghost-button" type="button" onClick={() => setOneTimeSecret(null)}>
                Close
              </button>
            </Card>
          ) : null}
          <label>
            New key name
            <input value={keyName} onChange={(event) => setKeyName(event.target.value)} />
          </label>
          <button className="primary-button" type="button" onClick={() => runAction("create")}>
            Create key using backend
          </button>
          <label>
            Existing key id
            <input value={keyId} onChange={(event) => setKeyId(event.target.value)} />
          </label>
          <div className="inline-actions">
            <button className="ghost-button" type="button" onClick={() => runAction("rotate")}>
              Rotate using backend
            </button>
            <button className="danger-button" type="button" onClick={() => runAction("revoke")}>
              Revoke using backend
            </button>
          </div>
          <label>
            Usage key id
            <input value={usageKeyId} onChange={(event) => setUsageKeyId(event.target.value)} />
          </label>
          <button className="ghost-button" type="button" onClick={loadUsage}>
            Load usage using backend
          </button>
          {usage ? <ValueList value={usage} /> : null}
          {actionMessage ? <p className="muted-text">{actionMessage}</p> : null}
        </div>
      </Card>
    </>
  );
}

function extractSecret(result: ApiKeyActionResult) {
  return result.secret ?? result.token ?? result.value ?? null;
}
