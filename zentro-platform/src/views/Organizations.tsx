import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { backendCapabilityRequired, zentroApi } from "../lib/zentroApi";

export function Organizations() {
  const { apiContext, bootstrap } = useAppSession();
  const organizations = useApiResource(() => zentroApi.organizations.list(apiContext), [apiContext.workspaceId]);
  const organizationId = bootstrap?.currentOrganization?.id ?? bootstrap?.organizations?.[0]?.id ?? null;
  const organization = useApiResource(
    () => (organizationId ? zentroApi.organizations.get(organizationId, apiContext) : Promise.resolve(backendCapabilityRequired("/v1/organizations/:organizationId"))),
    [organizationId, apiContext.workspaceId]
  );
  const members = useApiResource(
    () =>
      organizationId
        ? zentroApi.organizations.members(organizationId, apiContext)
        : Promise.resolve(backendCapabilityRequired("/v1/organizations/:organizationId/members")),
    [organizationId, apiContext.workspaceId]
  );

  return (
    <>
      <PageHeader
        eyebrow="Organizations"
        title="Enterprise control plane"
        description="Organization records, membership, roles, and workspace ownership from existing backend endpoints."
      />

      <div className="settings-grid">
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

        <BackendState resource={organization}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Current organization</h2>
                <span>GET /v1/organizations/:organizationId</span>
              </div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>

        <BackendState resource={members}>
          {(data) => (
            <Card className="privacy-card">
              <div className="card-heading">
                <h2>Organization members</h2>
                <span>GET /v1/organizations/:organizationId/members</span>
              </div>
              <ValueList value={data} />
            </Card>
          )}
        </BackendState>
      </div>
    </>
  );
}
