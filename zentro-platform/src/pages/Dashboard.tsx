import { Card } from "../components/ui/Card";
import { MetricCard } from "../components/ui/MetricCard";
import { PageHeader } from "../components/ui/PageHeader";
import { usePlatform } from "../lib/platformState";

export function Dashboard() {
  const { selectedOrganization, selectedProject } = usePlatform();
  const activeKeys = selectedProject.apiKeyIds.length.toString();
  const dashboardMetrics = [
    {
      label: "Credits remaining",
      value: selectedOrganization.creditsRemaining.toLocaleString(),
      delta: `${selectedOrganization.plan} plan`,
    },
    {
      label: "Requests this month",
      value: selectedProject.usage.requestsThisMonth.toLocaleString(),
      delta: `${selectedProject.usage.requestsToday.toLocaleString()} today`,
    },
    {
      label: "Token usage",
      value: `${(selectedProject.usage.tokensThisMonth / 1000000).toFixed(1)}M`,
      delta: "Project token usage",
    },
    { label: "Active API keys", value: activeKeys, delta: "Scoped to this project" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={selectedProject.name}
        description={`Monitor credits, requests, token usage, and recent activity for ${selectedOrganization.name}/${selectedProject.name}.`}
      />

      <div className="metric-grid">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="two-column">
        <Card className="hero-card">
          <span className="eyebrow">Credits</span>
          <h2>{selectedOrganization.creditsRemaining.toLocaleString()} credits remaining</h2>
          <p>
            This dashboard is scoped to the selected project. Backend metering will replace the
            mock usage summaries when the API is connected.
          </p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: "68%" }} />
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <h2>Latest usage events</h2>
            <span>Mock data</span>
          </div>
          <div className="table-list">
            {selectedProject.usage.events.map((event) => (
              <div className="table-row" key={event.id}>
                <div>
                  <strong>{event.model}</strong>
                  <span>{event.time}</span>
                </div>
                <span>{event.tokens}</span>
                <span>{event.credits} credits</span>
              </div>
            ))}
            {selectedProject.usage.events.length === 0 ? (
              <div className="empty-state">No usage events for this project yet.</div>
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );
}
