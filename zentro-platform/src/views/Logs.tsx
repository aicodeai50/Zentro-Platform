import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { usePlatform } from "../lib/platformState";

export function Logs() {
  const { selectedProject } = usePlatform();
  const logs =
    selectedProject.usage.events.length > 0
      ? selectedProject.usage.events
      : [
          {
            id: "log_empty_1",
            time: "No recent logs",
            model: "Awaiting traffic",
            tokens: "0",
            credits: "0",
            status: "Completed" as const,
          },
        ];

  return (
    <>
      <PageHeader
        eyebrow="Logs"
        title={`${selectedProject.name} request logs`}
        description="Inspect request activity, statuses, models, token counts, and credit usage. Backend log search will connect later."
      />

      <Card>
        <div className="card-heading">
          <h2>Recent requests</h2>
          <span>Mock request log</span>
        </div>
        <div className="table-list">
          {logs.map((log) => (
            <div className="table-row" key={log.id}>
              <div>
                <strong>{log.model}</strong>
                <span>{log.time}</span>
              </div>
              <span>{log.tokens} tokens</span>
              <span>{log.credits} credits</span>
              <Badge tone={log.status === "Completed" ? "success" : "danger"}>{log.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
