import { Flag, Search, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import type { Rule } from "../api/client";
import { useCatalog, usePolicy, useTechniques } from "../api/hooks";
import { Card } from "../components/Card";
import { FactorChips } from "../components/FactorChip";
import { MatrixGrid } from "../components/MatrixGrid";
import { OutcomePill } from "../components/OutcomePill";
import { FACTORS, splitFactors } from "../lib/factors";
import { titleCase, usedInLabel } from "../lib/labels";
import { rawMatrix } from "../lib/matrix";
import { describeWhen } from "../lib/rules";

const SECTIONS = [
  ["groups", "Location groups"],
  ["matrix", "Audience matrix"],
  ["jurisdictions", "Jurisdiction overrides"],
  ["purpose", "Purpose rules"],
  ["techniques", "Techniques and plans"],
  ["catalog", "Place catalog"],
  ["factors", "Factor glossary"],
] as const;

function matches(q: string, ...fields: (string | null | undefined)[]): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((f) => {
    if (!f) return false;
    if (/^[a-g]\d$/i.test(needle)) return splitFactors(f).some((x) => x.toLowerCase() === needle) || f.toLowerCase() === needle;
    return f.toLowerCase().includes(needle);
  });
}

function Section({ id, title, show = true, children }: { id: string; title: string; show?: boolean; children: ReactNode }) {
  if (!show) return null;
  return (
    <section id={id} className="scroll-mt-20">
      <Card title={title}>{children}</Card>
    </section>
  );
}

function RuleRow({ rule, onFactor }: { rule: Rule; onFactor: (id: string) => void }) {
  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs font-semibold text-slate-800">{rule.id}</span>
        <OutcomePill outcome={rule.cap} />
        <FactorChips factor={rule.factor} onPick={onFactor} />
        {rule.review && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
            <Flag size={11} /> grey area
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-700">When: {describeWhen(rule.when as Record<string, unknown>)}</p>
      <p className="mt-0.5 text-xs text-slate-500">{rule.citation}</p>
    </li>
  );
}

const Empty = () => <p className="text-xs text-slate-400">Nothing matches the search.</p>;

export function PolicyPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const setQ = (value: string) => setParams(value ? { q: value } : {}, { replace: true });
  const policy = usePolicy();
  const catalog = useCatalog();
  const techniques = useTechniques();
  const { hash } = useLocation();
  const loaded = !!policy.data && !!catalog.data;

  useEffect(() => {
    if (loaded && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [loaded, hash]);

  if (!policy.data) return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  const p = policy.data;

  const groups = p.location_groups.filter((g) => matches(q, g.id, g.name, g.factor, g.citation));
  const jurisdictions = p.jurisdictions
    .map((j) => ({ ...j, rules: (j.rules ?? []).filter((r) => matches(q, r.id, r.factor, r.citation, describeWhen(r.when as Record<string, unknown>))) }))
    .filter((j) => !q || j.rules.length || matches(q, j.label, j.id));
  const purposeRules = p.purpose_rules.filter((r) => matches(q, r.id, r.factor, r.citation, describeWhen(r.when as Record<string, unknown>)));
  const places = (catalog.data?.places ?? []).filter((x) => matches(q, x.name, x.area, x.group));
  const factors = Object.entries(FACTORS).filter(([id, name]) => matches(q, id, name));
  const techs = (techniques.data ?? []).filter((t) => matches(q, t.name, t.factor, t.description));
  const matrixMatches = matches(q, p.audience_matrix.factor, "audience matrix", p.audience_matrix.citation);
  const nothing = q && !groups.length && !matrixMatches && !jurisdictions.length && !purposeRules.length && !techs.length && !places.length && !factors.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search rule, factor, law"
              className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-8 pr-7 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="absolute right-2 top-2 text-slate-400 hover:text-slate-700">
                <X size={14} />
              </button>
            )}
          </div>
          <nav className="flex flex-col gap-0.5 text-sm">
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                {label}
              </a>
            ))}
          </nav>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Read only view of policy/policy.yaml (version {p.version}) and policy/place_catalog.yaml. Click a factor chip to filter by it.
          </p>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        {nothing && (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
            Nothing in the policy matches "{q}".
          </p>
        )}
        <Section id="groups" title="Location groups (step 1)" show={!q || groups.length > 0}>
          {groups.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-1.5 pr-3 font-semibold">Group</th>
                    <th className="py-1.5 pr-3 font-semibold">Device level (tier {p.device_level_from_tier}+)</th>
                    <th className="py-1.5 pr-3 font-semibold">Aggregate</th>
                    <th className="py-1.5 font-semibold">Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groups.map((g) => (
                    <tr key={g.id}>
                      <td className="py-2 pr-3">
                        <span className="font-semibold text-slate-800">{g.id}</span> <span className="text-slate-600">{g.name}</span>
                      </td>
                      <td className="py-2 pr-3"><OutcomePill outcome={g.device_level} /></td>
                      <td className="py-2 pr-3"><OutcomePill outcome={g.aggregate} /></td>
                      <td className="py-2 text-slate-500">{g.citation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </Section>

        <Section id="matrix" title="Audience matrix (step 2)" show={!q || matrixMatches}>
          <p className="mb-3 text-xs text-slate-500">
            {p.audience_matrix.citation}. Factor {p.audience_matrix.factor}. These are the caps before any other rule applies.
          </p>
          <MatrixGrid title="Who sees what, first cut" policy={p} cells={rawMatrix(p)} />
        </Section>

        <Section id="jurisdictions" title="Jurisdiction overrides (step 3)" show={!q || jurisdictions.length > 0}>
          {jurisdictions.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {jurisdictions.map((j) => (
                <div key={j.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{j.label}</span>
                    <span className="rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-600">k = {j.k}</span>
                    {Object.entries(j.group_shift ?? {}).map(([from, to]) => (
                      <span key={from} className="rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-600">
                        treats {from} as {to}
                      </span>
                    ))}
                  </div>
                  {j.rules.length ? (
                    <ul className="mt-2 space-y-2">
                      {j.rules.map((r) => (
                        <RuleRow key={r.id} rule={r} onFactor={setQ} />
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">No overrides. Follows the baseline.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Section>

        <Section id="purpose" title="Purpose rules (step 4)" show={!q || purposeRules.length > 0}>
          {purposeRules.length ? (
            <ul className="grid gap-2 xl:grid-cols-2">
              {purposeRules.map((r) => (
                <RuleRow key={r.id} rule={r} onFactor={setQ} />
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </Section>

        <Section id="techniques" title="Techniques and plans" show={!q || techs.length > 0}>
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(p.techniques.plans).map(([decision, plan]) => (
                <div key={decision} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2.5">
                  <OutcomePill outcome={decision} />
                  {plan.length ? (
                    plan.map((t) => (
                      <span key={t} className="font-mono text-[11px] text-slate-700">{t}</span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-400">no techniques</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Tiers 1 to 3 always run <span className="font-mono">{p.techniques.aggregate_product_plan.join(", ")}</span>. Every
              release first runs <span className="font-mono">place_check</span>, which withholds rows whose own location group gets a
              stricter decision.
            </p>
            {Object.entries(p.techniques.optional ?? {}).map(([name, conf]) => (
              <p key={name} className="text-xs text-slate-500">
                Optional module <span className="font-mono">{name}</span>: {conf.enabled ? "on" : "off"}, applies to{" "}
                {(conf.applies_to as string[] | undefined)?.join(", ")}, epsilon {String(conf.epsilon)}.
              </p>
            ))}
            {techs.length ? (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {techs.map((t) => (
                  <li key={t.name} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-emerald-900">{t.name}</span>
                      <span className="ml-auto">
                        <FactorChips factor={t.factor} onPick={setQ} />
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-emerald-800/80">{t.description}</p>
                    <p className="mt-1 text-[11px] text-emerald-700/70">
                      {usedInLabel(t.used_in)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
          </div>
        </Section>

        <Section id="catalog" title="Place catalog" show={!q || places.length > 0}>
          <p className="mb-3 text-xs text-slate-500">
            A row inside a place's buffer ({catalog.data?.buffer_m ?? "?"} m) takes that place's group; the strictest wins when buffers
            overlap; anything else is {catalog.data?.outside_group ?? "G5"}. Synthetic stand in for the real place list.
          </p>
          {places.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-1.5 pr-3 font-semibold">Area</th>
                    <th className="py-1.5 pr-3 font-semibold">Place</th>
                    <th className="py-1.5 pr-3 font-semibold">Group</th>
                    <th className="py-1.5 font-semibold">Coordinates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...places]
                    .sort((a, b) => a.area.localeCompare(b.area) || a.group.localeCompare(b.group))
                    .map((x) => (
                      <tr key={`${x.area}-${x.name}`}>
                        <td className="py-1.5 pr-3 text-slate-600">{x.area}</td>
                        <td className="py-1.5 pr-3 text-slate-800">{x.name}</td>
                        <td className="py-1.5 pr-3">
                          <FactorChips factor={x.group} onPick={setQ} />
                        </td>
                        <td className="py-1.5 font-mono text-slate-500">
                          {x.lat.toFixed(4)}, {x.lng.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </Section>

        <Section id="factors" title="Factor glossary" show={!q || factors.length > 0}>
          {factors.length ? (
            <ul className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2 xl:grid-cols-3">
              {factors.map(([id, name]) => (
                <li key={id} className="flex gap-2">
                  <button type="button" onClick={() => setQ(id)} className="w-6 font-mono font-semibold text-slate-700 hover:text-blue-700">
                    {id}
                  </button>
                  <span className="text-slate-600">{name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
          <p className="mt-3 text-[11px] text-slate-400">
            A to F are the privacy impact factors (v2). G1 to G5 are the location groups. Requesters: {p.requesters.map(titleCase).join(", ")}.
          </p>
        </Section>
      </div>
    </div>
  );
}
