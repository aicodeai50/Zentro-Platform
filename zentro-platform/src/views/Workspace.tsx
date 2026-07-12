import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { zentroApi } from "../lib/zentroApi";

export function Workspace() {
  const { apiContext, activeWorkspaceId } = useAppSession();
  const workspaces = useApiResource(() => zentroApi.workspace.list(apiContext), [apiContext.workspaceId]);
  const workspace = useApiResource(
    () =>
      activeWorkspaceId
        ? zentroApi.workspace.get(activeWorkspaceId, apiContext)
        : Promise.resolve({
            status: "error" as const,
            endpoint: "/v1/workspaces/:workspaceId",
            message: "Select a workspace to load workspace details.",
          }),
    [activeWorkspaceId]
  );
  const members = useApiResource(
    () =>
      activeWorkspaceId
        ? zentroApi.workspace.members(activeWorkspaceId, apiContext)
        : Promise.resolve({
            status: "error" as const,
            endpoint: "/v1/workspaces/:workspaceId/members",
            message: "Select a workspace to load workspace members.",
          }),
    [activeWorkspaceId]
  );

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Workspace overview"
        description="Organization, members, projects, API keys, environment, usage, and activity from the backend."
      />

      <BackendState resource={workspaces}>
        {(data) => (
          <div className="settings-grid">
            <Card>
              <div className="card-heading">
                <h2>Workspaces</h2>
                <span>GET /v1/workspaces</span>
              </div>
              <ValueList value={data} />
            </Card>
          </div>
        )}
      </BackendState>

      <div className="settings-grid">
        <BackendState resource={workspace}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Active workspace</h2>
                <span>GET /v1/workspaces/:workspaceId</span>
              </div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>
        <BackendState resource={members}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Members</h2>
                <span>GET /v1/workspaces/:workspaceId/members</span>
              </div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>
      </div>
    </>
  );
}
