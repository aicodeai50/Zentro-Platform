import { useEffect, useState } from "react";
import type { ApiResult } from "./zentroApi";

type ResourceState<T> =
  | { state: "loading" }
  | { state: "loaded"; result: ApiResult<T> };

export function useApiResource<T>(load: () => Promise<ApiResult<T>>, dependencies: unknown[] = []) {
  const [resource, setResource] = useState<ResourceState<T>>({ state: "loading" });

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
  }, dependencies);

  return resource;
}
