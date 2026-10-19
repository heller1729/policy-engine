import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Flag, Maximize2 } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { RequestBody } from "../api/client";
import { useDataSummary, usePolicy, useScenarioRun, useScenarios } from "../api/hooks";
import { OutcomePill } from "../components/OutcomePill";
import { RuleCard } from "../components/RuleCard";
import { RunFunnel } from "../components/RunFunnel";
import { titleCase } from "../lib/labels";
import { outcomeStyle } from "../lib/outcome";
import { writeRequest } from "../lib/requestParams";

const CompareMaps = lazy(() => import("../components/CompareMaps"));

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </span>
  );
}

export function PresentPage() {
  const [params, setParams] = useSearchParams();
  const scenarios = useScenarios();
  const policy = usePolicy();
  const summary = useDataSummary();
  const list = scenarios.data ?? [];
  const total = list.length;
  const n = Math.min(Math.max(Number(params.get("n")) || 1, 1), Math.max(total, 1));
  const scenario = list[n - 1];
  const body = scenario?.attributes as RequestBody | undefined;
  const run = useScenarioRun(body, n);

  const go = useCallback(
    (next: number) => {
      if (!total) return;
      setParams({ n: String(Math.min(Math.max(next, 1), total)) }, { replace: true });
    },
    [setParams, total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(n + 1);
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(n - 1);
      } else if (e.key === "Home") go(1);
      else if (e.key === "End") go(total);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, n, total]);

  if (!scenario || !policy.data) return <div className="h-60 animate-pulse rounded-xl bg-slate-100" />;

  const p = policy.data;
  const a = scenario.attributes as Record<string, string | number | null>;
  const tier = p.tiers.find((t) => t.level === a.data_tier);
  const jur = p.jurisdictions.find((j) => j.id === a.jurisdiction);
  const group = p.location_groups.find((g) => g.id === a.location_group);
  const area = summary.data?.areas.find((x) => x.area === a.area);
  const decision = run.data?.decision;
  const deciding = decision?.hits.filter((h) => h.deciding) ?? [];
  const check = run.data?.steps.find((s) => s.technique === "place_check");
  const mismatch = decision && (decision.outcome !== scenario.expected || decision.review !== scenario.expected_review);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-slate-500">
          Scenario {n} of {total}
        </span>
        <div className="flex flex-wrap gap-1">
          {list.map((s) => (
            <button
              key={s.number}
              type="button"
              onClick={() => go(s.number)}
              title={s.title}
              className={`h-2.5 rounded-full transition-all ${s.number === n ? "w-6 bg-slate-900" : `w-2.5 ${outcomeStyle(s.expected).dot} opacity-40 hover:opacity-80`}`}
            />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to={`/?${writeRequest(body!).toString()}`}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
          >
            Open in builder <ExternalLink size={12} />
          </Link>
          <button
            type="button"
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
          >
            <Maximize2 size={12} /> Full screen
          </button>
          <button
            type="button"
            aria-label="Previous scenario"
            disabled={n <= 1}
            onClick={() => go(n - 1)}
            className="rounded-md border border-slate-300 bg-white p-1.5 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Next scenario"
            disabled={n >= total}
            onClick={() => go(n + 1)}
            className="rounded-md bg-slate-900 p-1.5 text-white hover:bg-slate-700 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-semibold leading-snug text-slate-900 md:text-3xl">{scenario.title}</h1>

      <div className="flex flex-wrap gap-2">
        <Chip label="Data tier" value={`Lv ${a.data_tier}: ${tier?.name ?? ""}`} />
        <Chip label="Requester" value={titleCase(String(a.requester))} />
        <Chip label="Jurisdiction" value={jur?.label ?? `${a.jurisdiction} (not in policy)`} />
        <Chip label="Purpose" value={titleCase(String(a.purpose))} />
        <Chip label="Location group" value={`${a.location_group} ${group?.name ?? ""}`} />
        <Chip label="Area" value={area ? `${area.area} (${area.country})` : String(a.area ?? "All areas")} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-4">
          {decision ? (
            <section className={`rounded-xl border-2 p-5 ${outcomeStyle(decision.outcome).soft}`}>
              <div className="flex flex-wrap items-center gap-4">
                <span data-testid="present-outcome">
                  <OutcomePill outcome={decision.outcome} size="lg" />
                </span>
                <span className={`text-base font-medium ${outcomeStyle(decision.outcome).text}`}>{outcomeStyle(decision.outcome).meaning}</span>
                {decision.review && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-800">
                    <Flag size={14} /> Human review
                  </span>
                )}
              </div>
              <p className="mt-3 text-base text-slate-700">{scenario.why}</p>
              {mismatch && (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                  <AlertTriangle size={13} /> Expected {scenario.expected}
                  {scenario.expected_review ? " with review" : ""}. The policy or data has changed since this scenario was written.
                </p>
              )}
            </section>
          ) : (
            <div className="h-36 animate-pulse rounded-xl bg-slate-100" />
          )}

          {deciding.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deciding rules</h2>
              {deciding.map((h) => (
                <RuleCard key={h.rule_id} hit={h} />
              ))}
            </div>
          )}

          {check?.withheld && Object.keys(check.withheld).length > 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-900">
              Place check withheld{" "}
              {Object.entries(check.withheld)
                .map(([g, w]) => `${w.rows.toLocaleString()} rows at ${g} places`)
                .join(" and ")}
              .
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          {run.data && run.data.steps.length > 0 && <RunFunnel run={run.data} />}
          {run.data && (
            <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-slate-100" />}>
              <CompareMaps key={n} cells={run.data.map} outcome={run.data.decision.outcome} />
            </Suspense>
          )}
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-400">Arrow keys or space to move between scenarios. Every scenario shown here is written to the audit log.</p>
    </div>
  );
}
