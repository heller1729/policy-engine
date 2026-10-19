const STEPS = [
  { n: 1, label: "Request", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { n: 2, label: "Enforcement point", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { n: 3, label: "Decision point reads policy", color: "bg-slate-100 text-slate-700 border-slate-200" },
  { n: 4, label: "Most restrictive wins", color: "bg-pink-100 text-pink-800 border-pink-200" },
  { n: 5, label: "Decision and audit", color: "bg-pink-100 text-pink-800 border-pink-200" },
  { n: 6, label: "Techniques run", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { n: 7, label: "Release", color: "bg-blue-100 text-blue-800 border-blue-200" },
];

export function FlowSteps({ blocked }: { blocked: boolean }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((s, i) => {
        const off = blocked && s.n >= 6;
        return (
          <li key={s.n} className="flex items-center gap-1.5">
            <span
              className={`rounded-md border px-2 py-1 text-xs font-medium ${off ? "border-slate-200 bg-white text-slate-300 line-through" : s.color}`}
            >
              <span className="mr-1 opacity-60">{s.n}</span>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="text-slate-300">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
