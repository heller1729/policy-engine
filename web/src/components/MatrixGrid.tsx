import { Flag } from "lucide-react";
import type { PolicyInfo } from "../api/client";
import { outcomeStyle } from "../lib/outcome";
import { titleCase } from "../lib/labels";

export type GridCell = { outcome: string; review: boolean; deciding: string[] };
export const cellKey = (tier: number, requester: string) => `${tier}|${requester}`;

type Props = {
  title: string;
  subtitle?: string;
  policy: PolicyInfo;
  cells: Map<string, GridCell>;
  differs?: Set<string>;
  onPick?: (tier: number, requester: string) => void;
};

export function MatrixGrid({ title, subtitle, policy, cells, differs, onPick }: Props) {
  return (
    <div className="min-w-0">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="w-32 text-left font-medium text-slate-400">Tier</th>
              {policy.requesters.map((r) => (
                <th key={r} className="px-1 text-center font-semibold text-slate-600">{titleCase(r)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {policy.tiers.map((t) => (
              <tr key={t.level}>
                <td className="max-w-32 pr-2 align-middle">
                  <div className="font-semibold text-slate-700">Lv {t.level}</div>
                  <div className="truncate text-[11px] text-slate-400" title={t.name}>{t.name}</div>
                </td>
                {policy.requesters.map((r) => {
                  const key = cellKey(t.level, r);
                  const c = cells.get(key);
                  if (!c) return <td key={r} className="h-12 rounded-md bg-slate-100" />;
                  const s = outcomeStyle(c.outcome);
                  const diff = differs?.has(key);
                  return (
                    <td key={r} className="p-0">
                      <button
                        type="button"
                        disabled={!onPick}
                        onClick={() => onPick?.(t.level, r)}
                        title={`Decided by ${c.deciding.join(", ")}${onPick ? "\nClick to open in the request builder" : ""}`}
                        className={`relative flex h-11 w-full min-w-16 flex-col items-center justify-center rounded-md border text-[11px] font-semibold ${s.soft} ${s.text} ${
                          diff ? "ring-2 ring-slate-900 ring-offset-1" : ""
                        } ${onPick ? "cursor-pointer hover:brightness-95" : "cursor-default"}`}
                      >
                        {c.outcome}
                        {c.review && (
                          <span className="absolute right-1 top-1 text-amber-600" title="Flagged for human review">
                            <Flag size={10} />
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
