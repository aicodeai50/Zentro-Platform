import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { tokensByModel, usageByDay } from "../data/mockData";

const maxRequests = Math.max(...usageByDay.map((day) => day.requests));

export function Usage() {
  return (
    <>
      <PageHeader
        eyebrow="Usage analytics"
        title="Requests, tokens, and credits"
        description="Review mock usage trends before connecting Zentro Platform to metering endpoints."
      />

      <div className="two-column">
        <Card>
          <div className="card-heading">
            <h2>Requests by day</h2>
            <span>Chart placeholder</span>
          </div>
          <div className="bar-chart">
            {usageByDay.map((day) => (
              <div className="bar-column" key={day.day}>
                <div
                  className="bar"
                  style={{ height: `${Math.round((day.requests / maxRequests) * 100)}%` }}
                />
                <span>{day.day}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="card-heading">
            <h2>Tokens by model</h2>
            <span>Distribution</span>
          </div>
          <div className="stack-list">
            {tokensByModel.map((item) => (
              <div className="stack-item" key={item.model}>
                <div>
                  <strong>{item.model}</strong>
                  <span>{item.tokens} tokens</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${item.share}%` }} />
                </div>
                <span>{item.share}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="card-heading">
          <h2>Cost and credit usage</h2>
          <span>Last 7 days</span>
        </div>
        <div className="metric-grid compact">
          {usageByDay.map((day) => (
            <div className="mini-stat" key={day.day}>
              <span>{day.day}</span>
              <strong>{day.credits}</strong>
              <small>credits</small>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
