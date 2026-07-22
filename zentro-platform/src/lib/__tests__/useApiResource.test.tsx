import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useApiResource } from "../useApiResource";

describe("useApiResource polling", () => {
  it("soft-refreshes on pollKey without dropping loaded data to a blank loading state", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({ status: "success", endpoint: "/v1/operations/summary", data: { totalRequests: 1 } })
      .mockResolvedValueOnce({ status: "success", endpoint: "/v1/operations/summary", data: { totalRequests: 2 } });

    const { result, rerender } = renderHook(
      ({ pollKey }) => useApiResource(load, [], { pollKey }),
      { initialProps: { pollKey: 0 } }
    );

    await waitFor(() => {
      expect(result.current.state).toBe("loaded");
    });

    rerender({ pollKey: 1 });

    expect(result.current.state).toBe("loaded");
    if (result.current.state === "loaded") {
      expect(result.current.result.status).toBe("success");
    }

    await waitFor(() => {
      expect(load).toHaveBeenCalledTimes(2);
      if (result.current.state === "loaded" && result.current.result.status === "success") {
        expect(result.current.result.data).toEqual({ totalRequests: 2 });
      }
    });
  });
});
