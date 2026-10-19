import type { RunResult, Step } from "../api/client";
import { FactorChips } from "./FactorChip";

type Row = {
  label: string;
  factor?: string | null;
  count: number;
  unit: string;
  removed?: number;
  withheld?: Step["withheld"];
  kind: "input" | "step" | "out";
};

function buildRows(run: RunResult): Row[] {
  let unit = "rows";
  const rows: Row[] = [{ label: "Scoped input", count: run.rows_in, unit, kind: "input" }];
  for (const s of run.steps) {
    const before = unit;
    if (s.technique === "aggregate_h3") unit = "cells";
    rows.push({
      label: s.technique,
      factor: s.factor,
      count: s.rows_out,
      unit,
      removed: before === unit && s.rows_out < s.rows_in ? s.rows_in - s.rows_out : undefined,
      withheld: s.withheld,
      kind: "step",
    });
  }
  rows.push({ label: "Released", count: run.released.total, unit, kind: "out" });
  return rows;
}

const BAR: Record<Row["kind"], string> = {
  input: "bg-blue-500",
  step: "bg-emerald-500",
  out: "bg-blue-700",
};

export function RunFunnel({ run }: { run: RunResult }) {
  const rows = buildRows(run);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={`${r.label}-${i}`} className="grid grid-cols-[180px_1fr] items-center gap-x-3 gap-y-1">
            <div className="flex items-center gap-1.5 truncate">
              <span className={`text-xs ${r.kind === "step" ? "font-mono text-slate-700" : "font-semibold text-slate-800"}`}>
                {r.label}
              </span>
              <FactorChips factor={r.factor} />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-5 flex-1 rounded bg-slate-100">
                <div
                  className={`h-5 rounded ${BAR[r.kind]}`}
                  style={{ width: r.count ? `${Math.max(1.5, Math.sqrt(r.count / max) * 100)}%` : 0 }}
                />
              </div>
              <span className="w-40 shrink-0 text-right text-xs tabular-nums text-slate-600">
                {r.count.toLocaleString()} {r.unit}
                {r.removed ? <span className="ml-1 text-rose-600">({r.removed} removed)</span> : null}
              </span>
            </div>
            {r.withheld && Object.keys(r.withheld).length > 0 && (
              <ul className="col-start-2 space-y-0.5">
                {Object.entries(r.withheld).map(([group, w]) => (
                  <li key={group} className="text-[11px] text-slate-500">
                    Withheld {w.rows.toLocaleString()} rows at {group} places: {w.cap} by{" "}
                    <span className="font-mono">{w.rules.join(", ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-400">Bar length uses a square root scale so small counts stay visible.</p>
    </div>
  );
}
