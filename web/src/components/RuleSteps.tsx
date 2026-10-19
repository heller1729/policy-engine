import type { Decision, RuleHit } from "../api/client";
import { STEP_LABELS } from "../lib/outcome";
import { RuleCard } from "./RuleCard";

const ORDER = ["location_group", "audience_matrix", "jurisdiction", "purpose"];

export function RuleSteps({ decision }: { decision: Decision }) {
  const byStep = new Map<string, RuleHit[]>();
  for (const h of decision.hits) byStep.set(h.step, [...(byStep.get(h.step) ?? []), h]);
  const steps = decision.hits[0]?.step === "validate" ? ["validate"] : ORDER;

  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const hits = byStep.get(step) ?? [];
        return (
          <div key={step} className="grid gap-2 md:grid-cols-[160px_1fr]">
            <div className="pt-2 text-xs font-semibold text-slate-600">{STEP_LABELS[step] ?? step}</div>
            <div className="space-y-2">
              {hits.length ? (
                hits.map((h) => <RuleCard key={h.rule_id} hit={h} />)
              ) : (
                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-400">No rule fired</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
