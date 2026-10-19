import type { PolicyInfo } from "../api/client";
import { cellKey, type GridCell } from "../components/MatrixGrid";

export function rawMatrix(policy: PolicyInfo): Map<string, GridCell> {
  const cells = new Map<string, GridCell>();
  for (const band of policy.audience_matrix.bands) {
    for (const tier of band.tiers) {
      for (const r of policy.requesters) {
        const id = `AUD_${band.label.toUpperCase().replace(/ /g, "_")}_${r.toUpperCase()}`;
        cells.set(cellKey(tier, r), { outcome: band.cells[r], review: false, deciding: [id] });
      }
    }
  }
  return cells;
}
