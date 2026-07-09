import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { usePlatform } from "../lib/platformState";

export function Settings() {
  const { selectedOrganization, selectedProject } = usePlatform();

  return (
    <>
      <PageHeader
        eyebrow="Project settings"
        title={`${selectedProject.name} settings`}
        description="Configure general settings, environment, CORS, rate limits, webhooks, members, and secrets placeholders."
      />

      <div className="settings-grid">
        <Card>
          <div className="card-heading">
            <h2>Organization</h2>
            <span>Mock form</span>
          </div>
          <div className="form-grid">
            <label>
              Organization name
              <input defaultValue={selectedOrganization.name} />
            </label>
            <label>
              Project name
              <input defaultValue={selectedProject.name} />
            </label>
            <label>
              Description
              <textarea defaultValue={selectedProject.description} rows={3} />
            </label>
            <button className="primary-button" type="button">
              Save changes
            </button>
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <h2>Webhooks</h2>
            <span>Placeholder</span>
          </div>
          <div className="form-grid">
            <label>
              Environment
              <select defaultValue={selectedProject.environment}>
                <option value="test">Test</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
                <option value="live">Live</option>
              </select>
            </label>
            <label>
              Allowed Origins (CORS)
              <textarea defaultValue={selectedProject.settings.allowedOrigins.join("\n")} rows={4} />
            </label>
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <h2>Rate Limits</h2>
            <span>Per project</span>
          </div>
          <div className="form-grid">
            <label>
              Requests per minute
              <input defaultValue={selectedProject.settings.rateLimits.requestsPerMinute} type="number" />
            </label>
            <label>
              Tokens per minute
              <input defaultValue={selectedProject.settings.rateLimits.tokensPerMinute} type="number" />
            </label>
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <h2>Webhooks</h2>
            <span>Placeholder</span>
          </div>
          <div className="form-grid">
            <label>
              Endpoint URL
              <input defaultValue={selectedProject.settings.webhooks.url} />
            </label>
            <label>
              Events
              <input defaultValue={selectedProject.settings.webhooks.events.join(", ")} />
            </label>
            <button className="ghost-button" type="button">
              Send test event
            </button>
          </div>
        </Card>

        <Card className="privacy-card">
          <div className="card-heading">
            <h2>Members and Secrets</h2>
            <span>Project access</span>
          </div>
          <div className="table-list">
            {selectedOrganization.members.map((member) => (
              <div className="table-row" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <span>{member.email}</span>
                </div>
                <span>{member.role}</span>
                <span>{member.status}</span>
              </div>
            ))}
          </div>
          <div className="empty-state">{selectedProject.settings.secretsPlaceholder}</div>
        </Card>
      </div>
    </>
  );
}
