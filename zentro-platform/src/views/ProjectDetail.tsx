import { Link, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { MetricCard } from "../components/ui/MetricCard";
import { PageHeader } from "../components/ui/PageHeader";
import { projects } from "../data/projects";
import { usePlatform } from "../lib/platformState";

export function ProjectDetail() {
  const { id } = useParams();
  const { selectProject } = usePlatform();
  const project = projects.find((item) => item.id === id);

  if (!project) {
    return (
      <Card>
        <h1>Project not found</h1>
        <p>The selected mock project does not exist.</p>
        <Link className="ghost-button" to="/projects">
          Back to projects
        </Link>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Project"
        title={project.name}
        description={project.description}
        actions={
          <button className="primary-button" type="button" onClick={() => selectProject(project.id)}>
            Set current project
          </button>
        }
      />

      <div className="metric-grid">
        <MetricCard label="Environment" value={project.environment} delta={`Created ${project.createdAt}`} />
        <MetricCard
          label="Requests today"
          value={project.usage.requestsToday.toLocaleString()}
          delta={project.usage.latestActivity}
        />
        <MetricCard label="Active API keys" value={project.apiKeyIds.length.toString()} delta="Live and test" />
        <MetricCard
          label="Enabled models"
          value={project.modelsEnabled.length.toString()}
          delta={project.modelsEnabled.join(", ")}
        />
      </div>

      <div className="two-column">
        <Card>
          <div className="card-heading">
            <h2>Project controls</h2>
            <Badge tone={project.environment === "production" ? "success" : "neutral"}>
              {project.environment}
            </Badge>
          </div>
          <div className="project-links">
            <Link className="ghost-button" to="/dashboard">Overview</Link>
            <Link className="ghost-button" to="/api-keys">API Keys</Link>
            <Link className="ghost-button" to="/usage">Usage</Link>
            <Link className="ghost-button" to="/settings">Settings</Link>
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <h2>Settings summary</h2>
            <span>Production-shaped mock</span>
          </div>
          <div className="table-list">
            <div className="table-row">
              <strong>Allowed origins</strong>
              <span>{project.settings.allowedOrigins.length || "None"}</span>
            </div>
            <div className="table-row">
              <strong>Requests per minute</strong>
              <span>{project.settings.rateLimits.requestsPerMinute.toLocaleString()}</span>
            </div>
            <div className="table-row">
              <strong>Webhook events</strong>
              <span>{project.settings.webhooks.events.length || "None"}</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
