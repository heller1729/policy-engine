import { Flag } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { MatrixResult } from "../api/client";
import { useDataSummary, useMatrix, usePolicy } from "../api/hooks";
import { Card } from "../components/Card";
import { Field, selectClass } from "../components/Field";
import { cellKey, MatrixGrid, type GridCell } from "../components/MatrixGrid";
import { titleCase } from "../lib/labels";
import { OUTCOMES, outcomeStyle } from "../lib/outcome";
import { rawMatrix } from "../lib/matrix";
import { builderLink } from "../lib/rules";

const RAW = "raw";

function fromMatrix(m: MatrixResult | undefined): Map<string, GridCell> {
  const cells = new Map<string, GridCell>();
  for (const c of m?.cells ?? []) {
    cells.set(cellKey(c.tier, c.requester), { outcome: c.outcome, review: c.review, deciding: c.deciding_rules });
  }
  return cells;
}

export function WhoSeesWhat() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const policy = usePolicy();
  const summary = useDataSummary();

  const jurisdiction = params.get("j") ?? "saudi_arabia";
  const purpose = params.get("p") ?? "advertising";
  const group = params.get("g") ?? "G5";
  const versus = params.get("vs") ?? RAW;

  const main = useMatrix(jurisdiction, purpose, group);
  const other = useMatrix(versus, purpose, group, versus !== RAW && versus !== "");

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  if (!policy.data) return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  const p = policy.data;
  const label = (id: string) => p.jurisdictions.find((j) => j.id === id)?.label ?? id;
  const areaFor = (j: string) => summary.data?.areas.find((a) => a.jurisdiction === j)?.area ?? null;

  const left = fromMatrix(main.data);
  const right = versus === RAW ? rawMatrix(p) : versus ? fromMatrix(other.data) : null;
  const differs = new Set<string>();
  if (right && left.size) {
    for (const [key, c] of left) if (right.get(key)?.outcome !== c.outcome) differs.add(key);
  }
  const pick = (j: string) => (tier: number, requester: string) =>
    navigate(builderLink({ tier, requester, jurisdiction: j, purpose, group, area: areaFor(j) }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Who sees what</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          The outcome for every data tier and requester once all rules apply: location group, audience matrix,
          jurisdiction overrides and purpose rules. Click a cell to open that request in the request builder.
        </p>
      </div>

      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Jurisdiction">
            <select className={selectClass} value={jurisdiction} onChange={(e) => set("j", e.target.value)}>
              {p.jurisdictions.map((j) => (
                <option key={j.id} value={j.id}>{j.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Purpose">
            <select className={selectClass} value={purpose} onChange={(e) => set("p", e.target.value)}>
              {p.purposes.map((x) => (
                <option key={x} value={x}>{titleCase(x)}</option>
              ))}
            </select>
          </Field>
          <Field label="Location group">
            <select className={selectClass} value={group} onChange={(e) => set("g", e.target.value)}>
              {p.location_groups.map((g) => (
                <option key={g.id} value={g.id}>{g.id} {g.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Compare with">
            <select className={selectClass} value={versus} onChange={(e) => set("vs", e.target.value)}>
              <option value="">Nothing</option>
              <option value={RAW}>Audience matrix alone</option>
              {p.jurisdictions
                .filter((j) => j.id !== jurisdiction)
                .map((j) => (
                  <option key={j.id} value={j.id}>{j.label}</option>
                ))}
            </select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          {OUTCOMES.map((o) => (
            <span key={o} className="inline-flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm ${outcomeStyle(o).dot}`} />
              <b className="text-slate-700">{o}</b> {outcomeStyle(o).meaning}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <Flag size={11} className="text-amber-600" /> grey area, human review
          </span>
        </div>
      </Card>

      <Card
        aside={
          right ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {differs.size} of {left.size} cells differ (outlined)
            </span>
          ) : undefined
        }
        title={right ? "Comparison" : undefined}
      >
        <div className={`grid gap-6 ${right ? "xl:grid-cols-2" : ""}`}>
          <MatrixGrid
            title={label(jurisdiction)}
            subtitle={`${titleCase(purpose)}, ${group}`}
            policy={p}
            cells={left}
            differs={right ? differs : undefined}
            onPick={pick(jurisdiction)}
          />
          {right && (
            <MatrixGrid
              title={versus === RAW ? "Audience matrix alone" : label(versus)}
              subtitle={versus === RAW ? "Before location group, jurisdiction and purpose rules" : `${titleCase(purpose)}, ${group}`}
              policy={p}
              cells={right}
              differs={differs}
              onPick={versus === RAW ? undefined : pick(versus)}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
