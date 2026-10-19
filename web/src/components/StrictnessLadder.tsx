import type { RuleHit } from "../api/client";
import { OUTCOMES, outcomeStyle } from "../lib/outcome";

export function StrictnessLadder({ hits, outcome }: { hits: RuleHit[]; outcome: string }) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-1.5">
        {OUTCOMES.map((o) => {
          const s = outcomeStyle(o);
          const here = hits.filter((h) => h.cap === o);
          const final = o === outcome;
          return (
            <div key={o} className={`rounded-lg border p-2 ${final ? s.soft + " border-2" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold ${final ? s.text : "text-slate-500"}`}>{o}</span>
                {final && <span className={`text-[10px] font-semibold uppercase ${s.text}`}>result</span>}
              </div>
              <div className="mt-1.5 flex min-h-5 flex-col gap-1">
                {here.map((h) => (
                  <span key={h.rule_id} className="truncate font-mono text-[10px] text-slate-600" title={h.rule_id}>
                    {h.rule_id}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-slate-400">
        <span>less restrictive</span>
        <span>more restrictive</span>
      </div>
    </div>
  );
}
