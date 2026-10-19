import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, unwrap, type RequestBody } from "./client";

export function usePolicy() {
  return useQuery({ queryKey: ["policy"], queryFn: () => unwrap(api.GET("/api/policy")), staleTime: Infinity });
}

export function useScenarios() {
  return useQuery({ queryKey: ["scenarios"], queryFn: () => unwrap(api.GET("/api/scenarios")), staleTime: Infinity });
}

export function useDataSummary() {
  return useQuery({ queryKey: ["data-summary"], queryFn: () => unwrap(api.GET("/api/data/summary")), staleTime: Infinity });
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function useDecision(body: RequestBody) {
  const debounced = useDebounced(body, 150);
  return useQuery({
    queryKey: ["decide", debounced],
    queryFn: () => unwrap(api.POST("/api/decide", { body: debounced })),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useTechniques() {
  return useQuery({ queryKey: ["techniques"], queryFn: () => unwrap(api.GET("/api/techniques")), staleTime: Infinity });
}

export const RUN_ROW_LIMIT = 1000;

export function useRun() {
  return useMutation({
    mutationFn: (body: RequestBody) =>
      unwrap(api.POST("/api/request", { body, params: { query: { limit: RUN_ROW_LIMIT } } })),
  });
}
