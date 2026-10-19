import type { Decision } from "../api/client";
import { useTechniques } from "../api/hooks";
import { FactorChips } from "./FactorChip";

type Props = { decision: Decision; tier: number; deviceLevelFrom: number };

export function PlanView({ decision, tier, deviceLevelFrom }: Props) {
  const { data: techniques } = useTechniques();
  const info = new Map(techniques?.map((t) => [t.name, t]));

  if (decision.outcome === "Blocked") {
    return <p className="text-sm text-slate-500">Nothing runs and nothing is released.</p>;
  }
  return (
    <div className="space-y-3">
      {tier < deviceLevelFrom && (
        <p className="text-xs text-slate-500">
          Tiers 1 to 3 are aggregate products, so the output is counts above k even when the decision is Full.
        </p>
      )}
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <li className="rounded-lg border border-orange-200 bg-orange-50 p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[11px] font-semibold text-white">0</span>
            <span className="font-mono text-xs font-semibold text-orange-900">place_check</span>
            <span className="ml-auto">
              <FactorChips factor="B3" />
            </span>
          </div>
          <p className="mt-1.5 text-xs text-orange-900/80">
            Looks up each row's location group from the place catalog and withholds rows whose own group gets a stricter decision
          </p>
        </li>
        {decision.plan.map((name, i) => {
          const t = info.get(name);
          return (
            <li key={name} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                  {i + 1}
                </span>
                <span className="font-mono text-xs font-semibold text-emerald-900">{name}</span>
                <span className="ml-auto">
                  <FactorChips factor={t?.factor} />
                </span>
              </div>
              {t && <p className="mt-1.5 text-xs text-emerald-800/80">{t.description}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
