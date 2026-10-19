import { Flag, Info } from "lucide-react";
import type { Decision } from "../api/client";
import { outcomeStyle } from "../lib/outcome";
import { OutcomePill } from "./OutcomePill";

export function DecisionSummary({ decision, stale }: { decision: Decision; stale: boolean }) {
  const s = outcomeStyle(decision.outcome);
  return (
    <section className={`rounded-xl border-2 p-5 shadow-sm transition-opacity ${s.soft} ${stale ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-4">
        <OutcomePill outcome={decision.outcome} size="lg" />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${s.text}`}>{s.meaning}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Decided by <span className="font-mono">{decision.deciding_rules.join(", ")}</span>
            <span className="mx-2 text-slate-300">|</span>k = {decision.k}
          </p>
        </div>
        {decision.review && (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
            <Flag size={13} /> Flagged for human review
          </span>
        )}
      </div>
      {decision.notes.length > 0 && (
        <ul className="mt-3 space-y-1">
          {decision.notes.map((n) => (
            <li key={n} className="flex items-start gap-1.5 text-xs text-slate-600">
              <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
              {n}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
