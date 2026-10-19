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

export function useMatrix(jurisdiction: string, purpose: string, location_group: string, enabled = true) {
  return useQuery({
    queryKey: ["matrix", jurisdiction, purpose, location_group],
    queryFn: () => unwrap(api.POST("/api/matrix", { body: { jurisdiction, purpose, location_group } })),
    enabled: enabled && !!jurisdiction,
    staleTime: Infinity,
  });
}

export function useCatalog() {
  return useQuery({ queryKey: ["catalog"], queryFn: () => unwrap(api.GET("/api/catalog")), staleTime: Infinity });
}

export type AuditFilters = { outcome?: string; review?: boolean; jurisdiction?: string };

export function useAudit(filters: AuditFilters) {
  return useQuery({
    queryKey: ["audit", filters],
    queryFn: () => unwrap(api.GET("/api/audit", { params: { query: { ...filters, limit: 500 } } })),
    refetchOnMount: "always",
  });
}

export function useTechniqueSamples() {
  return useQuery({
    queryKey: ["technique-samples"],
    queryFn: () => unwrap(api.GET("/api/techniques/samples")),
    staleTime: Infinity,
  });
}

export function useScenarioRun(body: RequestBody | undefined, number: number) {
  return useQuery({
    queryKey: ["scenario-run", number],
    queryFn: () => unwrap(api.POST("/api/request", { body: body!, params: { query: { limit: 50 } } })),
    enabled: !!body,
    staleTime: Infinity,
  });
}
