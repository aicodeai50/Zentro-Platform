import { useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import type { ApiKey, ApiKeyPermission } from "../data/types";
import { api } from "../lib/apiClient";
import { usePlatform } from "../lib/platformState";

const permissions: ApiKeyPermission[] = ["chat:write", "models:read", "usage:read", "keys:manage"];

export function ApiKeys() {
  const { selectedOrganization, selectedProject } = usePlatform();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: "Server key",
    expiration: "Never",
    environment: "test" as "test" | "live",
    permissions: ["chat:write", "models:read"] as ApiKeyPermission[],
  });

  useEffect(() => {
    void api.keys.list(selectedProject.id).then(setKeys);
  }, [selectedProject.id]);

  async function createKey() {
    const created = await api.keys.create({
      organizationId: selectedOrganization.id,
      projectId: selectedProject.id,
      name: form.name,
      expiration: form.expiration,
      environment: form.environment,
      permissions: form.permissions,
    });

    setNewKey(created.secret);
    setKeys((current) => [created.key, ...current]);
    setIsModalOpen(false);
  }

  async function regenerateKey(id: string) {
    const regenerated = await api.keys.regenerate(id);
    setNewKey(regenerated.secret);
    setKeys(await api.keys.list(selectedProject.id));
  }

  async function disableKey(id: string) {
    await api.keys.updateStatus(id, "disabled");
    setKeys(await api.keys.list(selectedProject.id));
  }

  async function deleteKey(id: string) {
    await api.keys.delete(id);
    setKeys(await api.keys.list(selectedProject.id));
  }

  function togglePermission(permission: ApiKeyPermission) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  const liveKeys = keys.filter((key) => key.environment === "live");
  const testKeys = keys.filter((key) => key.environment === "test");

  return (
    <>
      <PageHeader
        eyebrow="Credentials"
        title="API keys"
        description={`Create test and live keys for ${selectedProject.name}. New secrets are shown once before backend hashing is added.`}
        actions={
          <button className="primary-button" type="button" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            Create API Key
          </button>
        }
      />

      {newKey ? (
        <Card className="success-card">
          <div>
            <span className="eyebrow">Show once</span>
            <h2>Your new API key</h2>
            <p>Copy this key now. Later the backend will hash and store only its prefix.</p>
          </div>
          <code>{newKey}</code>
        </Card>
      ) : null}

      <KeySection title="Live Keys" keys={liveKeys} onRegenerate={regenerateKey} onDisable={disableKey} onDelete={deleteKey} />
      <KeySection title="Test Keys" keys={testKeys} onRegenerate={regenerateKey} onDisable={disableKey} onDelete={deleteKey} />

      {isModalOpen ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <Card className="modal-card">
            <div className="card-heading">
              <h2>Create API Key</h2>
              <button className="ghost-button" type="button" onClick={() => setIsModalOpen(false)}>
                Close
              </button>
            </div>
            <div className="form-grid">
              <label>
                Name
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </label>
              <label>
                Expiration
                <select
                  value={form.expiration}
                  onChange={(event) => setForm({ ...form, expiration: event.target.value })}
                >
                  <option>Never</option>
                  <option>30 days</option>
                  <option>90 days</option>
                  <option>Dec 31, 2026</option>
                </select>
              </label>
              <label>
                Environment
                <select
                  value={form.environment}
                  onChange={(event) =>
                    setForm({ ...form, environment: event.target.value as "test" | "live" })
                  }
                >
                  <option value="test">Test</option>
                  <option value="live">Live</option>
                </select>
              </label>
              <div className="permission-grid">
                {permissions.map((permission) => (
                  <label className="toggle-row" key={permission}>
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                    />
                    {permission}
                  </label>
                ))}
              </div>
              <button className="primary-button" type="button" onClick={createKey}>
                Create key
              </button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

type KeySectionProps = {
  title: string;
  keys: ApiKey[];
  onRegenerate: (id: string) => void;
  onDisable: (id: string) => void;
  onDelete: (id: string) => void;
};

function KeySection({ title, keys, onRegenerate, onDisable, onDelete }: KeySectionProps) {
  return (
    <Card className="key-section">
      <div className="card-heading">
        <h2>{title}</h2>
        <span>{keys.length} keys</span>
      </div>
      <div className="table-list">
        {keys.map((key) => (
          <div className="table-row api-key-row" key={key.id}>
            <div className="key-title">
              <KeyRound size={18} />
              <div>
                <strong>{key.name}</strong>
                <span>{key.prefix}...</span>
              </div>
            </div>
            <Badge tone={key.environment === "live" ? "info" : "neutral"}>{key.environment}</Badge>
            <Badge tone={key.status === "active" ? "success" : "danger"}>{key.status}</Badge>
            <span>{key.expiresAt}</span>
            <span>{key.lastUsed}</span>
            <button className="ghost-button" type="button">
              <Copy size={15} />
              Copy
            </button>
            <button className="ghost-button" type="button" onClick={() => onRegenerate(key.id)}>
              Regenerate
            </button>
            <button className="ghost-button" type="button" onClick={() => onDisable(key.id)}>
              Disable
            </button>
            <button className="danger-button" type="button" onClick={() => onDelete(key.id)}>
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        ))}
        {keys.length === 0 ? <div className="empty-state">No keys in this environment.</div> : null}
      </div>
    </Card>
  );
}
