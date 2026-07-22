import { useEffect, useRef, useState } from "react";
import type { ApiResult } from "./zentroApi";

type ResourceState<T> =
  | { state: "loading" }
  | { state: "loaded"; result: ApiResult<T> };

export function useApiResource<T>(
  load: () => Promise<ApiResult<T>>,
  dependencies: unknown[] = [],
  options?: { pollKey?: number }
) {
  const [resource, setResource] = useState<ResourceState<T>>({ state: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const resourceRef = useRef(resource);
  const pollKey = options?.pollKey ?? 0;
  const previousPollKey = useRef(pollKey);

  useEffect(() => {
    resourceRef.current = resource;
  }, [resource]);

  useEffect(() => {
    let isCurrent = true;
    const pollChanged = pollKey !== previousPollKey.current;
    previousPollKey.current = pollKey;
    const softRefresh = pollChanged && pollKey > 0 && resourceRef.current.state === "loaded";

    if (!softRefresh) {
      setResource({ state: "loading" });
    }

    void load().then((result) => {
      if (isCurrent) {
        setResource({ state: "loaded", result });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [...dependencies, reloadToken, pollKey]);

  return {
    ...resource,
    reload: () => setReloadToken((value) => value + 1),
  };
}
