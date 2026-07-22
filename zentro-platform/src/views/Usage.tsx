import { useMemo, useState } from "react";
import { Card } from "../components/ui/Card";
import { BackendState } from "../components/ui/BackendState";
import { MetricCard } from "../components/ui/MetricCard";
import { PageHeader } from "../components/ui/PageHeader";
import { UsageBarChart } from "../components/usage/UsageBarChart";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import {
  canViewProjectUsage,
  extractMetricSnapshot,
  extractRows,
  extractSeries,
  firstSuccessfulResult,
  formatDelta,
  formatMetricValue,
  formatPercent,
  rangeToQuery,
  sanitizeUsageRecord,
  usagePercentage,
  type UsageRange,
} from "../lib/usageGuards";
import { zentroApi, type ApiResult, type UsageQuery } from "../lib/zentroApi";

const ranges: Array<{ id: UsageRange; label: string }> = [
  { id: "24h", label: "24 hours" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "billing_period", label: "Billing period" },
  { id: "custom", label: "Custom range" },
];

type RequestFilters = {
  model: string;
  provider: string;
  apiKeyId: string;
  status: string;
  projectId: string;
};

const emptyFilters: RequestFilters = {
  model: "",
  provider: "",
  apiKeyId: "",
  status: "",
  projectId: "",
};

export function Usage() {
  const { apiContext, activeProjectId, activeWorkspaceId, bootstrap } = useAppSession();
  const roles = bootstrap?.roles ?? [];
  const canView = canViewProjectUsage(roles);
  const scopeLabel = activeProjectId ? "Project usage" : activeWorkspaceId ? "Workspace usage" : "Organization usage";

  const [range, setRange] = useState<UsageRange>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filters, setFilters] = useState<RequestFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<RequestFilters>(emptyFilters);
  const [cursor, setCursor] = useState("");

  const baseQuery = useMemo<UsageQuery>(
    () => ({
      ...rangeToQuery(range, customStart, customEnd),
      projectId: activeProjectId ?? undefined,
    }),
    [activeProjectId, customEnd, customStart, range]
  );

  const requestQuery = useMemo<UsageQuery>(
    () => ({
      ...baseQuery,
      model: appliedFilters.model || undefined,
      provider: appliedFilters.provider || undefined,
      apiKeyId: appliedFilters.apiKeyId || undefined,
      status: appliedFilters.status || undefined,
      projectId: appliedFilters.projectId || activeProjectId || undefined,
      cursor: cursor || undefined,
    }),
    [activeProjectId, appliedFilters, baseQuery, cursor]
  );

  const summary = useApiResource(
    () =>
      canView
        ? firstSuccessfulResult([
            () => zentroApi.usage.summary(baseQuery, apiContext),
            () =>
              activeProjectId
                ? zentroApi.projects.analytics(activeProjectId, apiContext)
                : zentroApi.analytics.summary(apiContext),
          ])
        : Promise.resolve(forbiddenResult("/v1/usage/summary")),
    [activeProjectId, activeWorkspaceId, apiContext.workspaceId, baseQuery, canView]
  );

  const timeseries = useApiResource(
    () =>
      canView
        ? firstSuccessfulResult([
            () => zentroApi.usage.timeseries(baseQuery, apiContext),
            () =>
              activeProjectId
                ? zentroApi.projects.analytics(activeProjectId, apiContext)
                : zentroApi.analytics.summary(apiContext),
          ])
        : Promise.resolve(forbiddenResult("/v1/usage/timeseries")),
    [activeProjectId, activeWorkspaceId, apiContext.workspaceId, baseQuery, canView]
  );

  const models = useApiResource(
    () =>
      canView
        ? firstSuccessfulResult([
            () => zentroApi.usage.models(baseQuery, apiContext),
            () =>
              activeProjectId
                ? zentroApi.projects.analytics(activeProjectId, apiContext)
                : zentroApi.analytics.summary(apiContext),
          ])
        : Promise.resolve(forbiddenResult("/v1/usage/models")),
    [activeProjectId, activeWorkspaceId, apiContext.workspaceId, baseQuery, canView]
  );

  const providers = useApiResource(
    () =>
      canView
        ? firstSuccessfulResult([
            () => zentroApi.usage.providers(baseQuery, apiContext),
            () =>
              activeProjectId
                ? zentroApi.projects.analytics(activeProjectId, apiContext)
                : zentroApi.analytics.summary(apiContext),
          ])
        : Promise.resolve(forbiddenResult("/v1/usage/providers")),
    [activeProjectId, activeWorkspaceId, apiContext.workspaceId, baseQuery, canView]
  );

  const apiKeys = useApiResource(
    () => (canView ? zentroApi.usage.apiKeys(baseQuery, apiContext) : Promise.resolve(forbiddenResult("/v1/usage/api-keys"))),
    [activeProjectId, activeWorkspaceId, apiContext.workspaceId, baseQuery, canView]
  );

  const requests = useApiResource(
    () =>
      canView
        ? firstSuccessfulResult([
            () => zentroApi.usage.requests(requestQuery, apiContext),
            () =>
              activeProjectId
                ? zentroApi.projects.logs(
                    activeProjectId,
                    {
                      cursor: requestQuery.cursor,
                      startDate: requestQuery.startDate,
                      endDate: requestQuery.endDate,
                      status: requestQuery.status,
                      provider: requestQuery.provider,
                      model: requestQuery.model,
                    },
                    apiContext
                  )
                : Promise.resolve({
                    status: "capability-required",
                    endpoint: "/v1/usage/requests",
                    statusCode: 501,
                    message: "Backend capability unavailable.",
                  }),
          ])
        : Promise.resolve(forbiddenResult("/v1/usage/requests")),
    [activeProjectId, activeWorkspaceId, apiContext.workspaceId, canView, requestQuery]
  );

  if (!canView) {
    return (
      <>
        <PageHeader eyebrow="Usage" title="Usage overview" description="Production usage requires an allowed workspace role." />
        <Card className="capability-card">
          <span className="eyebrow">Access denied</span>
          <h2>Insufficient role for usage data</h2>
          <p>Your current roles do not include project usage visibility. Backend permissions remain authoritative.</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Usage"
        title="Usage overview"
        description={`${scopeLabel}. Requests, tokens, credits, latency, errors, model/provider mix, API-key usage, and request history from live backend contracts only.`}
      />

      <Card>
        <div className="card-heading">
          <h2>Range and scope</h2>
          <span>{scopeLabel}</span>
        </div>
        <div className="settings-grid" role="group" aria-label="Usage range">
          <label>
            Range
            <select value={range} onChange={(event) => setRange(event.target.value as UsageRange)}>
              {ranges.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {range === "custom" ? (
            <>
              <label>
                Start date
                <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              </label>
              <label>
                End date
                <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
              </label>
            </>
          ) : null}
          <p className="muted-text">
            Workspace: {activeWorkspaceId ?? "not selected"} · Project: {activeProjectId ?? "not selected"}
          </p>
        </div>
      </Card>

      <BackendState resource={summary} onRetry={summary.reload} title="Usage summary" emptyWhen={(data) => Object.keys(data ?? {}).length === 0}>
        {(data) => {
          const metrics = extractMetricSnapshot(data);
          const previous = metrics.previousPeriod ?? {};

          return (
            <div className="metric-grid" aria-label="Usage overview metrics">
              <MetricCard label="Requests today" value={formatMetricValue(metrics.requestsToday)} />
              <MetricCard
                label="Requests this month"
                value={formatMetricValue(metrics.requestsThisMonth)}
                delta={formatDelta(metrics.requestsThisMonth, previous.requestsThisMonth)}
              />
              <MetricCard label="Input tokens" value={formatMetricValue(metrics.inputTokens)} />
              <MetricCard label="Output tokens" value={formatMetricValue(metrics.outputTokens)} />
              <MetricCard
                label="Total tokens"
                value={formatMetricValue(metrics.totalTokens)}
                delta={formatDelta(metrics.totalTokens, previous.totalTokens)}
              />
              <MetricCard
                label="Credits spent"
                value={formatMetricValue(metrics.creditsSpent)}
                delta={formatDelta(metrics.creditsSpent, previous.creditsSpent)}
              />
              <MetricCard
                label="Average latency"
                value={formatMetricValue(metrics.averageLatency, " ms")}
                delta={formatDelta(metrics.averageLatency, previous.averageLatency)}
              />
              <MetricCard
                label="Success rate"
                value={formatPercent(metrics.successRate)}
                delta={formatDelta(metrics.successRate, previous.successRate)}
              />
              <MetricCard
                label="Error count"
                value={formatMetricValue(metrics.errorCount)}
                delta={formatDelta(metrics.errorCount, previous.errorCount)}
              />
            </div>
          );
        }}
      </BackendState>

      <BackendState resource={timeseries} onRetry={timeseries.reload} title="Usage charts">
        {(data) => (
          <div className="settings-grid">
            <UsageBarChart title="Requests by day" endpoint="GET /v1/usage/timeseries" points={extractSeries(data, ["requests", "requestsByDay", "series"])} />
            <UsageBarChart title="Tokens by day" endpoint="GET /v1/usage/timeseries" points={extractSeries(data, ["tokens", "tokensByDay"])} />
            <UsageBarChart title="Credits spent by day" endpoint="GET /v1/usage/timeseries" points={extractSeries(data, ["credits", "creditsByDay", "spend"])} />
            <UsageBarChart title="Latency by day" endpoint="GET /v1/usage/timeseries" points={extractSeries(data, ["latency", "latencyByDay"])} />
            <UsageBarChart
              title="Success versus failed requests"
              endpoint="GET /v1/usage/timeseries"
              points={[
                ...extractSeries(data, ["success", "successfulRequests"]).map((point) => ({ ...point, label: `Success ${point.label}` })),
                ...extractSeries(data, ["failed", "failedRequests", "errors"]).map((point) => ({ ...point, label: `Failed ${point.label}` })),
              ]}
            />
          </div>
        )}
      </BackendState>

      <BackendState
        resource={models}
        onRetry={models.reload}
        title="Model usage"
        emptyWhen={(data) => extractRows(data, ["models", "items", "data"]).length === 0}
        emptyMessage="No model usage rows returned by backend."
      >
        {(data) => (
          <UsageDataTable
            title="Model usage"
            endpoint="GET /v1/usage/models"
            caption="Model usage by request count, tokens, credits, latency, and error rate"
            columns={[
              ["Model", (row) => String(row.model ?? row.name ?? "Not returned")],
              ["Requests", (row) => formatMetricValue(row.requestCount ?? row.requests)],
              ["Input tokens", (row) => formatMetricValue(row.inputTokens)],
              ["Output tokens", (row) => formatMetricValue(row.outputTokens)],
              ["Total tokens", (row) => formatMetricValue(row.totalTokens ?? row.tokens)],
              ["Credits spent", (row) => formatMetricValue(row.creditsSpent ?? row.credits)],
              ["Avg latency", (row) => formatMetricValue(row.averageLatency ?? row.latency, " ms")],
              ["Error rate", (row) => formatPercent(row.errorRate)],
            ]}
            rows={extractRows(data, ["models", "items", "data"]).map(sanitizeUsageRecord)}
          />
        )}
      </BackendState>

      <BackendState
        resource={providers}
        onRetry={providers.reload}
        title="Provider usage"
        emptyWhen={(data) => extractRows(data, ["providers", "items", "data"]).length === 0}
        emptyMessage="No provider usage rows returned by backend."
      >
        {(data) => (
          <UsageDataTable
            title="Provider usage"
            endpoint="GET /v1/usage/providers"
            caption="Provider usage including fallbacks, success rate, latency, tokens, and credits"
            columns={[
              ["Provider", (row) => String(row.provider ?? row.name ?? "Not returned")],
              ["Requests", (row) => formatMetricValue(row.requestCount ?? row.requests)],
              ["Fallbacks", (row) => formatMetricValue(row.fallbackCount)],
              ["Success rate", (row) => formatPercent(row.successRate)],
              ["Avg latency", (row) => formatMetricValue(row.averageLatency ?? row.latency, " ms")],
              ["Tokens", (row) => formatMetricValue(row.totalTokens ?? row.tokens)],
              ["Credits spent", (row) => formatMetricValue(row.creditsSpent ?? row.credits)],
            ]}
            rows={extractRows(data, ["providers", "items", "data"]).map(sanitizeUsageRecord)}
          />
        )}
      </BackendState>

      <BackendState
        resource={apiKeys}
        onRetry={apiKeys.reload}
        title="API key usage"
        emptyWhen={(data) => extractRows(data, ["apiKeys", "keys", "items", "data"]).length === 0}
        emptyMessage="No API key usage rows returned by backend."
      >
        {(data) => (
          <UsageDataTable
            title="API key usage"
            endpoint="GET /v1/usage/api-keys"
            caption="API key usage with safe prefixes only. Plaintext keys and hashes are never shown."
            columns={[
              ["Key name", (row) => String(row.name ?? "Not returned")],
              ["Prefix", (row) => String(row.prefix ?? row.apiKeyPrefix ?? row.keyPrefix ?? "Not returned")],
              ["Project", (row) => String(row.project ?? row.projectId ?? "Not returned")],
              ["Requests", (row) => formatMetricValue(row.requests ?? row.requestCount)],
              ["Tokens", (row) => formatMetricValue(row.tokens ?? row.totalTokens)],
              ["Credits spent", (row) => formatMetricValue(row.creditsSpent ?? row.credits)],
              ["Last used", (row) => String(row.lastUsedAt ?? "Not returned")],
              ["Monthly limit", (row) => formatMetricValue(row.monthlyCreditLimit)],
              [
                "Limit consumed",
                (row) => {
                  const percent = toNumberOrNull(row.limitConsumedPercent) ?? usagePercentage(row.creditsSpent ?? row.credits, row.monthlyCreditLimit);
                  return percent === null ? "Not returned" : `${percent.toFixed(1)}%`;
                },
              ],
            ]}
            rows={extractRows(data, ["apiKeys", "keys", "items", "data"]).map(sanitizeUsageRecord)}
          />
        )}
      </BackendState>

      <Card>
        <div className="card-heading">
          <h2>Request history filters</h2>
          <span>GET /v1/usage/requests</span>
        </div>
        <div className="settings-grid" role="group" aria-label="Request history filters">
          <label>
            Model
            <input value={filters.model} onChange={(event) => setFilters({ ...filters, model: event.target.value })} />
          </label>
          <label>
            Provider
            <input value={filters.provider} onChange={(event) => setFilters({ ...filters, provider: event.target.value })} />
          </label>
          <label>
            API key ID
            <input value={filters.apiKeyId} onChange={(event) => setFilters({ ...filters, apiKeyId: event.target.value })} />
          </label>
          <label>
            Status
            <input value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} />
          </label>
          <label>
            Project
            <input value={filters.projectId} onChange={(event) => setFilters({ ...filters, projectId: event.target.value })} />
          </label>
          <label>
            Cursor
            <input value={cursor} onChange={(event) => setCursor(event.target.value)} />
          </label>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setAppliedFilters(filters);
            }}
          >
            Apply filters
          </button>
        </div>
      </Card>

      <BackendState
        resource={requests}
        onRetry={requests.reload}
        title="Request history"
        emptyWhen={(data) => extractRows(data, ["items", "requests", "logs", "data"]).length === 0}
        emptyMessage="No request history rows returned by backend."
      >
        {(data) => {
          const rows = extractRows(data, ["items", "requests", "logs", "data"]).map(sanitizeUsageRecord);
          const nextCursor = typeof data === "object" && data && "nextCursor" in data ? String((data as { nextCursor?: string | null }).nextCursor ?? "") : "";

          return (
            <>
              <UsageDataTable
                title="Request history"
                endpoint="GET /v1/usage/requests"
                caption="Paginated request history. Secrets, authorization headers, prompts, and sensitive bodies are never displayed."
                columns={[
                  ["Request ID", (row) => String(row.requestId ?? row.id ?? "Not returned")],
                  ["Timestamp", (row) => String(row.timestamp ?? row.createdAt ?? "Not returned")],
                  ["Status", (row) => String(row.status ?? "Not returned")],
                  ["Model", (row) => String(row.model ?? "Not returned")],
                  ["Provider", (row) => String(row.provider ?? "Not returned")],
                  ["API key", (row) => String(row.apiKeyPrefix ?? row.prefix ?? "Not returned")],
                  ["Latency", (row) => formatMetricValue(row.latency ?? row.latencyMs, " ms")],
                  ["Input tokens", (row) => formatMetricValue(row.inputTokens)],
                  ["Output tokens", (row) => formatMetricValue(row.outputTokens)],
                  ["Credits spent", (row) => formatMetricValue(row.creditsSpent)],
                  ["Error summary", (row) => formatErrorSummary(row.errorSummary ?? row.error)],
                ]}
                rows={rows}
              />
              <Card>
                <div className="card-heading">
                  <h2>Pagination</h2>
                  <span>{nextCursor ? `Next cursor available` : "End of page or no cursor returned"}</span>
                </div>
                <div className="topbar-actions">
                  <button
                    className="ghost-button"
                    type="button"
                    disabled={!nextCursor}
                    onClick={() => {
                      if (nextCursor) {
                        setCursor(nextCursor);
                      }
                    }}
                  >
                    Next page
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      setCursor("");
                      setAppliedFilters(emptyFilters);
                      setFilters(emptyFilters);
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              </Card>
            </>
          );
        }}
      </BackendState>
    </>
  );
}

function UsageDataTable({
  title,
  endpoint,
  caption,
  columns,
  rows,
}: {
  title: string;
  endpoint: string;
  caption: string;
  columns: Array<[string, (row: Record<string, unknown>) => string]>;
  rows: Record<string, unknown>[];
}) {
  return (
    <Card>
      <div className="card-heading">
        <h2>{title}</h2>
        <span>{endpoint}</span>
      </div>
      <div className="table-scroll">
        <table className="usage-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map(([label]) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={String(row.id ?? row.requestId ?? row.name ?? row.model ?? row.provider ?? index)}>
                {columns.map(([label, render]) => (
                  <td key={label}>{render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function formatErrorSummary(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const message = record.message ?? record.code ?? record.type;
    if (typeof message === "string") {
      return message;
    }
  }

  return "Not returned";
}

function toNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }

  return null;
}

function forbiddenResult(endpoint: string): ApiResult<never> {
  return {
    status: "forbidden",
    endpoint,
    statusCode: 403,
    message: "Permission denied for usage data.",
  };
}
