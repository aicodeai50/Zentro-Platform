import { useState } from "react";
import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { normalizeBackendList, sanitizeLogRecord } from "../lib/phaseDGuards";
import { backendCapabilityRequired, zentroApi, type ProjectLogs } from "../lib/zentroApi";

export function Logs() {
  const { apiContext, activeProjectId } = useAppSession();
  const [filters, setFilters] = useState({
    cursor: "",
    startDate: "",
    endDate: "",
    status: "",
    provider: "",
    model: "",
    requestId: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const logs = useApiResource(
    () =>
      activeProjectId
        ? zentroApi.projects.logs(
            activeProjectId,
            {
              cursor: appliedFilters.cursor,
              startDate: appliedFilters.startDate,
              endDate: appliedFilters.endDate,
              status: appliedFilters.status,
              provider: appliedFilters.provider,
              model: appliedFilters.model,
              requestId: appliedFilters.requestId,
            },
            apiContext
          )
        : Promise.resolve(backendCapabilityRequired<ProjectLogs>("/v1/projects/:projectId/logs")),
    [activeProjectId, apiContext.workspaceId, appliedFilters]
  );

  return (
    <>
      <PageHeader
        eyebrow="Logs"
        title="Project logs"
        description="Paginated Phase D project logs with date, status, provider, model, and request ID filters. Prompts, responses, full keys, and secrets are never rendered."
      />

      <Card>
        <div className="card-heading">
          <h2>Filters</h2>
          <span>GET /v1/projects/:projectId/logs</span>
        </div>
        <div className="settings-grid">
          <label>Start date<input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} /></label>
          <label>End date<input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} /></label>
          <label>Status<input value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} /></label>
          <label>Provider<input value={filters.provider} onChange={(event) => setFilters({ ...filters, provider: event.target.value })} /></label>
          <label>Model<input value={filters.model} onChange={(event) => setFilters({ ...filters, model: event.target.value })} /></label>
          <label>Request ID<input value={filters.requestId} onChange={(event) => setFilters({ ...filters, requestId: event.target.value })} /></label>
          <label>Cursor<input value={filters.cursor} onChange={(event) => setFilters({ ...filters, cursor: event.target.value })} /></label>
          <button className="primary-button" type="button" onClick={() => setAppliedFilters(filters)}>Apply filters</button>
        </div>
      </Card>

      <BackendState resource={logs}>
        {(data) => (
          <Card>
            <div className="card-heading">
              <h2>Logs</h2>
              <span>GET /v1/projects/:projectId/logs</span>
            </div>
            <ValueList value={normalizeBackendList<Record<string, unknown>>(data, ["items", "logs", "data"]).map(sanitizeLogRecord)} />
            <ValueList value={{ nextCursor: data.nextCursor ?? data.cursor, page: data.page, total: data.total }} />
          </Card>
        )}
      </BackendState>
    </>
  );
}
