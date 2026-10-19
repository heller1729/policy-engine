import type { Overrides, RequestBody } from "../api/client";

export const DEFAULT_REQUEST: RequestBody = {
  data_tier: 6,
  requester: "commercial",
  jurisdiction: "saudi_arabia",
  purpose: "advertising",
  location_group: "G1",
  area: "Mecca",
};

function num(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function readRequest(params: URLSearchParams): RequestBody {
  const d = DEFAULT_REQUEST;
  const overrides: Overrides = {
    k_min: num(params.get("k")) ?? null,
    noise: params.has("noise") ? params.get("noise") === "1" : null,
    epsilon: num(params.get("eps")) ?? null,
  };
  const hasOverrides = Object.values(overrides).some((v) => v !== null);
  return {
    data_tier: num(params.get("tier")) ?? d.data_tier,
    requester: params.get("requester") ?? d.requester,
    jurisdiction: params.get("jurisdiction") ?? d.jurisdiction,
    purpose: params.get("purpose") ?? d.purpose,
    location_group: params.get("group") ?? d.location_group,
    area: params.has("area") ? params.get("area") || null : d.area,
    overrides: hasOverrides ? overrides : null,
  };
}

export function writeRequest(req: RequestBody): URLSearchParams {
  const p = new URLSearchParams({
    tier: String(req.data_tier),
    requester: req.requester,
    jurisdiction: req.jurisdiction,
    purpose: req.purpose,
    group: req.location_group,
    area: req.area ?? "",
  });
  const o = req.overrides;
  if (o?.k_min != null) p.set("k", String(o.k_min));
  if (o?.noise != null) p.set("noise", o.noise ? "1" : "0");
  if (o?.epsilon != null) p.set("eps", String(o.epsilon));
  return p;
}
