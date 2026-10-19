import { FACTORS, splitFactors } from "../lib/factors";

export function FactorChips({ factor }: { factor: string | null | undefined }) {
  const ids = splitFactors(factor);
  if (!ids.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {ids.map((id) => (
        <span
          key={id}
          title={FACTORS[id] ?? id}
          className="cursor-help rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-600"
        >
          {id}
        </span>
      ))}
    </span>
  );
}
