import { ArrowRight } from "lucide-react";
import { useTechniqueSamples, useTechniques } from "../api/hooks";
import { Card } from "../components/Card";
import { FactorChips } from "../components/FactorChip";
import { usedInLabel } from "../lib/labels";

const HIDE = new Set(["area"]);

function MiniTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return <p className="rounded-md border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">No rows</p>;
  const cols = Object.keys(rows[0]).filter((c) => !HIDE.has(c));
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="min-w-full text-[11px]">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            {cols.map((c) => (
              <th key={c} className="whitespace-nowrap px-2 py-1.5 font-semibold">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c} className={`whitespace-nowrap px-2 py-1 ${c === "device_id" || c === "h3_cell" ? "font-mono" : ""}`}>
                  {String(r[c] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TechniquesPage() {
  const samples = useTechniqueSamples();
  const techniques = useTechniques();
  const usedIn = new Map(techniques.data?.map((t) => [t.name, t.used_in ?? []]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Techniques</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          The privacy techniques the enforcement point can run. Which ones run for a decision is set in the policy file, not in the
          engine, so a new technique is a new module plus a policy edit. Each card shows the technique applied to synthetic Riyadh rows.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-orange-900">place_check</span>
          <FactorChips factor="B3" />
          <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[11px] text-orange-800">always first, built into the enforcement point</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Looks up each row's location group from the place catalog by its coordinates, asks the decision point what it would decide
          for that group, and withholds rows whose own group gets a stricter decision than the release. The audit record lists how
          many rows were withheld per group and which rules caused it.
        </p>
      </Card>

      {samples.isLoading && <div className="h-40 animate-pulse rounded-xl bg-slate-100" />}
      {samples.data?.map((t) => {
        const used = usedIn.get(t.name) ?? [];
        return (
          <Card key={t.name}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-emerald-900">{t.name}</span>
              <FactorChips factor={t.factor} />
              <span className="text-sm text-slate-600">{t.description}</span>
              <span className="ml-auto text-[11px] text-slate-500">{usedInLabel(used)}</span>
            </div>
            <div className="mt-3 grid items-start gap-3 lg:grid-cols-[1fr_auto_1fr]">
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Before, {t.rows_in.toLocaleString()} rows{t.rows_in > t.before.length ? `, first ${t.before.length} shown` : ""}
                </p>
                <MiniTable rows={t.before} />
              </div>
              <ArrowRight className="mx-auto mt-8 hidden text-slate-300 lg:block" size={20} />
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  After, {t.rows_out.toLocaleString()} rows{t.rows_out > t.after.length ? `, first ${t.after.length} shown` : ""}
                </p>
                <MiniTable rows={t.after} />
              </div>
            </div>
          </Card>
        );
      })}

      <Card title="Adding a technique">
        <p className="text-sm text-slate-600">
          Subclass <span className="font-mono">Technique</span> in <span className="font-mono">engine/techniques.py</span>, set its name,
          factor and description, implement <span className="font-mono">apply(rows, ctx)</span>, register it, and name it in a plan or
          under <span className="font-mono">optional</span> in <span className="font-mono">policy.yaml</span>. A plan that names an
          unregistered technique stops with an error instead of skipping it. Candidates being looked at, following Dr. Matsuo's
          feedback: l diversity, geo indistinguishability, user level differential privacy with a budget, secure aggregation,
          homomorphic encryption and synthetic data.
        </p>
      </Card>
    </div>
  );
}
