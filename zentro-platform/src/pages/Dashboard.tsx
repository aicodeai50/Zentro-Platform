import { Card } from "../components/ui/Card";
import { MetricCard } from "../components/ui/MetricCard";
import { PageHeader } from "../components/ui/PageHeader";
import { dashboardMetrics, usageEvents } from "../data/mockData";

export function Dashboard() {
  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Developer platform dashboard"
        description="Monitor credits, requests, token usage, and recent activity for your Zentro API workspace."
      />

      <div className="metric-grid">
        {dashboardMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="two-column">
        <Card className="hero-card">
          <span className="eyebrow">Credits</span>
          <h2>18,450 credits remaining</h2>
          <p>
            Your current Pro plan is projected to last 17 more days based on the
            last week of API usage.
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
            {usageEvents.map((event) => (
              <div className="table-row" key={event.id}>
                <div>
                  <strong>{event.model}</strong>
                  <span>{event.time}</span>
                </div>
                <span>{event.tokens}</span>
                <span>{event.credits} credits</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
