import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { models, type ModelStatus } from "../data/mockData";

const statusTone: Record<ModelStatus, "success" | "warning" | "info"> = {
  available: "success",
  beta: "warning",
  private: "info",
};

export function Models() {
  return (
    <>
      <PageHeader
        eyebrow="Model catalog"
        title="Zentro models"
        description="Choose the right model for speed, reasoning, coding, vision, or private deployments."
      />

      <div className="model-grid">
        {models.map((model) => (
          <Card className="model-card" key={model.name}>
            <div className="plan-topline">
              <h2>{model.name}</h2>
              <Badge tone={statusTone[model.status]}>{model.status}</Badge>
            </div>
            <p>{model.bestFor}</p>
            <dl>
              <div>
                <dt>Context</dt>
                <dd>{model.context}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>{model.price}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
    </>
  );
}
