import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { zentroApi } from "../lib/zentroApi";

export function AI() {
  const { apiContext } = useAppSession();
  const ai = useApiResource(() => zentroApi.ai.providers(apiContext), [apiContext.workspaceId, apiContext.projectId]);

  return (
    <>
      <PageHeader
        eyebrow="AI"
        title="AI control center"
        description="Providers and AI routing capabilities from the backend only. Local model/planner details render when the backend includes them."
      />

      <BackendState resource={ai}>
        {(data) => (
          <div className="settings-grid">
            <Card><h2>Available providers</h2><ValueList value={data.providers} /></Card>
            <Card><h2>Available local models</h2><ValueList value={data.localModels} /></Card>
            <Card><h2>Planner</h2><ValueList value={data.planner} /></Card>
            <Card><h2>Default model</h2><ValueList value={data.defaultModel} /></Card>
            <Card><h2>Streaming</h2><ValueList value={data.streaming} /></Card>
            <Card><h2>Provider health</h2><ValueList value={data.providerHealth} /></Card>
            <Card><h2>Latency</h2><ValueList value={data.latency} /></Card>
            <Card><h2>Privacy and routing</h2><ValueList value={{ privacyMode: data.privacyMode, autoRouting: data.autoRouting }} /></Card>
          </div>
        )}
      </BackendState>
    </>
  );
}
