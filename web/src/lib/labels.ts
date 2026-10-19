export function titleCase(id: string): string {
  return id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function plural(n: number, word: string): string {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

export function usedInLabel(usedIn: string[] | undefined): string {
  if (!usedIn?.length) return "Registered, not used in any plan";
  const parts = usedIn.map((u) =>
    u.startsWith("plans.") ? `the ${u.slice(6)} plan` : u === "aggregate_product_plan" ? "aggregate products (tiers 1 to 3)" : "optional modules",
  );
  return `Used in ${parts.join(", ")}`;
}
