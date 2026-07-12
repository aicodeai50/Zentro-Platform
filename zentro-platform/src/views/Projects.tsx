import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { zentroApi, type CreateProjectPayload } from "../lib/zentroApi";

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

      <BackendState resource={selectedProject}>
        {(data) => (
          <Card className="privacy-card">
            <div className="card-heading">
              <h2>Selected project</h2>
              <span>GET /projects/:id</span>
            </div>
            <ValueList value={data} />
          </Card>
        )}
      </BackendState>
    </>
  );
}
