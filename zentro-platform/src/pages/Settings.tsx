import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { settings } from "../data/mockData";

export function Settings() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace settings"
        title="Organization settings"
        description="Configure organization defaults, webhooks, and data privacy preferences."
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
              <input defaultValue={settings.organizationName} />
            </label>
            <label>
              Default project
              <input defaultValue={settings.defaultProject} />
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
              Endpoint URL
              <input defaultValue={settings.webhookUrl} />
            </label>
            <label>
              Signing secret
              <input defaultValue="zentro_whsec_mock" type="password" />
            </label>
            <button className="ghost-button" type="button">
              Send test event
            </button>
          </div>
        </Card>

        <Card className="privacy-card">
          <div className="card-heading">
            <h2>Data privacy</h2>
            <span>Organization controls</span>
          </div>
          <label className="toggle-row">
            <input type="checkbox" defaultChecked={!settings.privacy.retainPrompts} />
            Do not retain prompts after processing
          </label>
          <label className="toggle-row">
            <input type="checkbox" defaultChecked={!settings.privacy.allowTraining} />
            Exclude organization data from model training
          </label>
          <label className="toggle-row">
            <input type="checkbox" defaultChecked={settings.privacy.piiRedaction} />
            Enable automatic PII redaction
          </label>
        </Card>
      </div>
    </>
  );
}
