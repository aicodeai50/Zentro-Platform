import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { usePlatform } from "../lib/platformState";

export function Projects() {
  const { organizationProjects, selectedOrganization, selectProject } = usePlatform();

  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title={`${selectedOrganization.name} projects`}
        description="Projects isolate keys, usage, models, members, rate limits, webhooks, and settings."
        actions={
          <Link className="primary-button" to="/projects/new">
            <Plus size={16} />
            New project
          </Link>
        }
      />

      <div className="projects-grid">
        {organizationProjects.map((project) => (
          <Card className="project-card" key={project.id}>
            <div className="plan-topline">
              <h2>{project.name}</h2>
              <Badge tone={project.environment === "production" ? "success" : "neutral"}>
                {project.environment}
              </Badge>
            </div>
            <p>{project.description}</p>
            <div className="project-stats">
              <div>
                <span>Requests today</span>
                <strong>{project.usage.requestsToday.toLocaleString()}</strong>
              </div>
              <div>
                <span>Active API keys</span>
                <strong>{project.apiKeyIds.length}</strong>
              </div>
              <div>
                <span>Last activity</span>
                <strong>{project.usage.latestActivity}</strong>
              </div>
            </div>
            <div className="inline-actions">
              <button className="ghost-button" type="button" onClick={() => selectProject(project.id)}>
                Set current
              </button>
              <Link className="ghost-button" to={`/projects/${project.id}`}>
                View details
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
