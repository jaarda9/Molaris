import type { TreatmentPlanItem } from '../../domain/clinical-records.js';
import { DEFAULT_TEETH } from '../../domain/dental-data.js';
import { isPrimaryToothId } from '../../domain/primary-teeth.js';
import type { Procedure, Quote } from './repository.js';

/** An act of the treatment plan marked done that appears on no quote. */
export interface UnbilledAct {
  itemId: string;
  procedure: string;
  toothFdi: number | null;
  /** Catalog act with the same name, if any (its price prefills the quote). */
  procedureId: string | null;
  catalogLabel: string | null;
  unitPriceMillimes: number;
}

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Plan teeth are Universal 1-32 (permanent) or FDI 51-85 (primary); quotes use FDI. */
export function planToothToFdi(toothId: number | undefined): number | null {
  if (!toothId) return null;
  if (isPrimaryToothId(toothId)) return toothId;
  return DEFAULT_TEETH.find(t => t.id === toothId)?.fdi ?? null;
}

/**
 * Completed plan items not covered by a live quote (draft, sent or accepted) of the
 * patient, nor paid directly (`paidItemIds`: items named by a non-cancelled payment made
 * outside a quote). A quote line covers an item when it names the same act (as typed in
 * the plan, or its catalog name) on the same tooth; each line covers one item.
 */
export function findUnbilledActs(plan: TreatmentPlanItem[], quotes: Quote[], catalog: Procedure[], paidItemIds: Iterable<string> = []): UnbilledAct[] {
  const paid = new Set(paidItemIds);
  const lines = quotes
    .filter(q => q.status === 'draft' || q.status === 'sent' || q.status === 'accepted')
    .flatMap(q => q.items.map(i => ({ label: plain(i.label), procedureId: i.procedureId, tooth: i.toothFdi ?? null, used: false })));

  const result: UnbilledAct[] = [];
  for (const item of plan.filter(i => i.status === 'completed' && !paid.has(i.id))) {
    const tooth = planToothToFdi(item.toothId);
    const catalogMatch = catalog.find(p => plain(p.labelFr) === plain(item.procedure));
    const names = new Set([plain(item.procedure), ...(catalogMatch ? [plain(catalogMatch.labelFr)] : [])]);
    const line = lines.find(l => !l.used && l.tooth === tooth
      && (names.has(l.label) || (catalogMatch && l.procedureId === catalogMatch.id)));
    if (line) { line.used = true; continue; }
    result.push({
      itemId: item.id,
      procedure: item.procedure,
      toothFdi: tooth,
      procedureId: catalogMatch?.id ?? null,
      catalogLabel: catalogMatch?.labelFr ?? null,
      unitPriceMillimes: catalogMatch
        ? catalogMatch.defaultPriceMillimes
        : (Number(item.estimatedCost) > 0 ? Math.round(Number(item.estimatedCost) * 1000) : 0)
    });
  }
  return result;
}
