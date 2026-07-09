import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import type { Environment } from "../data/types";
import { api } from "../lib/apiClient";
import { usePlatform } from "../lib/platformState";

export function ProjectNew() {
  const navigate = useNavigate();
  const { selectedOrganization, selectProject } = usePlatform();
  const [form, setForm] = useState({
    name: "New Project",
    description: "Describe what this project powers.",
    environment: "test" as Environment,
  });

  async function createProject() {
    const project = await api.projects.create({
      organizationId: selectedOrganization.id,
      name: form.name,
      description: form.description,
      environment: form.environment,
    });

    selectProject(project.id);
    navigate(`/projects/${project.id}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Projects"
        title="Create project"
        description="Define a new API boundary for keys, usage, models, settings, members, and logs."
      />

      <Card>
        <div className="form-grid">
          <label>
            Name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <label>
            Environment
            <select
              value={form.environment}
              onChange={(event) => setForm({ ...form, environment: event.target.value as Environment })}
            >
              <option value="test">Test</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
              <option value="live">Live</option>
            </select>
          </label>
          <button className="primary-button" type="button" onClick={createProject}>
            Create project
          </button>
        </div>
      </Card>
    </>
  );
}
