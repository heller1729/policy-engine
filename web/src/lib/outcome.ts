export const OUTCOMES = ["Full", "Masked", "Aggregate", "Blocked"] as const;

const STYLE: Record<string, { pill: string; soft: string; text: string; dot: string; meaning: string }> = {
  Full: {
    pill: "bg-emerald-600 text-white",
    soft: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    dot: "bg-emerald-600",
    meaning: "Released as is",
  },
  Masked: {
    pill: "bg-sky-600 text-white",
    soft: "bg-sky-50 border-sky-200",
    text: "text-sky-700",
    dot: "bg-sky-600",
    meaning: "Device rows with IDs hashed and sensitive rows removed",
  },
  Aggregate: {
    pill: "bg-amber-500 text-white",
    soft: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
    meaning: "Counts above k only",
  },
  Blocked: {
    pill: "bg-rose-600 text-white",
    soft: "bg-rose-50 border-rose-200",
    text: "text-rose-700",
    dot: "bg-rose-600",
    meaning: "Nothing is released",
  },
};

export function outcomeStyle(outcome: string) {
  return STYLE[outcome] ?? STYLE.Blocked;
}

export const STEP_LABELS: Record<string, string> = {
  validate: "Input check",
  location_group: "Location group",
  audience_matrix: "Audience matrix",
  jurisdiction: "Jurisdiction overrides",
  purpose: "Purpose rules",
};
