import { Badge } from "../ui/Badge";
import {
  normalizeProviderStatus,
  providerStatusLabel,
  providerStatusTone,
  type ProviderHealthStatus,
} from "../../lib/operationsGuards";

const statusGlyph: Record<ProviderHealthStatus, string> = {
  healthy: "●",
  degraded: "▲",
  offline: "■",
  disabled: "○",
  unknown: "?",
};

type ProviderStatusBadgeProps = {
  status?: unknown;
  showLabel?: boolean;
};

export function ProviderStatusBadge({ status, showLabel = true }: ProviderStatusBadgeProps) {
  const normalized = normalizeProviderStatus(status);
  const label = providerStatusLabel(normalized);
  const tone = providerStatusTone(normalized);

  return (
    <span className={`provider-status provider-status-${normalized}`} aria-label={`Provider status: ${label}`}>
      <span aria-hidden="true" className="provider-status-glyph">
        {statusGlyph[normalized]}
      </span>
      {showLabel ? <Badge tone={tone}>{label}</Badge> : <span className="sr-only">{label}</span>}
    </span>
  );
}
