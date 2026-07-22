import { useEffect, useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { BackendState } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import {
  canManageApiKeys,
  extractPlaintextApiKey,
  getApiKeyStatus,
  parseOptionalNumber,
  splitCsv,
} from "../lib/apiKeyGuards";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { zentroApi, type ApiKeyMetadata, type CreateApiKeyPayload } from "../lib/zentroApi";

type CreateFormState = {
  name: string;
  expiresAt: string;
  allowedModels: string;
  allowedProviders: string;
  monthlyCreditLimit: string;
  ipAllowlist: string;
};

const emptyCreateForm: CreateFormState = {
  name: "",
  expiresAt: "",
  allowedModels: "",
  allowedProviders: "",
  monthlyCreditLimit: "",
  ipAllowlist: "",
};

export function ApiPortal() {
  const { apiContext, activeProjectId, activeWorkspaceId, bootstrap } = useAppSession();
  const roles = bootstrap?.roles ?? [];
  const canManage = canManageApiKeys(roles);
  const organizationId = bootstrap?.currentOrganization?.id ?? bootstrap?.organizations?.[0]?.id ?? null;
  const [reloadKey, setReloadKey] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [oneTimeSecret, setOneTimeSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const keys = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.developerApi.projectKeys(activeProjectId, apiContext)
        : zentroApi.developerApi.keys(apiContext),
    [activeProjectId, activeWorkspaceId, apiContext.workspaceId, reloadKey]
  );

  useEffect(() => () => setOneTimeSecret(null), []);

  async function createKey() {
    if (!canManage) {
      setActionMessage("Only owners, admins, and maintainers can create API keys.");
      return;
    }

    if (!createForm.name.trim()) {
      setActionMessage("Key name is required.");
      return;
    }

    const payload: CreateApiKeyPayload = {
      name: createForm.name.trim(),
      organizationId,
      workspaceId: activeWorkspaceId,
      projectId: activeProjectId,
      expiresAt: createForm.expiresAt || undefined,
      allowedModels: splitCsv(createForm.allowedModels),
      allowedProviders: splitCsv(createForm.allowedProviders),
      monthlyCreditLimit: parseOptionalNumber(createForm.monthlyCreditLimit),
      ipAllowlist: splitCsv(createForm.ipAllowlist),
    };

    const result = activeProjectId
      ? await zentroApi.developerApi.createProjectKey(activeProjectId, payload, apiContext)
      : await zentroApi.developerApi.create(payload, apiContext);

    if (result.status === "success") {
      setOneTimeSecret(extractPlaintextApiKey(result.data));
      setShowCreateDialog(false);
      setCreateForm(emptyCreateForm);
      setActionMessage("API key created. Audit event recorded by backend.");
      setReloadKey((value) => value + 1);
      return;
    }

    setActionMessage(result.message);
  }

  async function renameKey(key: ApiKeyMetadata) {
    if (!canManage || !key.id) {
      setActionMessage("Only owners, admins, and maintainers can rename API keys.");
      return;
    }

    const nextName = (renameDrafts[key.id] ?? key.name ?? "").trim();
    if (!nextName) {
      setActionMessage("Key name cannot be empty.");
      return;
    }

    const result = await zentroApi.developerApi.update(key.id, { name: nextName }, apiContext);
    if (result.status === "success") {
      setActionMessage("API key renamed.");
      setReloadKey((value) => value + 1);
      return;
    }

    setActionMessage(result.message);
  }

  async function rotateKey(keyId: string) {
    if (!canManage || !activeProjectId) {
      setActionMessage("Select a project and ensure you have permission before rotating keys.");
      return;
    }

    if (!window.confirm("Rotate this key? The old key will stop working after rotation.")) {
      return;
    }

    const result = await zentroApi.developerApi.rotateProjectKey(activeProjectId, keyId, apiContext);
    if (result.status === "success") {
      setOneTimeSecret(extractPlaintextApiKey(result.data));
      setActionMessage("API key rotated. Audit event recorded by backend.");
      setReloadKey((value) => value + 1);
      return;
    }

    setActionMessage(result.message);
  }

  async function revokeKey(keyId: string) {
    if (!canManage) {
      setActionMessage("Only owners, admins, and maintainers can revoke API keys.");
      return;
    }

    if (!window.confirm("Revoke this key? Existing clients using it will stop working.")) {
      return;
    }

    const result = activeProjectId
      ? await zentroApi.developerApi.revokeProjectKey(activeProjectId, keyId, apiContext)
      : await zentroApi.developerApi.revoke(keyId, apiContext);

    if (result.status === "success") {
      setOneTimeSecret(null);
      setActionMessage("API key revoked. Audit event recorded by backend.");
      setReloadKey((value) => value + 1);
      return;
    }

    setActionMessage(result.message);
  }

  async function copySecret() {
    if (!oneTimeSecret) {
      return;
    }

    await navigator.clipboard.writeText(oneTimeSecret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <>
      <PageHeader
        eyebrow="API Keys"
        title="API key management"
        description="Create, rename, rotate, and revoke production API keys scoped to organization, workspace, and project. Plaintext secrets are shown once and never stored by the frontend."
        actions={
          canManage ? (
            <button className="primary-button" type="button" onClick={() => setShowCreateDialog(true)}>
              Create API key
            </button>
          ) : null
        }
      />

      {!canManage ? (
        <p className="empty-state">Owners, admins, and maintainers can manage API keys. Other roles are read-only.</p>
      ) : null}

      {oneTimeSecret ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Copy API key once">
          <Card className="modal-card success-card">
            <div>
              <span className="eyebrow">Shown once</span>
              <h2>Copy your API key</h2>
              <p>Store this key securely now. The frontend never persists plaintext keys, and the backend stores only a hash.</p>
            </div>
            <code>{oneTimeSecret}</code>
            <div className="inline-actions">
              <button className="primary-button" type="button" onClick={copySecret}>
                {copied ? "Copied" : "Copy"}
              </button>
              <button className="ghost-button" type="button" onClick={() => setOneTimeSecret(null)}>
                Close
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      {showCreateDialog ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create API key">
          <Card className="modal-card">
            <div className="card-heading">
              <h2>Create API key</h2>
              <span>POST /v1/api-keys</span>
            </div>
            <div className="form-grid">
              <label>
                Name
                <input
                  aria-label="Key name"
                  value={createForm.name}
                  onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
                />
              </label>
              <label>
                Expiration date
                <input
                  aria-label="Expiration date"
                  type="date"
                  value={createForm.expiresAt}
                  onChange={(event) => setCreateForm({ ...createForm, expiresAt: event.target.value })}
                />
              </label>
              <label>
                Allowed models
                <input
                  aria-label="Allowed models"
                  placeholder="model-a, model-b"
                  value={createForm.allowedModels}
                  onChange={(event) => setCreateForm({ ...createForm, allowedModels: event.target.value })}
                />
              </label>
              <label>
                Allowed providers
                <input
                  aria-label="Allowed providers"
                  placeholder="provider-a, provider-b"
                  value={createForm.allowedProviders}
                  onChange={(event) => setCreateForm({ ...createForm, allowedProviders: event.target.value })}
                />
              </label>
              <label>
                Monthly credit limit
                <input
                  aria-label="Monthly credit limit"
                  type="number"
                  value={createForm.monthlyCreditLimit}
                  onChange={(event) => setCreateForm({ ...createForm, monthlyCreditLimit: event.target.value })}
                />
              </label>
              <label>
                IP allowlist
                <input
                  aria-label="IP allowlist"
                  placeholder="203.0.113.10, 198.51.100.0/24"
                  value={createForm.ipAllowlist}
                  onChange={(event) => setCreateForm({ ...createForm, ipAllowlist: event.target.value })}
                />
              </label>
              <div className="inline-actions">
                <button className="primary-button" type="button" onClick={createKey}>
                  Create key
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setCreateForm(emptyCreateForm);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      <BackendState resource={keys}>
        {(data) => (
          <Card className="privacy-card">
            <div className="card-heading">
              <h2>API keys</h2>
              <span>{activeProjectId ? "GET /v1/api-keys?projectId=" : "GET /v1/api-keys"}</span>
            </div>
            {data.length ? (
              <div className="table-list">
                {data.map((key, index) => {
                  const status = getApiKeyStatus(key);
                  const keyId = key.id ?? `key-${index}`;

                  return (
                    <div className="table-row api-key-row" key={keyId}>
                      <div className="key-title">
                        <strong>{key.name ?? key.id ?? "Backend key"}</strong>
                        <span>{key.prefix ?? "Prefix not returned"}</span>
                        <Badge tone={statusTone(status)}>{status}</Badge>
                      </div>
                      <div>
                        <strong>{key.organizationId ?? organizationId ?? "Not returned"}</strong>
                        <span>Organization</span>
                      </div>
                      <div>
                        <strong>{key.workspaceId ?? activeWorkspaceId ?? "Not returned"}</strong>
                        <span>Workspace</span>
                      </div>
                      <div>
                        <strong>{key.projectId ?? activeProjectId ?? "Not returned"}</strong>
                        <span>Project</span>
                      </div>
                      <div>
                        <strong>{key.lastUsedAt ?? "Never"}</strong>
                        <span>Last used</span>
                      </div>
                      <div>
                        <strong>{key.createdAt ?? "Not returned"}</strong>
                        <span>Created</span>
                      </div>
                      <div>
                        <strong>{key.expiresAt ?? "No expiration"}</strong>
                        <span>Expires</span>
                      </div>
                      <div>
                        <strong>{key.createdBy ?? "Not returned"}</strong>
                        <span>Created by</span>
                      </div>
                      <div>
                        <strong>{key.revokedAt ?? "—"}</strong>
                        <span>Revoked</span>
                      </div>
                      <div>
                        <strong>{formatRestrictions(key)}</strong>
                        <span>Restrictions</span>
                      </div>
                      {canManage && key.id ? (
                        <div className="inline-actions">
                          <input
                            aria-label={`Rename ${key.name ?? key.id}`}
                            value={renameDrafts[key.id] ?? key.name ?? ""}
                            onChange={(event) => setRenameDrafts({ ...renameDrafts, [key.id!]: event.target.value })}
                          />
                          <button className="ghost-button" type="button" onClick={() => void renameKey(key)}>
                            Rename
                          </button>
                          <button className="ghost-button" type="button" onClick={() => void rotateKey(key.id!)}>
                            Rotate
                          </button>
                          <button className="danger-button" type="button" onClick={() => void revokeKey(key.id!)}>
                            Revoke
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty-state">No API keys returned by backend.</p>
            )}
          </Card>
        )}
      </BackendState>

      {actionMessage ? <p className="muted-text">{actionMessage}</p> : null}
    </>
  );
}

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "active") return "success" as const;
  if (normalized === "expired") return "warning" as const;
  if (normalized === "revoked") return "danger" as const;
  return "neutral" as const;
}

function formatRestrictions(key: ApiKeyMetadata) {
  const parts = [
    key.allowedModels?.length ? `models: ${key.allowedModels.join(", ")}` : null,
    key.allowedProviders?.length ? `providers: ${key.allowedProviders.join(", ")}` : null,
    key.monthlyCreditLimit != null ? `credits: ${key.monthlyCreditLimit}` : null,
    key.ipAllowlist?.length ? `ips: ${key.ipAllowlist.join(", ")}` : null,
    key.permissions?.length ? `permissions: ${key.permissions.join(", ")}` : null,
    key.scopes?.length ? `scopes: ${key.scopes.join(", ")}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "None returned";
}
