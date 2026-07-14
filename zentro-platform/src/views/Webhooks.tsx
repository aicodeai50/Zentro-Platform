import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { confirmWebhookDeletion, getWebhookSigningSecret, validateWebhookUrl } from "../lib/phaseDGuards";
import { backendCapabilityRequired, zentroApi, type Webhook } from "../lib/zentroApi";

export function Webhooks() {
  const { apiContext, activeProjectId } = useAppSession();
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState({ webhookId: "", url: "", events: "", status: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [oneTimeSecret, setOneTimeSecret] = useState<string | null>(null);
  const webhooks = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.webhooks.list(activeProjectId, apiContext)
        : Promise.resolve(backendCapabilityRequired<Webhook[]>("/v1/projects/:projectId/webhooks")),
    [activeProjectId, apiContext.workspaceId, reloadKey]
  );

  useEffect(() => () => setOneTimeSecret(null), []);

  async function createWebhook() {
    if (!activeProjectId) {
      setMessage("Select a project before creating a webhook.");
      return;
    }

    const urlError = validateWebhookUrl(form.url);
    if (urlError) {
      setMessage(urlError);
      return;
    }

    const result = await zentroApi.webhooks.create(activeProjectId, webhookPayload(form), apiContext);
    handleActionResult(result);
  }

  async function updateWebhook() {
    if (!activeProjectId || !form.webhookId) {
      setMessage("Select a project and enter a webhook id before updating.");
      return;
    }

    const urlError = validateWebhookUrl(form.url);
    if (urlError) {
      setMessage(urlError);
      return;
    }

    const result = await zentroApi.webhooks.update(activeProjectId, form.webhookId, webhookPayload(form), apiContext);
    handleActionResult(result);
  }

  async function deleteWebhook(webhookId = form.webhookId) {
    if (!activeProjectId || !webhookId) {
      setMessage("Select a project and enter a webhook id before deleting.");
      return;
    }

    if (!confirmWebhookDeletion()) {
      return;
    }

    const result = await zentroApi.webhooks.delete(activeProjectId, webhookId, apiContext);
    handleActionResult(result);
  }

  async function testWebhook(webhookId = form.webhookId) {
    if (!activeProjectId || !webhookId) {
      setMessage("Select a project and enter a webhook id before testing.");
      return;
    }

    const result = await zentroApi.webhooks.test(activeProjectId, webhookId, apiContext);
    handleActionResult(result);
  }

  function handleActionResult(result: { status: string; message?: string; data?: unknown }) {
    if (result.status === "success") {
      setOneTimeSecret(result.data && typeof result.data === "object" ? getWebhookSigningSecret(result.data as Record<string, unknown>) : null);
      setMessage("Backend webhook action completed.");
      setReloadKey((value) => value + 1);
      return;
    }

    setMessage(result.message ?? "Webhook action failed.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Webhooks"
        title="Event delivery"
        description="Create, update, test, and delete Phase D project webhooks. Signing secrets are displayed once and are never persisted."
      />

      {oneTimeSecret ? (
        <Card className="success-card">
          <div>
            <span className="eyebrow">Shown once</span>
            <h2>Webhook signing secret</h2>
            <p>Copy it now. It is not stored by the frontend.</p>
          </div>
          <code>{oneTimeSecret}</code>
          <button className="ghost-button" type="button" onClick={() => void navigator.clipboard.writeText(oneTimeSecret)}>Copy</button>
          <button className="ghost-button" type="button" onClick={() => setOneTimeSecret(null)}>Close</button>
        </Card>
      ) : null}

      <Card>
        <div className="card-heading">
          <h2>Manage webhook</h2>
          <span>POST/PATCH/DELETE/TEST</span>
        </div>
        <div className="form-grid">
          <label>Webhook id<input value={form.webhookId} onChange={(event) => setForm({ ...form, webhookId: event.target.value })} /></label>
          <label>HTTPS URL<input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} /></label>
          <label>Events<input value={form.events} onChange={(event) => setForm({ ...form, events: event.target.value })} placeholder="event.created,event.failed" /></label>
          <label>Status<input value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} /></label>
          <div className="inline-actions">
            <button className="primary-button" type="button" onClick={createWebhook}>Create</button>
            <button className="ghost-button" type="button" onClick={updateWebhook}>Update</button>
            <button className="ghost-button" type="button" onClick={() => void testWebhook()}>Test</button>
            <button className="danger-button" type="button" onClick={() => void deleteWebhook()}>Delete</button>
          </div>
          {message ? <p className="muted-text">{message}</p> : null}
        </div>
      </Card>

      <BackendState resource={webhooks}>
        {(data) => (
          <Card>
            <div className="card-heading">
              <h2>Webhooks</h2>
              <span>GET /v1/projects/:projectId/webhooks</span>
            </div>
            {data.length ? (
              <div className="table-list">
                {data.map((webhook, index) => (
                  <div className="table-row" key={webhook.id ?? index}>
                    <div><strong>{webhook.url ?? webhook.id ?? "Webhook"}</strong><span>{webhook.events?.join(", ") ?? "Events not returned"}</span></div>
                    <span>{webhook.status ?? "Status not returned"}</span>
                    <span>{webhook.createdAt ?? "Created date not returned"}</span>
                    <div className="inline-actions">
                      <button className="ghost-button" type="button" onClick={() => setForm({ ...form, webhookId: webhook.id ?? "", url: webhook.url ?? "" })}>Edit</button>
                      <button className="ghost-button" type="button" onClick={() => void testWebhook(webhook.id)}>Test</button>
                      <button className="danger-button" type="button" onClick={() => void deleteWebhook(webhook.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ValueList value="No webhooks returned by backend." />
            )}
          </Card>
        )}
      </BackendState>
    </>
  );
}

function webhookPayload(form: { url: string; events: string; status: string }) {
  return {
    url: form.url,
    events: form.events.split(",").map((event) => event.trim()).filter(Boolean),
    status: form.status || undefined,
  };
}
