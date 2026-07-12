import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { DiagnosticsPanel } from "../components/diagnostics/DiagnosticsPanel";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { zentroApi } from "../lib/zentroApi";

export function Home() {
  const { apiContext } = useAppSession();
  const session = useApiResource(() => zentroApi.session.bootstrap(apiContext), [apiContext.workspaceId, apiContext.projectId]);
  const overview = useApiResource(() => zentroApi.home.overview(apiContext), [apiContext.workspaceId, apiContext.projectId]);
  const organizations = useApiResource(() => zentroApi.organizations.list(apiContext), [apiContext.workspaceId]);
  const health = useApiResource(() => zentroApi.health.application(apiContext), [apiContext.workspaceId]);
  const ready = useApiResource(() => zentroApi.health.ready(apiContext), [apiContext.workspaceId]);

  return (
    <>
      <PageHeader
        eyebrow="Operating system for intelligence"
        title="Zentro Platform"
        description="Live workspace, project, AI, API, analytics, and health information from ZENTRO-OWN-API-V2."
      />

      <div className="two-column">
        <BackendState resource={session}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Session bootstrap</h2>
                <span>GET /api/auth/session</span>
              </div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>

        <BackendState resource={overview}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Workspace overview</h2>
                <span>GET /platform/home</span>
              </div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>
      </div>

      <div className="two-column">
        <BackendState resource={organizations}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Organizations</h2>
                <span>GET /v1/organizations</span>
              </div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>

        <div className="stack-list">
          <BackendState resource={health}>
            {(data) => (
              <Card>
                <div className="card-heading">
                  <h2>System health</h2>
                  <span>GET /health</span>
                </div>
                <ValueList value={data} />
              </Card>
            )}
          </BackendState>

          <BackendState resource={ready}>
            {(data) => (
              <Card>
                <div className="card-heading">
                  <h2>Readiness</h2>
                  <span>GET /health/ready</span>
                </div>
                <ValueList value={data} />
              </Card>
            )}
          </BackendState>
        </div>
      </div>

      <DiagnosticsPanel />
    </>
  );
}
