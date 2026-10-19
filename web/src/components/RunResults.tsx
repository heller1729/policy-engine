import { lazy, Suspense, useState } from "react";
import type { RunResult } from "../api/client";
import { AuditView } from "./AuditView";
import { RowsTable } from "./RowsTable";
import { RunFunnel } from "./RunFunnel";

const CompareMaps = lazy(() => import("./CompareMaps"));

const TABS = ["Map", "Released rows", "Audit record"] as const;
type Tab = (typeof TABS)[number];

export function RunResults({ run }: { run: RunResult }) {
  const [tab, setTab] = useState<Tab>("Map");
  return (
    <div className="space-y-5">
      <RunFunnel run={run} />
      <div>
        <div className="mb-3 flex gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-sm ${
                tab === t ? "border-slate-900 font-medium text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t}
              {t === "Released rows" && <span className="ml-1 text-xs text-slate-400">{run.released.total.toLocaleString()}</span>}
            </button>
          ))}
        </div>
        {tab === "Map" && (
          <Suspense fallback={<div className="h-80 animate-pulse rounded-lg bg-slate-100" />}>
            <CompareMaps cells={run.map} outcome={run.decision.outcome} />
          </Suspense>
        )}
        {tab === "Released rows" && <RowsTable rows={run.released.rows} total={run.released.total} />}
        {tab === "Audit record" && <AuditView record={run.audit} />}
      </div>
    </div>
  );
}
