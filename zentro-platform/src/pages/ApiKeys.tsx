import { useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { apiKeys as initialApiKeys, type ApiKeyStatus } from "../data/mockData";

type ApiKey = (typeof initialApiKeys)[number];

export function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>(initialApiKeys);
  const [newKey, setNewKey] = useState<string | null>(null);

  function createKey() {
    const created = `ztest_new_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
    setNewKey(created);
    setKeys((current) => [
      {
        id: `key_${Date.now()}`,
        name: "New test key",
        prefix: created.slice(0, 15),
        mode: "test",
        status: "active",
        created: "Just now",
        lastUsed: "Never",
      },
      ...current,
    ]);
  }

  function revokeKey(id: string) {
    setKeys((current) =>
      current.map((key) =>
        key.id === id ? { ...key, status: "revoked" as ApiKeyStatus } : key
      )
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Credentials"
        title="API keys"
        description="Create test and live keys for server-side Zentro API access. New keys are shown once."
        actions={
          <button className="primary-button" type="button" onClick={createKey}>
            <Plus size={16} />
            Create key
          </button>
        }
      />

      {newKey ? (
        <Card className="success-card">
          <div>
            <span className="eyebrow">Show once</span>
            <h2>Your new API key</h2>
            <p>Copy this key now. It will not be shown again after you leave this page.</p>
          </div>
          <code>{newKey}</code>
        </Card>
      ) : null}

      <Card>
        <div className="card-heading">
          <h2>Keys</h2>
          <span>Test and live credentials</span>
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
              <Badge tone={key.mode === "live" ? "info" : "neutral"}>{key.mode}</Badge>
              <Badge tone={key.status === "active" ? "success" : "danger"}>
                {key.status}
              </Badge>
              <span>{key.created}</span>
              <span>{key.lastUsed}</span>
              <button className="ghost-button" type="button">
                <Copy size={15} />
                Copy prefix
              </button>
              <button
                className="danger-button"
                type="button"
                disabled={key.status === "revoked"}
                onClick={() => revokeKey(key.id)}
              >
                <Trash2 size={15} />
                Revoke
              </button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
