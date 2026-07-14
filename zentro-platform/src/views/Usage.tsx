import { Card } from "../components/ui/Card";
import { BackendState, ValueList } from "../components/ui/BackendState";
import { PageHeader } from "../components/ui/PageHeader";
import { useAppSession } from "../lib/appSession";
import { useApiResource } from "../lib/useApiResource";
import { zentroApi } from "../lib/zentroApi";

const usageSections = [
  ["Requests", "requests"],
  ["Tokens", "tokens"],
  ["Latency", "latency"],
  ["Provider usage", "providers"],
  ["Model usage", "models"],
  ["Project usage", "projects"],
  ["Workspace usage", "workspaces"],
  ["Errors", "errors"],
  ["Success rate", "successRate"],
] as const;

export function Usage() {
  const { apiContext, activeProjectId } = useAppSession();
  const usage = useApiResource(
    () => (activeProjectId ? zentroApi.projects.analytics(activeProjectId, apiContext) : zentroApi.analytics.summary(apiContext)),
    [activeProjectId, apiContext.workspaceId]
  );

  return (
    <>
      <PageHeader
        eyebrow="Usage"
        title="Usage intelligence"
        description="Requests, tokens, latency, errors, provider mix, model mix, and success rate from backend analytics only."
      />

      <BackendState resource={usage}>
        {(data) => (
          <div className="settings-grid">
            {usageSections.map(([title, key]) => (
              <Card key={key}>
                <div className="card-heading">
                  <h2>{title}</h2>
                  <span>{activeProjectId ? "GET /projects/:projectId/analytics" : "GET /analytics"}</span>
                </div>
                <ValueList value={data[key]} />
              </Card>
            ))}
          </div>
        )}
      </BackendState>
    </>
  );
}
