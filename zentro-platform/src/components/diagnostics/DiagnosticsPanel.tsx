import { Card } from "../ui/Card";
import { BackendState, ValueList } from "../ui/BackendState";
import { useAppSession } from "../../lib/appSession";
import { useApiResource } from "../../lib/useApiResource";
import { zentroApi } from "../../lib/zentroApi";

const diagnosticsEnabled =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ENABLE_PLATFORM_DIAGNOSTICS === "true";

export function DiagnosticsPanel() {
  const { session, bootstrap, activeWorkspaceId, activeProjectId, apiContext } = useAppSession();
  const health = useApiResource(() => zentroApi.health.application(apiContext), [apiContext.workspaceId]);

  if (!diagnosticsEnabled) {
    return null;
  }

  return (
    <Card className="privacy-card">
      <div className="card-heading">
        <h2>Development diagnostics</h2>
        <span>No secrets displayed</span>
      </div>
      <div className="table-list">
        <div className="table-row"><strong>Supabase session present</strong><span>{session ? "yes" : "no"}</span></div>
        <div className="table-row"><strong>Backend session verified</strong><span>{bootstrap ? "yes" : "no"}</span></div>
        <div className="table-row"><strong>Active workspace ID</strong><span>{activeWorkspaceId ?? "none"}</span></div>
        <div className="table-row"><strong>Active project ID</strong><span>{activeProjectId ?? "none"}</span></div>
      </div>
      <BackendState resource={health}>
        {(data) => <ValueList value={{ status: data.status, version: data.version, uptime: data.uptime }} />}
      </BackendState>
    </Card>
  );
}
