import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { zentroApi } from "../lib/zentroApi";

export function Analytics() {
  const { apiContext, activeProjectId } = useAppSession();
  const analytics = useApiResource(
    () => activeProjectId ? zentroApi.projects.analytics(activeProjectId, apiContext) : zentroApi.analytics.summary(apiContext),
    [activeProjectId, apiContext.workspaceId]
  );

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Analytics"
        description="Requests, providers, models, errors, latency, and usage. Graphs render only when backend analytics exists."
      />

      <BackendState resource={analytics}>
        {(data) => (
          <div className="settings-grid">
            <Card><h2>Requests</h2><ValueList value={data.requests} /></Card>
            <Card><h2>Providers</h2><ValueList value={data.providers} /></Card>
            <Card><h2>Models</h2><ValueList value={data.models} /></Card>
            <Card><h2>Errors</h2><ValueList value={data.errors} /></Card>
            <Card><h2>Latency</h2><ValueList value={data.latency} /></Card>
            <Card><h2>Usage</h2><ValueList value={data.usage} /></Card>
          </div>
        )}
      </BackendState>
    </>
  );
}
