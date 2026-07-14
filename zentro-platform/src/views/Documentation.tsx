import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

const docs = [
  ["Authentication", "Use project API keys for server-to-server calls and Supabase JWTs for dashboard sessions."],
  ["Organizations", "Manage tenant boundaries with organization records and organization membership endpoints."],
  ["Workspaces", "Use workspaces to group projects, members, settings, and shared API key metadata."],
  ["Projects", "Scope inference, API keys, usage, health, and future deployments to the active project."],
  ["API Keys", "Create, rotate, revoke, and inspect project-scoped keys through backend API key endpoints."],
  ["Chat", "Canonical inference is available when the backend exposes its endpoint in the frontend contract."],
  ["Streaming", "Streaming controls are prepared in the playground and require backend streaming support."],
  ["Errors", "Handle unauthorized, forbidden, validation, capability-required, and backend-unavailable responses."],
  ["Rate limits", "Render limits when the backend returns them through API key or analytics payloads."],
  ["SDKs", "Copy request templates from the playground for cURL, JavaScript, Python, Go, Java, and C#."],
];

export function Documentation() {
  return (
    <>
      <PageHeader
        eyebrow="Documentation"
        title="Zentro developer documentation"
        description="A documentation center for the current backend contract. It explains available surfaces without fabricating endpoint behavior."
      />

      <div className="docs-layout">
        <Card className="docs-quickstart">
          <span className="eyebrow">Contract first</span>
          <h2>Backend capability required</h2>
          <p className="muted-text">
            Inference, billing, webhooks, logs, and SDK-specific endpoints should be added here only after their backend routes are part of
            the real contract.
          </p>
        </Card>

        <div className="docs-grid">
          {docs.map(([title, description]) => (
            <Card className="doc-card" key={title}>
              <h2>{title}</h2>
              <p>{description}</p>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
