import { RotateCcw } from "lucide-react";
import type { DataSummary, Overrides, PolicyInfo, RequestBody, Scenario } from "../api/client";
import { titleCase } from "../lib/labels";
import { Field, selectClass } from "./Field";

type Option = { value: string; label: string };

function withCurrent(options: Option[], value: string): Option[] {
  if (options.some((o) => o.value === value)) return options;
  return [...options, { value, label: `${value} (not in policy)` }];
}

function sameRequest(a: RequestBody, s: Scenario): boolean {
  const attrs = s.attributes as Record<string, unknown>;
  return (
    a.data_tier === attrs.data_tier &&
    a.requester === attrs.requester &&
    a.jurisdiction === attrs.jurisdiction &&
    a.purpose === attrs.purpose &&
    a.location_group === attrs.location_group &&
    (a.area ?? null) === (attrs.area ?? null)
  );
}

type Props = {
  value: RequestBody;
  onChange: (next: RequestBody) => void;
  policy: PolicyInfo;
  scenarios: Scenario[];
  summary?: DataSummary;
  overrideError?: string;
};

export function RequestForm({ value, onChange, policy, scenarios, summary, overrideError }: Props) {
  const set = (patch: Partial<RequestBody>) => onChange({ ...value, ...patch });
  const overrides: Overrides = value.overrides ?? {};
  const setOverride = (patch: Partial<Overrides>) => {
    const next = { ...overrides, ...patch };
    const empty = Object.values(next).every((v) => v === null || v === undefined);
    set({ overrides: empty ? null : next });
  };
  const current = scenarios.find((s) => !value.overrides && sameRequest(value, s));
  const kDefault = policy.thresholds.k_default;

  return (
    <div className="space-y-5">
      <Field label="Demo scenario">
        <select
          className={selectClass}
          value={current ? String(current.number) : ""}
          onChange={(e) => {
            const s = scenarios.find((x) => String(x.number) === e.target.value);
            if (s) onChange({ ...(s.attributes as RequestBody), overrides: null });
          }}
        >
          <option value="">Custom request</option>
          {scenarios.map((s) => (
            <option key={s.number} value={s.number}>
              {s.number}. {s.title}
            </option>
          ))}
        </select>
      </Field>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <Field label="Data tier" hint="Riki's 7 level Privacy Impact framework">
          <select className={selectClass} value={value.data_tier} onChange={(e) => set({ data_tier: Number(e.target.value) })}>
            {policy.tiers.map((t) => (
              <option key={t.level} value={t.level}>
                Lv {t.level}: {t.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Requester">
          <select className={selectClass} value={value.requester} onChange={(e) => set({ requester: e.target.value })}>
            {withCurrent(policy.requesters.map((r) => ({ value: r, label: titleCase(r) })), value.requester).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Jurisdiction">
          <select className={selectClass} value={value.jurisdiction} onChange={(e) => set({ jurisdiction: e.target.value })}>
            {withCurrent(policy.jurisdictions.map((j) => ({ value: j.id, label: j.label })), value.jurisdiction).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Purpose">
          <select className={selectClass} value={value.purpose} onChange={(e) => set({ purpose: e.target.value })}>
            {withCurrent(policy.purposes.map((p) => ({ value: p, label: titleCase(p) })), value.purpose).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Location group">
          <select className={selectClass} value={value.location_group} onChange={(e) => set({ location_group: e.target.value })}>
            {withCurrent(policy.location_groups.map((g) => ({ value: g.id, label: `${g.id} ${g.name}` })), value.location_group).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Area" hint="Scopes the synthetic data when the request is run">
          <select className={selectClass} value={value.area ?? ""} onChange={(e) => set({ area: e.target.value || null })}>
            <option value="">All areas</option>
            {summary?.areas.map((a) => (
              <option key={a.area} value={a.area}>{a.area}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">What if</span>
          {value.overrides && (
            <button
              type="button"
              onClick={() => set({ overrides: null })}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
            >
              <RotateCcw size={12} /> reset
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400">Overrides can only tighten the policy.</p>
        <Field label={`Minimum k (policy default ${kDefault})`}>
          <input
            type="number"
            min={kDefault}
            placeholder={String(kDefault)}
            className={selectClass}
            value={overrides.k_min ?? ""}
            onChange={(e) => setOverride({ k_min: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={overrides.noise ?? false}
            onChange={(e) => setOverride({ noise: e.target.checked ? true : null, epsilon: e.target.checked ? overrides.epsilon ?? null : null })}
          />
          Add Laplace noise to counts (E5)
        </label>
        {overrides.noise && (
          <Field label="Epsilon">
            <input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="1.0"
              className={selectClass}
              value={overrides.epsilon ?? ""}
              onChange={(e) => setOverride({ epsilon: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </Field>
        )}
        {overrideError && <p className="rounded-md bg-rose-50 px-2.5 py-2 text-xs text-rose-700">{overrideError}</p>}
      </div>
    </div>
  );
}
