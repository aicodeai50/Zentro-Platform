import { Card } from "./Card";

type MetricCardProps = {
  label: string;
  value: string;
  delta?: string;
};

export function MetricCard({ label, value, delta = "No comparison" }: MetricCardProps) {
  return (
    <Card className="metric-card">
      <span>{label}</span>
      <strong aria-label={`${label}: ${value}`}>{value}</strong>
      <small>{delta}</small>
    </Card>
  );
}
