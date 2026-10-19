import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const ORDER = ["device_id", "home_country", "area", "place", "place_group", "h3_cell", "date", "hour", "unique_devices", "noisy", "lat", "lng"];
const PAGE = 25;

function columns(rows: Record<string, unknown>[]): string[] {
  const keys = new Set<string>();
  for (const r of rows.slice(0, 50)) Object.keys(r).forEach((k) => keys.add(k));
  return [...ORDER.filter((k) => keys.has(k)), ...[...keys].filter((k) => !ORDER.includes(k))];
}

export function RowsTable({ rows, total }: { rows: Record<string, unknown>[]; total: number }) {
  const [page, setPage] = useState(0);
  if (!rows.length) return <p className="text-sm text-slate-500">No rows were released.</p>;

  const cols = columns(rows);
  const pages = Math.ceil(rows.length / PAGE);
  const current = Math.min(page, pages - 1);
  const slice = rows.slice(current * PAGE, current * PAGE + PAGE);

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {cols.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slice.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                {cols.map((c) => (
                  <td key={c} className={`whitespace-nowrap px-3 py-1.5 ${c === "device_id" || c === "h3_cell" ? "font-mono" : ""}`}>
                    {r[c] === undefined ? "" : String(r[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>
          Rows {current * PAGE + 1} to {Math.min(rows.length, (current + 1) * PAGE)} of {total.toLocaleString()}
          {total > rows.length && <> (first {rows.length.toLocaleString()} loaded)</>}
        </span>
        <span className="flex items-center gap-1">
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          {current + 1} / {pages}
          <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="rounded p-1 hover:bg-slate-100 disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </span>
      </div>
    </div>
  );
}
