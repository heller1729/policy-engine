import { FACTORS, splitFactors } from "../lib/factors";

export function FactorChips({ factor, onPick }: { factor: string | null | undefined; onPick?: (id: string) => void }) {
  const ids = splitFactors(factor);
  if (!ids.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {ids.map((id) => (
        <span
          key={id}
          title={FACTORS[id] ?? id}
          onClick={onPick ? () => onPick(id) : undefined}
          className={`rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-600 ${
            onPick ? "cursor-pointer hover:border-blue-400 hover:text-blue-700" : "cursor-help"
          }`}
        >
          {id}
        </span>
      ))}
    </span>
  );
}
