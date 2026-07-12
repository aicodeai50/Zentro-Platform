import type { ReactNode } from "react";
import { Card } from "./Card";
import type { ApiResult } from "../../lib/zentroApi";

type BackendStateProps<T> = {
  resource: { state: "loading" } | { state: "loaded"; result: ApiResult<T> };
  children: (data: T) => ReactNode;
};

export function BackendState<T>({ resource, children }: BackendStateProps<T>) {
  if (resource.state === "loading") {
    return (
      <Card>
        <p className="muted-text">Loading live backend data...</p>
      </Card>
    );
  }

  const { result } = resource;

  if (result.status !== "success") {
    return (
      <Card className="capability-card">
        <span className="eyebrow">{result.status === "capability-required" ? "Backend capability required" : "Backend unavailable"}</span>
        <h2>{result.endpoint}</h2>
        <p>{result.message}</p>
        {result.status === "capability-required" ? (
          <small>Returned HTTP {result.statusCode}. No data is fabricated for this feature.</small>
        ) : null}
      </Card>
    );
  }

  return <>{children(result.data)}</>;
}

export function ValueList({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="muted-text">Not provided by backend</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="muted-text">No records returned</span>;
    }

    return (
      <div className="table-list">
        {value.map((item, index) => (
          <div className="table-row" key={getStableKey(item, index)}>
            <RecordSummary value={item} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    return (
      <div className="table-list">
        {Object.entries(value as Record<string, unknown>).map(([key, entry]) => (
          <div className="table-row" key={key}>
            <strong>{formatLabel(key)}</strong>
            <span>{formatValue(entry)}</span>
          </div>
        ))}
      </div>
    );
  }

  return <span>{formatValue(value)}</span>;
}

export function RecordSummary({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="muted-text">Not provided by backend</span>;
  }

  if (typeof value !== "object") {
    return <span>{formatValue(value)}</span>;
  }

  const record = value as Record<string, unknown>;
  const title = record.name ?? record.id ?? record.type ?? "Backend record";
  const subtitle = record.description ?? record.status ?? record.environment ?? record.createdAt;

  return (
    <div>
      <strong>{formatValue(title)}</strong>
      {subtitle ? <span>{formatValue(subtitle)}</span> : null}
    </div>
  );
}

function getStableKey(value: unknown, index: number) {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return String(record.id ?? record.slug ?? record.name ?? index);
  }

  return String(index);
}

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "Not provided";
  }

  if (typeof value === "string") {
    return value.includes("://") ? "Redacted URL" : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(redactUrls(value));
}

function redactUrls(value: unknown): unknown {
  if (typeof value === "string") {
    return value.includes("://") ? "Redacted URL" : value;
  }

  if (Array.isArray(value)) {
    return value.map(redactUrls);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        key.toLowerCase().includes("url") ? "Redacted URL" : redactUrls(entry),
      ])
    );
  }

  return value;
}
