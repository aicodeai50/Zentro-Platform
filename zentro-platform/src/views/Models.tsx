import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { models, type ModelStatus } from "../data/mockData";
import { usePlatform } from "../lib/platformState";

const statusTone: Record<ModelStatus, "success" | "warning" | "info"> = {
  available: "success",
  beta: "warning",
  private: "info",
};

export function Models() {
  const { selectedProject } = usePlatform();

  return (
    <>
      <PageHeader
        eyebrow="Model catalog"
        title={`${selectedProject.name} models`}
        description="Choose the right model for speed, reasoning, coding, vision, or private deployments."
      />

      <div className="model-grid">
        {models.map((model) => (
          <Card className="model-card" key={model.name}>
            <div className="plan-topline">
              <h2>{model.name}</h2>
              <div className="inline-actions">
                <Badge tone={statusTone[model.status]}>{model.status}</Badge>
                <Badge tone={selectedProject.modelsEnabled.includes(model.name) ? "success" : "neutral"}>
                  {selectedProject.modelsEnabled.includes(model.name) ? "enabled" : "disabled"}
                </Badge>
              </div>
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
