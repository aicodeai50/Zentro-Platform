import { useEffect, useState } from "react";
import type { ApiResult } from "./zentroApi";

type ResourceState<T> =
  | { state: "loading" }
  | { state: "loaded"; result: ApiResult<T> };

export function useApiResource<T>(load: () => Promise<ApiResult<T>>, dependencies: unknown[] = []) {
  const [resource, setResource] = useState<ResourceState<T>>({ state: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setResource({ state: "loading" });

    void load().then((result) => {
      if (isCurrent) {
        setResource({ state: "loaded", result });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [...dependencies, reloadToken]);

  return {
    ...resource,
    reload: () => setReloadToken((value) => value + 1),
  };
}
