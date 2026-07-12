import { useState } from "react";
import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { zentroApi } from "../lib/zentroApi";

export function Settings() {
  const { apiContext } = useAppSession();
  const backendSettings = useApiResource(() => zentroApi.settings.get(apiContext), [apiContext.workspaceId]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [settingsJson, setSettingsJson] = useState("{}");
  const [message, setMessage] = useState<string | null>(null);

  async function updateWorkspace() {
    const result = await zentroApi.workspace.update({ name: workspaceName }, apiContext);
    setMessage(result.status === "success" ? "Workspace updated by backend." : `${result.message} Endpoint: ${result.endpoint}`);
  }

  async function updateSettings() {
    try {
      const payload = JSON.parse(settingsJson) as Record<string, unknown>;
      const result = await zentroApi.settings.update(payload, apiContext);
      setMessage(result.status === "success" ? "Settings updated by backend." : `${result.message} Endpoint: ${result.endpoint}`);
    } catch {
      setMessage("Settings JSON is invalid.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workspace settings"
        description="Theme, profile, notifications, API preferences, developer mode, and backend configuration."
      />

      <div className="settings-grid">
        <Card>
          <div className="card-heading">
            <h2>Theme</h2>
            <span>Local preference</span>
          </div>
          <div className="form-grid">
            <label>
              Preferred theme
              <select defaultValue="system">
                <option value="system">System</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <h2>Workspace</h2>
            <span>PATCH /workspace</span>
          </div>
          <div className="form-grid">
            <label>
              Workspace name
              <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
            </label>
            <button className="primary-button" type="button" onClick={updateWorkspace}>
              Update workspace using backend
            </button>
            {message ? <p className="muted-text">{message}</p> : null}
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <h2>Notifications</h2>
            <span>PATCH /settings</span>
          </div>
          <div className="form-grid">
            <label>
              Settings JSON
              <textarea rows={4} value={settingsJson} onChange={(event) => setSettingsJson(event.target.value)} />
            </label>
            <button className="ghost-button" type="button" onClick={updateSettings}>
              Update settings using backend
            </button>
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <h2>Developer mode</h2>
            <span>Local preference</span>
          </div>
          <label className="toggle-row">
            <input type="checkbox" />
            Show endpoint names and capability notices
          </label>
        </Card>

        <BackendState resource={backendSettings}>
          {(data) => (
            <Card className="privacy-card">
              <div className="card-heading">
                <h2>Backend configuration</h2>
              <span>GET /settings</span>
              </div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>
      </div>
    </>
  );
}
