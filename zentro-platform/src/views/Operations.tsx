import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Card } from "../components/ui/Card";
import { BackendState } from "../components/ui/BackendState";
import { MetricCard } from "../components/ui/MetricCard";
import { PageHeader } from "../components/ui/PageHeader";
import { ProviderStatusBadge } from "../components/operations/ProviderStatusBadge";
import { UsageBarChart } from "../components/usage/UsageBarChart";
import { useAppSession } from "../lib/appSession";
import {
  canViewProviderOperations,
  countProvidersByStatus,
  extractErrorRows,
  extractFallbackRows,
  extractIncidentRows,
  extractModelRows,
  extractOpsOverview,
  extractOpsSeries,
  extractProviderRows,
  filterModelRows,
  firstSuccessfulResult,
  formatOpsMetric,
  formatOpsPercent,
  formatTimestamp,
  normalizeProviderStatus,
  opsRangeToQuery,
  sanitizeOperationsRecord,
  type OpsRange,
} from "../lib/operationsGuards";
import { useApiResource } from "../lib/useApiResource";
import { zentroApi, type ApiResult, type OperationsQuery } from "../lib/zentroApi";

const ranges: Array<{ id: OpsRange; label: string }> = [
  { id: "1h", label: "1 hour" },
  { id: "24h", label: "24 hours" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

const POLL_INTERVAL_MS = 45_000;

export function Operations() {
  const { apiContext, bootstrap } = useAppSession();
  const roles = bootstrap?.roles ?? [];
  const canView = canViewProviderOperations(roles);

  const [range, setRange] = useState<OpsRange>("24h");
  const [pollEnabled, setPollEnabled] = useState(() => !isTestEnvironment());
  const [pollKey, setPollKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [modelFilters, setModelFilters] = useState({ provider: "", status: "", capability: "", search: "" });
  const pollingLock = useRef(false);

  const query = useMemo<OperationsQuery>(() => opsRangeToQuery(range), [range]);

  const summary = useApiResource(
    () =>
      canView
        ? firstSuccessfulResult<unknown>([
            () => zentroApi.operations.summary(query, apiContext),
            () => zentroApi.usage.summary({ range }, apiContext),
          ])
        : Promise.resolve(forbiddenOps("/v1/operations/summary")),
    [apiContext.workspaceId, canView, query, range],
    { pollKey }
  );

  const providers = useApiResource(
    () =>
      canView
        ? firstSuccessfulResult<unknown>([
            () => zentroApi.operations.providers(query, apiContext),
            () => zentroApi.ai.providers(apiContext),
            () => zentroApi.usage.providers({ range }, apiContext),
          ])
        : Promise.resolve(forbiddenOps("/v1/operations/providers")),
    [apiContext.workspaceId, canView, query, range],
    { pollKey }
  );

  const models = useApiResource(
    () =>
      canView
        ? firstSuccessfulResult<unknown>([
            () => zentroApi.operations.models(query, apiContext),
            () => zentroApi.usage.models({ range }, apiContext),
            () => zentroApi.ai.localModels(apiContext),
          ])
        : Promise.resolve(forbiddenOps("/v1/operations/models")),
    [apiContext.workspaceId, canView, query, range],
    { pollKey }
  );

  const fallbacks = useApiResource(
    () => (canView ? zentroApi.operations.fallbacks(query, apiContext) : Promise.resolve(forbiddenOps("/v1/operations/fallbacks"))),
    [apiContext.workspaceId, canView, query],
    { pollKey }
  );

  const errors = useApiResource(
    () => (canView ? zentroApi.operations.errors(query, apiContext) : Promise.resolve(forbiddenOps("/v1/operations/errors"))),
    [apiContext.workspaceId, canView, query],
    { pollKey }
  );

  const incidents = useApiResource(
    () => (canView ? zentroApi.operations.incidents(query, apiContext) : Promise.resolve(forbiddenOps("/v1/operations/incidents"))),
    [apiContext.workspaceId, canView, query],
    { pollKey }
  );

  const health = useApiResource(
    () => (canView ? zentroApi.health.application(apiContext) : Promise.resolve(forbiddenOps("/health"))),
    [apiContext.workspaceId, canView],
    { pollKey }
  );

  const providerDetail = useApiResource(
    () =>
      canView && selectedProvider
        ? zentroApi.operations.provider(selectedProvider, query, apiContext)
        : Promise.resolve(forbiddenOps("/v1/operations/providers/:provider")),
    [apiContext.workspaceId, canView, query, selectedProvider],
    { pollKey }
  );

  useEffect(() => {
    if (!pollEnabled || !canView) {
      return;
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || pollingLock.current) {
        return;
      }

      pollingLock.current = true;
      setPollKey((value) => value + 1);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [canView, pollEnabled]);

  const resourcesLoaded =
    summary.state === "loaded" &&
    providers.state === "loaded" &&
    models.state === "loaded" &&
    fallbacks.state === "loaded" &&
    errors.state === "loaded" &&
    incidents.state === "loaded" &&
    health.state === "loaded";

  useEffect(() => {
    if (!resourcesLoaded) {
      return;
    }

    setLastUpdated(new Date());
    pollingLock.current = false;
  }, [resourcesLoaded, pollKey, range]);

  function refreshAll() {
    pollingLock.current = false;
    summary.reload();
    providers.reload();
    models.reload();
    fallbacks.reload();
    errors.reload();
    incidents.reload();
    health.reload();
    if (selectedProvider) {
      providerDetail.reload();
    }
  }

  if (!canView) {
    return (
      <>
        <PageHeader
          eyebrow="Operations"
          title="Provider operations"
          description="Internal provider operations require owner, admin, or platform operations roles."
        />
        <Card className="capability-card">
          <span className="eyebrow">Access denied</span>
          <h2>Insufficient role for provider operations</h2>
          <p>Platform-wide provider details are restricted. Backend permissions remain authoritative.</p>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Provider operations"
        description="Internal monitoring for provider health, models, latency, errors, fallbacks, and incidents. Secrets, internal URLs, prompts, and raw provider payloads are never rendered."
      />

      <Card>
        <div className="card-heading">
          <h2>Controls</h2>
          <span>{lastUpdated ? `Last updated ${lastUpdated.toLocaleString()}` : "Waiting for first load"}</span>
        </div>
        <div className="settings-grid" role="group" aria-label="Operations controls">
          <label>
            Range
            <select value={range} onChange={(event) => setRange(event.target.value as OpsRange)}>
              {ranges.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={pollEnabled} onChange={(event) => setPollEnabled(event.target.checked)} />
            Auto-refresh every 45 seconds
          </label>
          <button className="primary-button" type="button" onClick={refreshAll} aria-label="Refresh operations data">
            Refresh now
          </button>
        </div>
      </Card>

      <BackendState resource={summary} onRetry={summary.reload} title="Operations overview" emptyWhen={(data) => Object.keys(data ?? {}).length === 0}>
        {(data) => {
          const metrics = extractOpsOverview(data);
          const providerCounts =
            providers.state === "loaded" && providers.result.status === "success"
              ? countProvidersByStatus(extractProviderRows(providers.result.data))
              : null;

          return (
            <div className="metric-grid" aria-label="Operations overview metrics">
              <MetricCard label="Total requests" value={formatOpsMetric(metrics.totalRequests)} />
              <MetricCard label="Requests per minute" value={formatOpsMetric(metrics.requestsPerMinute)} />
              <MetricCard label="Success rate" value={formatOpsPercent(metrics.successRate)} />
              <MetricCard label="Error rate" value={formatOpsPercent(metrics.errorRate)} />
              <MetricCard label="Average latency" value={formatOpsMetric(metrics.averageLatency, " ms")} />
              <MetricCard label="p95 latency" value={formatOpsMetric(metrics.p95Latency, " ms")} />
              <MetricCard label="Active providers" value={formatOpsMetric(metrics.activeProviders ?? providerCounts?.healthy)} />
              <MetricCard label="Degraded providers" value={formatOpsMetric(metrics.degradedProviders ?? providerCounts?.degraded)} />
              <MetricCard label="Offline providers" value={formatOpsMetric(metrics.offlineProviders ?? providerCounts?.offline)} />
              <MetricCard label="Fallback rate" value={formatOpsPercent(metrics.fallbackRate)} />
            </div>
          );
        }}
      </BackendState>

      <BackendState
        resource={providers}
        onRetry={providers.reload}
        title="Provider health"
        emptyWhen={(data) => extractProviderRows(data).length === 0}
        emptyMessage="No provider health rows returned by backend."
      >
        {(data) => {
          const rows = extractProviderRows(data);
          return (
            <OpsTable
              title="Provider health"
              endpoint="GET /v1/operations/providers"
              caption="Provider health status, latency, success rates, and incidents"
              columns={[
                ["Provider", (row) => String(row.name ?? row.provider ?? row.id ?? "Not returned")],
                ["Status", (row) => <ProviderStatusBadge status={row.status ?? row.health ?? row.state} />],
                ["Enabled", (row) => formatEnabled(row.enabled)],
                ["Last success", (row) => formatTimestamp(row.lastSuccessfulCheck ?? row.lastSuccessAt)],
                ["Last failure", (row) => formatTimestamp(row.lastFailedCheck ?? row.lastFailureAt)],
                ["Avg latency", (row) => formatOpsMetric(row.averageLatency ?? row.latency, " ms")],
                ["p95 latency", (row) => formatOpsMetric(row.p95Latency, " ms")],
                ["Success rate", (row) => formatOpsPercent(row.successRate)],
                ["Error rate", (row) => formatOpsPercent(row.errorRate)],
                ["Requests", (row) => formatOpsMetric(row.requests ?? row.requestCount)],
                ["Active models", (row) => formatActiveModels(row.activeModels)],
                ["Incident", (row) => String(row.incidentSummary ?? row.incident ?? "None reported")],
                [
                  "Details",
                  (row) => {
                    const id = String(row.id ?? row.provider ?? row.name ?? "");
                    return (
                      <button className="ghost-button" type="button" disabled={!id} onClick={() => setSelectedProvider(id || null)}>
                        Open
                      </button>
                    );
                  },
                ],
              ]}
              rows={rows}
            />
          );
        }}
      </BackendState>

      {selectedProvider ? (
        <Card className="modal-card ops-detail-card">
          <div className="card-heading">
            <h2>Provider detail: {selectedProvider}</h2>
            <button className="ghost-button" type="button" onClick={() => setSelectedProvider(null)}>
              Close
            </button>
          </div>
          <BackendState
            resource={providerDetail}
            onRetry={providerDetail.reload}
            title="Provider detail"
            emptyWhen={(data) => Object.keys(data ?? {}).length === 0}
            emptyMessage="No provider detail returned by backend."
          >
            {(data) => {
              const detail = sanitizeOperationsRecord(asRecord(data));
              return (
                <div className="settings-grid">
                  <div className="metric-grid compact" aria-label={`${selectedProvider} status metrics`}>
                    <MetricCard label="Status" value={normalizeProviderStatus(detail.status ?? detail.health).toUpperCase()} />
                    <MetricCard label="Avg latency" value={formatOpsMetric(detail.averageLatency, " ms")} />
                    <MetricCard label="p95 latency" value={formatOpsMetric(detail.p95Latency, " ms")} />
                    <MetricCard label="Success rate" value={formatOpsPercent(detail.successRate)} />
                  </div>
                  <ProviderStatusBadge status={detail.status ?? detail.health} />
                  <UsageBarChart title="Latency trend" endpoint="GET /v1/operations/providers/:provider" points={extractOpsSeries(detail, ["latency", "latencyTrend", "latencyByDay"])} />
                  <UsageBarChart title="Request volume trend" endpoint="GET /v1/operations/providers/:provider" points={extractOpsSeries(detail, ["requests", "requestVolume", "requestsByDay"])} />
                  <UsageBarChart title="Success trend" endpoint="GET /v1/operations/providers/:provider" points={extractOpsSeries(detail, ["success", "successTrend"])} />
                  <UsageBarChart title="Failure trend" endpoint="GET /v1/operations/providers/:provider" points={extractOpsSeries(detail, ["failed", "failureTrend", "errors"])} />
                  <OpsTable
                    title="Error code breakdown"
                    endpoint="GET /v1/operations/providers/:provider"
                    caption="Safe error code breakdown for selected provider"
                    columns={[
                      ["Code", (row) => String(row.code ?? row.errorCode ?? row.name ?? "Not returned")],
                      ["Count", (row) => formatOpsMetric(row.count ?? row.total)],
                    ]}
                    rows={extractErrorRows(detail.errorBreakdown ?? detail.errors ?? detail.errorCodes)}
                  />
                  <OpsTable
                    title="Models"
                    endpoint="GET /v1/operations/providers/:provider"
                    caption="Models exposed by selected provider"
                    columns={[
                      ["Model", (row) => String(row.model ?? row.name ?? "Not returned")],
                      ["Availability", (row) => String(row.availability ?? row.status ?? "Not returned")],
                    ]}
                    rows={extractModelRows(detail.models ?? detail)}
                  />
                  <OpsTable
                    title="Recent incidents"
                    endpoint="GET /v1/operations/providers/:provider"
                    caption="Recent incidents for selected provider"
                    columns={[
                      ["Incident", (row) => String(row.id ?? row.incidentId ?? "Not returned")],
                      ["Severity", (row) => String(row.severity ?? "Not returned")],
                      ["Status", (row) => String(row.status ?? "Not returned")],
                      ["Summary", (row) => String(row.summary ?? row.message ?? "Not returned")],
                    ]}
                    rows={extractIncidentRows(detail.incidents ?? detail)}
                  />
                  <OpsTable
                    title="Recent fallback events"
                    endpoint="GET /v1/operations/providers/:provider"
                    caption="Recent fallback events for selected provider"
                    columns={[
                      ["Timestamp", (row) => formatTimestamp(row.timestamp ?? row.createdAt)],
                      ["Request ID", (row) => String(row.requestId ?? row.id ?? "Not returned")],
                      ["Reason", (row) => String(row.reasonCode ?? row.reason ?? "Not returned")],
                      ["Outcome", (row) => String(row.finalOutcome ?? row.outcome ?? "Not returned")],
                    ]}
                    rows={extractFallbackRows(detail.fallbacks ?? detail.fallbackEvents ?? detail)}
                  />
                  <OpsTable
                    title="Last health checks"
                    endpoint="GET /v1/operations/providers/:provider"
                    caption="Recent health checks for selected provider"
                    columns={[
                      ["Timestamp", (row) => formatTimestamp(row.timestamp ?? row.checkedAt ?? row.createdAt)],
                      ["Status", (row) => <ProviderStatusBadge status={row.status ?? row.result} />],
                      ["Latency", (row) => formatOpsMetric(row.latency ?? row.latencyMs, " ms")],
                      ["Summary", (row) => String(row.summary ?? row.message ?? "Not returned")],
                    ]}
                    rows={extractErrorRows(detail.healthChecks ?? detail.checks ?? [])}
                  />
                </div>
              );
            }}
          </BackendState>
        </Card>
      ) : null}

      <Card>
        <div className="card-heading">
          <h2>Model operations filters</h2>
          <span>GET /v1/operations/models</span>
        </div>
        <div className="settings-grid" role="group" aria-label="Model operations filters">
          <label>
            Provider
            <input value={modelFilters.provider} onChange={(event) => setModelFilters({ ...modelFilters, provider: event.target.value })} />
          </label>
          <label>
            Status
            <input value={modelFilters.status} onChange={(event) => setModelFilters({ ...modelFilters, status: event.target.value })} />
          </label>
          <label>
            Capability
            <input value={modelFilters.capability} onChange={(event) => setModelFilters({ ...modelFilters, capability: event.target.value })} />
          </label>
          <label>
            Model search
            <input value={modelFilters.search} onChange={(event) => setModelFilters({ ...modelFilters, search: event.target.value })} />
          </label>
        </div>
      </Card>

      <BackendState
        resource={models}
        onRetry={models.reload}
        title="Model operations"
        emptyWhen={(data) => filterModelRows(extractModelRows(data), modelFilters).length === 0}
        emptyMessage="No model operations rows returned by backend for the current filters."
      >
        {(data) => (
          <OpsTable
            title="Model operations"
            endpoint="GET /v1/operations/models"
            caption="Model availability, streaming, latency, and error rates"
            columns={[
              ["Model", (row) => String(row.canonicalName ?? row.model ?? row.name ?? "Not returned")],
              ["Provider", (row) => String(row.provider ?? "Not returned")],
              ["Availability", (row) => <ProviderStatusBadge status={row.availability ?? row.status} />],
              ["Streaming", (row) => formatEnabled(row.streaming)],
              ["Context window", (row) => formatOpsMetric(row.contextWindow)],
              ["Requests", (row) => formatOpsMetric(row.requestCount ?? row.requests)],
              ["Success rate", (row) => formatOpsPercent(row.successRate)],
              ["Avg latency", (row) => formatOpsMetric(row.averageLatency, " ms")],
              ["p95 latency", (row) => formatOpsMetric(row.p95Latency, " ms")],
              ["Error rate", (row) => formatOpsPercent(row.errorRate)],
              ["Fallback usage", (row) => formatOpsMetric(row.fallbackUsage ?? row.fallbacks)],
              ["Last success", (row) => formatTimestamp(row.lastSuccessfulRequest)],
              ["Last failure", (row) => formatTimestamp(row.lastFailedRequest)],
            ]}
            rows={filterModelRows(extractModelRows(data), modelFilters)}
          />
        )}
      </BackendState>

      <BackendState resource={fallbacks} onRetry={fallbacks.reload} title="Fallback activity" emptyWhen={(data) => extractFallbackRows(data).length === 0} emptyMessage="No fallback events returned by backend.">
        {(data) => (
          <OpsTable
            title="Fallback activity"
            endpoint="GET /v1/operations/fallbacks"
            caption="Safe fallback operational metadata without prompts or secrets"
            columns={[
              ["Timestamp", (row) => formatTimestamp(row.timestamp ?? row.createdAt)],
              ["Request ID", (row) => String(row.requestId ?? row.id ?? "Not returned")],
              ["Requested model", (row) => String(row.requestedModel ?? row.model ?? "Not returned")],
              ["Original provider", (row) => String(row.originalProvider ?? row.fromProvider ?? "Not returned")],
              ["Fallback provider", (row) => String(row.fallbackProvider ?? row.toProvider ?? "Not returned")],
              ["Reason code", (row) => String(row.reasonCode ?? row.reason ?? "Not returned")],
              ["Final outcome", (row) => String(row.finalOutcome ?? row.outcome ?? "Not returned")],
              ["Total latency", (row) => formatOpsMetric(row.totalLatency ?? row.latency, " ms")],
            ]}
            rows={extractFallbackRows(data)}
          />
        )}
      </BackendState>

      <BackendState resource={errors} onRetry={errors.reload} title="Error analysis" emptyWhen={(data) => !hasErrorAnalysis(data)} emptyMessage="No error analysis data returned by backend.">
        {(data) => {
          const record = asRecord(data);
          return (
            <div className="settings-grid">
              <div className="metric-grid compact" aria-label="Error analysis summary">
                <MetricCard label="Timeouts" value={formatOpsMetric(record.timeoutCount ?? record.timeouts)} />
                <MetricCard label="Rate limits" value={formatOpsMetric(record.rateLimitCount ?? record.rateLimits)} />
                <MetricCard label="Auth failures" value={formatOpsMetric(record.authenticationFailureCount ?? record.authFailures)} />
                <MetricCard label="Provider unavailable" value={formatOpsMetric(record.providerUnavailableCount ?? record.unavailable)} />
              </div>
              <OpsTable
                title="Errors by provider"
                endpoint="GET /v1/operations/errors"
                caption="Errors grouped by provider with sanitized codes"
                columns={[
                  ["Provider", (row) => String(row.provider ?? row.name ?? "Not returned")],
                  ["Count", (row) => formatOpsMetric(row.count ?? row.total ?? row.errors)],
                  ["Code", (row) => String(row.code ?? row.errorCode ?? "Not returned")],
                ]}
                rows={extractErrorRows(record.byProvider ?? record.errorsByProvider ?? data)}
              />
              <OpsTable
                title="Errors by model"
                endpoint="GET /v1/operations/errors"
                caption="Errors grouped by model with sanitized codes"
                columns={[
                  ["Model", (row) => String(row.model ?? row.name ?? "Not returned")],
                  ["Count", (row) => formatOpsMetric(row.count ?? row.total ?? row.errors)],
                  ["Code", (row) => String(row.code ?? row.errorCode ?? "Not returned")],
                ]}
                rows={extractErrorRows(record.byModel ?? record.errorsByModel ?? [])}
              />
              <OpsTable
                title="Errors by safe code"
                endpoint="GET /v1/operations/errors"
                caption="Errors grouped by safe error code"
                columns={[
                  ["Code", (row) => String(row.code ?? row.errorCode ?? row.name ?? "Not returned")],
                  ["Count", (row) => formatOpsMetric(row.count ?? row.total)],
                ]}
                rows={extractErrorRows(record.byCode ?? record.errorsByCode ?? [])}
              />
            </div>
          );
        }}
      </BackendState>

      <BackendState resource={incidents} onRetry={incidents.reload} title="Incidents" emptyWhen={(data) => extractIncidentRows(data).length === 0} emptyMessage="No incidents returned by backend.">
        {(data) => (
          <OpsTable
            title="Incidents"
            endpoint="GET /v1/operations/incidents"
            caption="Current and historical provider incidents"
            columns={[
              ["Incident ID", (row) => String(row.id ?? row.incidentId ?? "Not returned")],
              ["Provider", (row) => String(row.provider ?? "Not returned")],
              ["Severity", (row) => String(row.severity ?? "Not returned")],
              ["Started", (row) => formatTimestamp(row.startedAt ?? row.startAt)],
              ["Resolved", (row) => formatTimestamp(row.resolvedAt ?? row.endAt)],
              ["Status", (row) => String(row.status ?? "Not returned")],
              ["Summary", (row) => String(row.summary ?? row.message ?? "Not returned")],
              ["Affected models", (row) => formatActiveModels(row.affectedModels)],
              ["Request impact", (row) => formatOpsMetric(row.requestImpact ?? row.impactedRequests)],
            ]}
            rows={extractIncidentRows(data)}
          />
        )}
      </BackendState>

      <BackendState resource={health} onRetry={health.reload} title="Platform health">
        {(data) => (
          <Card>
            <div className="card-heading">
              <h2>Platform health snapshot</h2>
              <span>GET /health</span>
            </div>
            <div className="metric-grid compact">
              <MetricCard label="Status" value={String(asRecord(data).status ?? asRecord(data).ok ?? "Not returned")} />
              <MetricCard label="Version" value={String(asRecord(data).version ?? "Not returned")} />
              <MetricCard label="Uptime" value={formatOpsMetric(asRecord(data).uptime)} />
            </div>
            <p className="muted-text">Provider nested checks render only as sanitized operational fields. Internal URLs are redacted.</p>
          </Card>
        )}
      </BackendState>
    </>
  );
}

function OpsTable({
  title,
  endpoint,
  caption,
  columns,
  rows,
}: {
  title: string;
  endpoint: string;
  caption: string;
  columns: Array<[string, (row: Record<string, unknown>) => ReactNode]>;
  rows: Record<string, unknown>[];
}) {
  return (
    <Card>
      <div className="card-heading">
        <h2>{title}</h2>
        <span>{endpoint}</span>
      </div>
      {rows.length ? (
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
                <tr key={String(row.id ?? row.requestId ?? row.model ?? row.provider ?? row.name ?? index)}>
                  {columns.map(([label, render]) => (
                    <td key={label}>{render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty-state">No rows returned by backend.</p>
      )}
    </Card>
  );
}

function formatEnabled(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "Enabled" : "Disabled";
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return "Not returned";
}

function formatActiveModels(value: unknown) {
  if (Array.isArray(value)) {
    return String(value.length);
  }

  return formatOpsMetric(value);
}

function hasErrorAnalysis(data: unknown) {
  const record = asRecord(data);
  return (
    extractErrorRows(record.byProvider ?? record.errorsByProvider ?? data).length > 0 ||
    extractErrorRows(record.byModel ?? record.errorsByModel ?? []).length > 0 ||
    extractErrorRows(record.byCode ?? record.errorsByCode ?? []).length > 0 ||
    record.timeoutCount != null ||
    record.rateLimitCount != null ||
    record.authenticationFailureCount != null ||
    record.providerUnavailableCount != null
  );
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function forbiddenOps(endpoint: string): ApiResult<never> {
  return {
    status: "forbidden",
    endpoint,
    statusCode: 403,
    message: "Permission denied for provider operations.",
  };
}

function isTestEnvironment() {
  return typeof process !== "undefined" && process.env.NODE_ENV === "test";
}
