import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { emptyBillingState } from "../lib/phaseDGuards";
import { backendCapabilityRequired, zentroApi } from "../lib/zentroApi";

export function Billing() {
  const { apiContext, activeWorkspaceId, activeProjectId } = useAppSession();
  const summary = useApiResource(
    () =>
      activeWorkspaceId
        ? zentroApi.billing.summary(activeWorkspaceId, apiContext)
        : Promise.resolve(backendCapabilityRequired("/v1/workspaces/:workspaceId/billing/summary")),
    [activeWorkspaceId]
  );
  const credits = useApiResource(
    () =>
      activeWorkspaceId
        ? zentroApi.billing.credits(activeWorkspaceId, apiContext)
        : Promise.resolve(backendCapabilityRequired("/v1/workspaces/:workspaceId/credits")),
    [activeWorkspaceId]
  );
  const transactions = useApiResource(
    () =>
      activeWorkspaceId
        ? zentroApi.billing.transactions(activeWorkspaceId, apiContext)
        : Promise.resolve(backendCapabilityRequired("/v1/workspaces/:workspaceId/transactions")),
    [activeWorkspaceId]
  );
  const usage = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.projects.billingUsage(activeProjectId, apiContext)
        : Promise.resolve(backendCapabilityRequired("/v1/projects/:projectId/billing/usage")),
    [activeProjectId, activeWorkspaceId]
  );

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Billing foundation"
        description="Live workspace billing summary, credits, transactions, and project billing usage from Phase D endpoints."
      />

      <div className="settings-grid">
        <BackendState resource={summary}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Workspace summary</h2>
                <span>GET /v1/workspaces/:workspaceId/billing/summary</span>
              </div>
              <ValueList value={emptyBillingState(data)} />
            </Card>
          )}
        </BackendState>
        <BackendState resource={credits}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Credits</h2>
                <span>GET /v1/workspaces/:workspaceId/credits</span>
              </div>
              <ValueList value={emptyBillingState(data)} />
            </Card>
          )}
        </BackendState>
        <BackendState resource={transactions}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Transactions</h2>
                <span>GET /v1/workspaces/:workspaceId/transactions</span>
              </div>
              <ValueList value={emptyBillingState(data)} />
            </Card>
          )}
        </BackendState>
        <BackendState resource={usage}>
          {(data) => (
            <Card>
              <div className="card-heading">
                <h2>Project usage</h2>
                <span>GET /v1/projects/:projectId/billing/usage</span>
              </div>
              <ValueList value={emptyBillingState(data)} />
            </Card>
          )}
        </BackendState>
      </div>
    </>
  );
}
