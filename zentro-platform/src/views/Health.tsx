import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { zentroApi } from "../lib/zentroApi";

export function Health() {
  const { apiContext, activeProjectId } = useAppSession();
  const application = useApiResource(() => zentroApi.health.application(apiContext), [apiContext.workspaceId]);
  const ready = useApiResource(() => zentroApi.health.ready(apiContext), [apiContext.workspaceId]);
  const projectHealth = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.projects.health(activeProjectId, apiContext)
        : Promise.resolve({
            status: "error" as const,
            endpoint: "/projects/:projectId/health",
            message: "Select a project to load project health.",
          }),
    [activeProjectId, apiContext.workspaceId]
  );

  return (
    <>
      <PageHeader
        eyebrow="Health"
        title="System health"
        description="Application, database, Redis, providers, memory, version, and uptime from ZENTRO-OWN-API-V2. Internal URLs are not displayed."
      />

      <div className="settings-grid">
        <BackendState resource={application}>
          {(data) => (
            <Card>
              <div className="card-heading"><h2>Application</h2><span>GET /health</span></div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>

        <BackendState resource={ready}>
          {(data) => (
            <Card>
              <div className="card-heading"><h2>Readiness</h2><span>GET /health/ready</span></div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>

        <BackendState resource={projectHealth}>
          {(data) => (
            <Card className="privacy-card">
              <div className="card-heading"><h2>Project health</h2><span>GET /projects/:projectId/health</span></div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>
      </div>
    </>
  );
}
