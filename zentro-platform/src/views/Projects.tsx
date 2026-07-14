import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { normalizeBackendList, sanitizeLogRecord } from "../lib/phaseDGuards";
import { backendCapabilityRequired, zentroApi, type CreateProjectPayload } from "../lib/zentroApi";

export function Projects() {
  const { apiContext, activeProjectId } = useAppSession();
  const projects = useApiResource(() => zentroApi.projects.list(apiContext), [apiContext.workspaceId]);
  const selectedProject = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.projects.get(activeProjectId, apiContext)
        : Promise.resolve({
            status: "error" as const,
            endpoint: "/projects/:id",
            message: "Select a project to load project details.",
          }),
    [activeProjectId, apiContext.workspaceId]
  );
  const projectKeys = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.developerApi.projectKeys(activeProjectId, apiContext)
        : Promise.resolve(backendCapabilityRequired("/projects/:projectId/api-keys")),
    [activeProjectId, apiContext.workspaceId]
  );
  const projectUsage = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.projects.analytics(activeProjectId, apiContext)
        : Promise.resolve(backendCapabilityRequired("/projects/:projectId/analytics")),
    [activeProjectId, apiContext.workspaceId]
  );
  const projectHealth = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.projects.health(activeProjectId, apiContext)
        : Promise.resolve(backendCapabilityRequired("/projects/:projectId/health")),
    [activeProjectId, apiContext.workspaceId]
  );
  const projectLogs = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.projects.logs(activeProjectId, {}, apiContext)
        : Promise.resolve(backendCapabilityRequired("/v1/projects/:projectId/logs")),
    [activeProjectId, apiContext.workspaceId]
  );
  const projectMembers = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.projects.members(activeProjectId, apiContext)
        : Promise.resolve(backendCapabilityRequired("/v1/projects/:projectId/members")),
    [activeProjectId, apiContext.workspaceId]
  );
  const [form, setForm] = useState<CreateProjectPayload>({
    name: "",
    description: "",
    environment: "",
  });
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  async function createProject() {
    const result = await zentroApi.projects.create(form, apiContext);

    if (result.status === "success") {
      setCreateMessage("Project created by backend.");
      return;
    }

    setCreateMessage(`${result.message} Endpoint: ${result.endpoint}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title="Projects"
        description="Projects are the center of Zentro Platform. All project records come from ZENTRO-OWN-API-V2."
      />

      <div className="two-column">
        <BackendState resource={projects}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Backend projects</h2>
                <span>GET /projects</span>
              </div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>

        <Card>
          <div className="card-heading">
            <h2>Create project</h2>
            <Badge tone="info">POST /projects</Badge>
          </div>
          <div className="form-grid">
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
            <label>
              Environment
              <input
                value={form.environment}
                onChange={(event) => setForm({ ...form, environment: event.target.value })}
              />
            </label>
            <button className="primary-button" type="button" onClick={createProject}>
              Create using backend
            </button>
            {createMessage ? <p className="muted-text">{createMessage}</p> : null}
          </div>
        </Card>
      </div>

      <div className="project-workspace">
        <BackendState resource={selectedProject}>
          {(data) => (
            <>
              <Card className="privacy-card">
                <div className="card-heading">
                  <h2>Overview</h2>
                  <span>GET /projects/:id</span>
                </div>
                <ValueList value={data} />
              </Card>

              <div className="settings-grid">
                <BackendState resource={projectKeys}>
                  {(keys) => (
                    <Card>
                      <div className="card-heading">
                        <h2>API Keys</h2>
                        <span>GET /projects/:projectId/api-keys</span>
                      </div>
                      <ValueList value={keys} />
                    </Card>
                  )}
                </BackendState>

                <Card>
                  <div className="card-heading">
                    <h2>Models</h2>
                    <span>GET /projects/:id</span>
                  </div>
                  <ValueList value={data.models ?? "Backend capability required"} />
                </Card>

                <BackendState resource={projectUsage}>
                  {(usage) => (
                    <Card>
                      <div className="card-heading">
                        <h2>Usage</h2>
                        <span>GET /projects/:projectId/analytics</span>
                      </div>
                      <ValueList value={usage} />
                    </Card>
                  )}
                </BackendState>

                <BackendState resource={projectHealth}>
                  {(health) => (
                    <Card>
                      <div className="card-heading">
                        <h2>Health</h2>
                        <span>GET /projects/:projectId/health</span>
                      </div>
                      <ValueList value={health} />
                    </Card>
                  )}
                </BackendState>

                <BackendState resource={projectLogs}>
                  {(logs) => (
                    <Card>
                      <div className="card-heading">
                        <h2>Logs</h2>
                        <span>GET /v1/projects/:projectId/logs</span>
                      </div>
                      <ValueList value={normalizeBackendList<Record<string, unknown>>(logs, ["items", "logs", "data"]).map(sanitizeLogRecord)} />
                    </Card>
                  )}
                </BackendState>

                <Card>
                  <div className="card-heading">
                    <h2>Secrets</h2>
                    <Badge tone="warning">Future-ready</Badge>
                  </div>
                  <ValueList value={data.secrets ?? "Backend capability required"} />
                </Card>

                <BackendState resource={projectMembers}>
                  {(members) => (
                    <Card>
                      <div className="card-heading">
                        <h2>Members</h2>
                        <span>GET /v1/projects/:projectId/members</span>
                      </div>
                      <ValueList value={members} />
                    </Card>
                  )}
                </BackendState>

                <Card>
                  <div className="card-heading">
                    <h2>Deployments</h2>
                    <Badge tone="warning">Future-ready</Badge>
                  </div>
                  <ValueList value={data.deployments ?? "Backend capability required"} />
                </Card>
              </div>
            </>
          )}
        </BackendState>
      </div>
    </>
  );
}
