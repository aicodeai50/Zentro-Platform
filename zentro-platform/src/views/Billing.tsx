import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { MetricCard } from "../components/ui/MetricCard";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { emptyBillingState } from "../lib/phaseDGuards";
import { useApiResource } from "../lib/useApiResource";
import {
  canViewOrganizationBilling,
  canViewProjectUsage,
  estimatedRemainingCredits,
  extractMetricSnapshot,
  firstSuccessfulResult,
  formatMetricValue,
  formatPercent,
  usagePercentage,
} from "../lib/usageGuards";
import { backendCapabilityRequired, zentroApi, type ApiResult } from "../lib/zentroApi";

export function Billing() {
  const { apiContext, activeWorkspaceId, activeProjectId, bootstrap } = useAppSession();
  const roles = bootstrap?.roles ?? [];
  const canViewBilling = canViewOrganizationBilling(roles);
  const canViewUsage = canViewProjectUsage(roles);

  const platformSummary = useApiResource(
    () =>
      canViewBilling
        ? firstSuccessfulResult([
            () => zentroApi.platformBilling.summary({}, apiContext),
            () =>
              activeWorkspaceId
                ? zentroApi.billing.summary(activeWorkspaceId, apiContext)
                : Promise.resolve(backendCapabilityRequired("/v1/billing/summary")),
          ])
        : Promise.resolve(forbiddenBilling("/v1/billing/summary")),
    [activeWorkspaceId, apiContext.workspaceId, canViewBilling]
  );

  const workspaceCredits = useApiResource(
    () =>
      canViewBilling && activeWorkspaceId
        ? zentroApi.billing.credits(activeWorkspaceId, apiContext)
        : Promise.resolve(
            canViewBilling
              ? backendCapabilityRequired("/v1/workspaces/:workspaceId/credits")
              : forbiddenBilling("/v1/workspaces/:workspaceId/credits")
          ),
    [activeWorkspaceId, canViewBilling]
  );

  const transactions = useApiResource(
    () =>
      canViewBilling && activeWorkspaceId
        ? zentroApi.billing.transactions(activeWorkspaceId, apiContext)
        : Promise.resolve(
            canViewBilling
              ? backendCapabilityRequired("/v1/workspaces/:workspaceId/transactions")
              : forbiddenBilling("/v1/workspaces/:workspaceId/transactions")
          ),
    [activeWorkspaceId, canViewBilling]
  );

  const projectUsage = useApiResource(
    () =>
      canViewUsage && activeProjectId
        ? zentroApi.projects.billingUsage(activeProjectId, apiContext)
        : Promise.resolve(
            canViewUsage
              ? backendCapabilityRequired("/v1/projects/:projectId/billing/usage")
              : forbiddenBilling("/v1/projects/:projectId/billing/usage")
          ),
    [activeProjectId, activeWorkspaceId, canViewUsage]
  );

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Billing overview"
        description="Credit balance, plan, billing period, monthly limits, and project billing usage from live backend contracts. Owners and admins see organization billing; maintainers and members see project usage allowed by role."
      />

      {!canViewBilling ? (
        <Card className="capability-card">
          <span className="eyebrow">Access denied</span>
          <h2>Organization billing restricted</h2>
          <p>Only owners and admins may view organization billing in the UI. Backend role checks remain authoritative.</p>
        </Card>
      ) : null}

      {canViewBilling ? (
        <BackendState resource={platformSummary} onRetry={platformSummary.reload} title="Billing summary" emptyWhen={(data) => Object.keys(data ?? {}).length === 0}>
          {(data) => {
            const metrics = extractMetricSnapshot(data);
            const record = asRecord(data);
            const balance = firstValue(record, ["creditBalance", "balance", "creditsBalance", "availableCredits"]);
            const used = firstValue(record, ["creditsUsed", "creditsUsedThisPeriod", "usedCredits", "creditsSpent"]) ?? metrics.creditsSpent;
            const limit = firstValue(record, ["monthlyLimit", "creditLimit", "limit"]);
            const remaining = estimatedRemainingCredits(balance, used, limit);
            const usagePct = usagePercentage(used, limit);
            const plan = firstString(record, ["plan", "planName", "currentPlan"]);
            const periodStart = firstString(record, ["billingPeriodStart", "periodStart", "currentPeriodStart"]);
            const periodEnd = firstString(record, ["billingPeriodEnd", "periodEnd", "currentPeriodEnd"]);

            return (
              <div className="metric-grid" aria-label="Billing overview metrics">
                <MetricCard label="Current credit balance" value={formatMetricValue(balance)} />
                <MetricCard label="Credits used this period" value={formatMetricValue(used)} />
                <MetricCard label="Estimated remaining credits" value={formatMetricValue(remaining)} />
                <MetricCard label="Current plan" value={plan} />
                <MetricCard label="Billing period start" value={periodStart} />
                <MetricCard label="Billing period end" value={periodEnd} />
                <MetricCard label="Monthly limit" value={formatMetricValue(limit)} />
                <MetricCard label="Usage percentage" value={usagePct === null ? "Not returned" : formatPercent(usagePct)} />
              </div>
            );
          }}
        </BackendState>
      ) : null}

      {canViewBilling ? (
        <div className="settings-grid">
          <BackendState resource={workspaceCredits} onRetry={workspaceCredits.reload} title="Workspace credits">
            {(data) => (
              <Card>
                <div className="card-heading">
                  <h2>Workspace credits</h2>
                  <span>GET /v1/workspaces/:workspaceId/credits</span>
                </div>
                <ValueList value={emptyBillingState(data)} />
              </Card>
            )}
          </BackendState>

          <BackendState
            resource={transactions}
            onRetry={transactions.reload}
            title="Transactions"
            emptyWhen={(data) => {
              const record = asRecord(data);
              const items = record.items ?? record.transactions ?? record.data;
              return Array.isArray(items) && items.length === 0;
            }}
            emptyMessage="No billing transactions returned by backend."
          >
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
        </div>
      ) : null}

      {canViewUsage ? (
        <BackendState resource={projectUsage} onRetry={projectUsage.reload} title="Project billing usage" emptyWhen={(data) => Object.keys(data ?? {}).length === 0}>
          {(data) => {
            const metrics = extractMetricSnapshot(data);
            return (
              <Card>
                <div className="card-heading">
                  <h2>Project billing usage</h2>
                  <span>GET /v1/projects/:projectId/billing/usage</span>
                </div>
                <div className="metric-grid compact" aria-label="Project billing usage metrics">
                  <MetricCard label="Credits spent" value={formatMetricValue(metrics.creditsSpent)} />
                  <MetricCard label="Total tokens" value={formatMetricValue(metrics.totalTokens)} />
                  <MetricCard label="Requests" value={formatMetricValue(metrics.requestsThisMonth)} />
                  <MetricCard label="Average latency" value={formatMetricValue(metrics.averageLatency, " ms")} />
                </div>
                <ValueList value={emptyBillingState(data)} />
              </Card>
            );
          }}
        </BackendState>
      ) : (
        <Card className="capability-card">
          <span className="eyebrow">Access denied</span>
          <h2>Project usage restricted</h2>
          <p>Your role cannot view project billing usage. Backend permissions remain authoritative.</p>
        </Card>
      )}
    </>
  );
}

function forbiddenBilling(endpoint: string): ApiResult<never> {
  return {
    status: "forbidden",
    endpoint,
    statusCode: 403,
    message: "Permission denied for billing data.",
  };
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" || typeof value === "string") {
      return value;
    }
  }

  return null;
}

function firstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "Not returned";
}
