import { titleCase } from "./labels";

function list(values: unknown): string {
  const items = (Array.isArray(values) ? values : [values]).map((v) => titleCase(String(v)));
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

export function describeWhen(when: Record<string, unknown> | undefined): string {
  if (!when || Object.keys(when).length === 0) return "Always";
  const parts: string[] = [];
  if (when.tier_min !== undefined && when.tier_max !== undefined) parts.push(`tier ${when.tier_min} to ${when.tier_max}`);
  else if (when.tier_min !== undefined) parts.push(`tier ${when.tier_min} and above`);
  else if (when.tier_max !== undefined) parts.push(`tier ${when.tier_max} and below`);
  if (when.requester_in) parts.push(`requester is ${list(when.requester_in)}`);
  if (when.requester_not) parts.push(`requester is not ${list(when.requester_not)}`);
  if (when.purpose_in) parts.push(`purpose is ${list(when.purpose_in)}`);
  if (when.group_in) parts.push(`location group is ${(when.group_in as string[]).join(" or ")}`);
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function builderLink(params: {
  tier: number;
  requester: string;
  jurisdiction: string;
  purpose: string;
  group: string;
  area?: string | null;
}): string {
  const q = new URLSearchParams({
    tier: String(params.tier),
    requester: params.requester,
    jurisdiction: params.jurisdiction,
    purpose: params.purpose,
    group: params.group,
    area: params.area ?? "",
  });
  return `/?${q.toString()}`;
}
