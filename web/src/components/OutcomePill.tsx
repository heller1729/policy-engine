import { outcomeStyle } from "../lib/outcome";

export function OutcomePill({ outcome, size = "sm" }: { outcome: string; size?: "sm" | "lg" }) {
  const s = outcomeStyle(outcome);
  const sizing = size === "lg" ? "px-4 py-1.5 text-2xl font-semibold" : "px-2 py-0.5 text-xs font-medium";
  return <span className={`inline-block rounded-md ${sizing} ${s.pill}`}>{outcome}</span>;
}
