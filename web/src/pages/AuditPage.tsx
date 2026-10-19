import { ChevronDown, ChevronRight, Download, ExternalLink, Flag, RefreshCw } from "lucide-react";
import { Fragment, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAudit, usePolicy } from "../api/hooks";
import { AuditView } from "../components/AuditView";
import { Card } from "../components/Card";
import { selectClass } from "../components/Field";
import { OutcomePill } from "../components/OutcomePill";
import { titleCase } from "../lib/labels";
import { OUTCOMES } from "../lib/outcome";
import { builderLink } from "../lib/rules";

type AuditRecord = {
  time: string;
  outcome: string;
  review: boolean;
  k: number;
  deciding_rules: string[];
  request: { request_id: string; data_tier: number; requester: string; jurisdiction: string; purpose: string; location_group: string; area?: string | null };
  enforcement: { technique: string; rows_in: number; rows_out: number; withheld?: Record<string, { rows: number }> }[];
  policy_overrides?: Record<string, unknown>;
};

function released(r: AuditRecord): string {
  if (!r.enforcement.length) return "nothing";
  const last = r.enforcement[r.enforcement.length - 1];
  const aggregated = r.enforcement.some((s) => s.technique === "aggregate_h3");
  return `${last.rows_out.toLocaleString()} ${aggregated ? "cells" : "rows"}`;
}

function withheld(r: AuditRecord): number {
  const check = r.enforcement.find((s) => s.technique === "place_check");
  return check ? check.rows_in - check.rows_out : 0;
}

export function AuditPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "review" ? "review" : "all";
  const outcome = params.get("outcome") ?? "";
  const jurisdiction = params.get("jurisdiction") ?? "";
  const [open, setOpen] = useState<string | null>(null);
  const policy = usePolicy();

  const audit = useAudit({
    outcome: outcome || undefined,
    jurisdiction: jurisdiction || undefined,
    review: tab === "review" ? true : undefined,
  });
  const reviewCount = useAudit({ review: true }).data?.total ?? 0;
  const records = (audit.data?.records ?? []) as unknown as AuditRecord[];

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Audit log</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Every request that was run since the server started, newest first, with the rules that decided it and what the
            enforcement point did. Live previews in the request builder are not logged; runs are.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => audit.refetch()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={14} className={audit.isFetching ? "animate-spin" : ""} /> Refresh
          </button>
          <a
            href="/api/audit/export"
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            <Download size={14} /> Export JSONL
          </a>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-md border border-slate-300 p-0.5 text-sm">
            {[
              ["all", "All requests"],
              ["review", `Needs review (${reviewCount})`],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => set("tab", id === "review" ? "review" : "")}
                className={`rounded px-3 py-1 ${tab === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="w-40">
            <select className={selectClass} value={outcome} onChange={(e) => set("outcome", e.target.value)}>
              <option value="">Any outcome</option>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="w-56">
            <select className={selectClass} value={jurisdiction} onChange={(e) => set("jurisdiction", e.target.value)}>
              <option value="">Any jurisdiction</option>
              {policy.data?.jurisdictions.map((j) => (
                <option key={j.id} value={j.id}>{j.label}</option>
              ))}
            </select>
          </div>
          <span className="ml-auto text-xs text-slate-500">{audit.data?.total ?? 0} records</span>
        </div>
        {tab === "review" && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Grey area requests were released as Aggregate at most. A reviewer can read them here; approving one in the app would release
            more than the policy allows, so there is no approve button.
          </p>
        )}
      </Card>

      <Card>
        {records.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No requests logged yet.{" "}
            <Link to="/" className="font-medium text-blue-600 hover:underline">Run one in the request builder</Link> or step through{" "}
            <Link to="/present" className="font-medium text-blue-600 hover:underline">present mode</Link>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="text-left text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="w-6 py-2" />
                  <th className="py-2 pr-3 font-semibold">Time (UTC)</th>
                  <th className="py-2 pr-3 font-semibold">Request</th>
                  <th className="py-2 pr-3 font-semibold">Outcome</th>
                  <th className="py-2 pr-3 font-semibold">Decided by</th>
                  <th className="py-2 pr-3 text-right font-semibold">Withheld by place</th>
                  <th className="py-2 text-right font-semibold">Released</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const id = r.request.request_id;
                  const q = r.request;
                  const isOpen = open === id;
                  return (
                    <Fragment key={id}>
                      <tr className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setOpen(isOpen ? null : id)}>
                        <td className="py-2 text-slate-400">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                        <td className="whitespace-nowrap py-2 pr-3 text-slate-600">{r.time.replace("T", " ").replace("+00:00", "")}</td>
                        <td className="py-2 pr-3 text-slate-700">
                          Lv {q.data_tier}, {titleCase(q.requester)}, {q.jurisdiction}, {q.purpose}, {q.location_group}
                          {q.area ? `, ${q.area}` : ""}
                          {r.policy_overrides && <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-500">what if</span>}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-3">
                          <OutcomePill outcome={r.outcome} />
                          {r.review && <Flag size={12} className="ml-1 inline text-amber-600" />}
                        </td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-slate-600">{r.deciding_rules.join(", ")}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{withheld(r).toLocaleString()}</td>
                        <td className="py-2 text-right tabular-nums text-slate-700">{released(r)}</td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <td />
                          <td colSpan={6} className="py-3 pr-2">
                            <Link
                              to={builderLink({ tier: q.data_tier, requester: q.requester, jurisdiction: q.jurisdiction, purpose: q.purpose, group: q.location_group, area: q.area })}
                              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                            >
                              Open in request builder <ExternalLink size={11} />
                            </Link>
                            <AuditView record={r as unknown as Record<string, unknown>} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
