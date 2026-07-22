import { Card } from "../ui/Card";
import type { ChartPoint } from "../../lib/usageGuards";

type UsageBarChartProps = {
  title: string;
  endpoint: string;
  points: ChartPoint[];
  emptyMessage?: string;
};

export function UsageBarChart({ title, endpoint, points, emptyMessage = "No chart series returned by backend." }: UsageBarChartProps) {
  const max = Math.max(...points.map((point) => point.value), 0);
  const summary = points.length
    ? points.map((point) => `${point.label}: ${point.value}`).join("; ")
    : emptyMessage;

  return (
    <Card>
      <div className="card-heading">
        <h2>{title}</h2>
        <span>{endpoint}</span>
      </div>
      <p className="sr-only">{summary}</p>
      {points.length ? (
        <div className="bar-chart" role="img" aria-label={`${title}. ${summary}`}>
          {points.map((point) => {
            const height = max > 0 ? Math.max(8, (point.value / max) * 100) : 8;
            return (
              <div className="bar-column" key={point.label}>
                <div className="bar" style={{ height: `${height}%` }} title={`${point.label}: ${point.value}`} />
                <span>
                  {point.label}
                  <br />
                  {point.value}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="empty-state">{emptyMessage}</p>
      )}
    </Card>
  );
}
