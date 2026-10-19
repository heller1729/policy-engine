import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

export const api = createClient<paths>({ baseUrl: "" });

type Schemas = components["schemas"];
export type RequestBody = Schemas["RequestIn"];
export type Overrides = Schemas["Overrides"];
export type Decision = Schemas["DecisionOut"];
export type RuleHit = Schemas["RuleHitOut"];
export type PolicyInfo = Schemas["PolicyOut"];
export type Scenario = Schemas["ScenarioOut"];
export type DataSummary = Schemas["DataSummaryOut"];

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function describe(error: unknown): string {
  const detail = (error as { detail?: unknown })?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg ?? String(d)).join("; ");
  return "Request failed";
}

export async function unwrap<T>(call: Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  const { data, error, response } = await call;
  if (error !== undefined || data === undefined) throw new ApiError(describe(error), response.status);
  return data;
}
