import type { DB } from '../../db/connection.js';
import { localDate, PaymentRepository, Procedure, ProcedureRepository, QuoteRepository } from './repository.js';

/**
 * Demo catalog for client demos.
 *
 * ⚠️ EDITABLE DEMO PRICES, NOT OFFICIAL TARIFFS. These are plausible round
 * figures for a private practice, chosen for demonstration only; each dentist
 * sets their own prices in Facturation > Catalogue. The CNAM code, key letter
 * and coefficient are deliberately left empty: never invent CNAM nomenclature.
 */
const DEMO_CATALOG: Array<{ category: string; labelFr: string; labelAr?: string; dinars: number }> = [
  { category: 'Consultation & radiologie', labelFr: 'Consultation', labelAr: 'استشارة', dinars: 40 },
  { category: 'Consultation & radiologie', labelFr: 'Radiographie rétro-alvéolaire', dinars: 15 },
  { category: 'Consultation & radiologie', labelFr: 'Radiographie panoramique', dinars: 40 },
  { category: 'Prévention', labelFr: 'Détartrage et polissage', labelAr: 'تنظيف الأسنان', dinars: 80 },
  { category: 'Prévention', labelFr: 'Scellement de sillons (par dent)', dinars: 40 },
  { category: 'Soins conservateurs', labelFr: 'Obturation composite 1 face', dinars: 80 },
  { category: 'Soins conservateurs', labelFr: 'Obturation composite 2 faces', dinars: 110 },
  { category: 'Soins conservateurs', labelFr: 'Obturation composite 3 faces', dinars: 140 },
  { category: 'Endodontie', labelFr: 'Traitement endodontique monoradiculée', dinars: 180 },
  { category: 'Endodontie', labelFr: 'Traitement endodontique pluriradiculée', dinars: 300 },
  { category: 'Parodontologie', labelFr: 'Surfaçage radiculaire (par quadrant)', dinars: 120 },
  { category: 'Chirurgie', labelFr: 'Extraction simple', labelAr: 'قلع سن', dinars: 50 },
  { category: 'Chirurgie', labelFr: 'Extraction dent de sagesse incluse', dinars: 200 },
  { category: 'Prothèse', labelFr: 'Inlay-core', dinars: 150 },
  { category: 'Prothèse', labelFr: 'Couronne céramo-métallique', dinars: 600 },
  { category: 'Prothèse', labelFr: 'Couronne zircone', dinars: 900 },
  { category: 'Prothèse', labelFr: 'Prothèse amovible partielle résine', dinars: 500 },
  { category: 'Prothèse', labelFr: 'Prothèse complète (par arcade)', dinars: 900 },
  { category: 'Implantologie', labelFr: 'Implant (pose chirurgicale)', dinars: 1800 },
  { category: 'Esthétique', labelFr: 'Blanchiment ambulatoire', dinars: 500 },
  { category: 'Orthodontie', labelFr: 'Gouttière de contention', dinars: 200 }
];

const daysAgo = (days: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const hhmm = (d: Date) => `${localDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function seedDemo(db: DB): void {
  const procedures = new ProcedureRepository(db);
  const byLabel = new Map<string, Procedure>();
  for (const p of DEMO_CATALOG) {
    const created = procedures.create({ category: p.category, labelFr: p.labelFr, labelAr: p.labelAr ?? null, defaultPriceMillimes: p.dinars * 1000 });
    byLabel.set(created.labelFr, created);
  }
  const line = (labelFr: string, toothFdi: number | null, discountDinars = 0) => {
    const p = byLabel.get(labelFr)!;
    return { procedureId: p.id, label: p.labelFr, toothFdi, quantity: 1, unitPriceMillimes: p.defaultPriceMillimes, discountMillimes: discountDinars * 1000 };
  };

  const quotes = new QuoteRepository(db);
  const payments = new PaymentRepository(db);

  // pt_1: accepted quote (endo + inlay-core + crown on 36 = 1 000 DT after a 50 DT discount), paid in installments.
  const issued = daysAgo(20, 10);
  const accepted = quotes.create({
    patientId: 'pt_1',
    notes: 'Paiement en plusieurs fois accepté.',
    items: [
      line('Traitement endodontique pluriradiculée', 36),
      line('Inlay-core', 36),
      line('Couronne céramo-métallique', 36, 50)
    ]
  }, issued);
  quotes.setStatus(accepted.id, 'sent');
  quotes.setStatus(accepted.id, 'accepted');
  const firstInstallment = daysAgo(14, 11, 15);
  payments.create({ patientId: 'pt_1', quoteId: accepted.id, amountMillimes: 400_000, method: 'cash', paidAt: hhmm(firstInstallment) }, firstInstallment);
  const today1 = daysAgo(0, 9, 30);
  payments.create({ patientId: 'pt_1', quoteId: accepted.id, amountMillimes: 300_000, method: 'cheque', reference: '0045872', paidAt: hhmm(today1) }, today1);

  // pt_2: draft quote still being discussed.
  quotes.create({
    patientId: 'pt_2',
    items: [
      line('Détartrage et polissage', null),
      line('Obturation composite 2 faces', 16),
      line('Obturation composite 1 face', 25)
    ]
  }, daysAgo(0, 10));

  // A few consultations paid today, outside any quote.
  const today2 = daysAgo(0, 10, 45);
  payments.create({ patientId: 'pt_2', amountMillimes: 40_000, method: 'card', notes: 'Consultation', paidAt: hhmm(today2) }, today2);
  const today3 = daysAgo(0, 11, 20);
  payments.create({ patientId: 'pt_3', amountMillimes: 55_000, method: 'cash', notes: 'Consultation + radiographie rétro-alvéolaire', paidAt: hhmm(today3) }, today3);
}
