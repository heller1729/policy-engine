import { Flag } from "lucide-react";
import type { RuleHit } from "../api/client";
import { FactorChips } from "./FactorChip";
import { OutcomePill } from "./OutcomePill";

export function RuleCard({ hit }: { hit: RuleHit }) {
  const ring = hit.deciding ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200";
  return (
    <div className={`rounded-lg border bg-white p-3 ${ring}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold text-slate-800">{hit.rule_id}</span>
        <span className="text-slate-400">caps at</span>
        <OutcomePill outcome={hit.cap} />
        <FactorChips factor={hit.factor} />
        {hit.review && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
            <Flag size={11} /> grey area
          </span>
        )}
        {hit.deciding && (
          <span className="ml-auto rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-medium text-white">deciding</span>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{hit.citation}</p>
    </div>
  );
}
