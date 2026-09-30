import { z } from 'zod';

export const InstrumentClassSchema = z.enum([
  'Weights',
  'Length measure',
  'Capacity measure',
  'Counter machine',
  'NAWI class III up to 150 kg'
]);
export type InstrumentClass = z.infer<typeof InstrumentClassSchema>;

export interface InstrumentRule {
  code: string;
  label: InstrumentClass;
  validityMonths: number;
  routing: 'LMO' | 'GATC';
  baseFeeDemo: number;
  tolerancesDemo: number;
  sourceNote: string;
  verified: boolean;
}

export const instrumentRules: Record<InstrumentClass, InstrumentRule> = {
  'Weights': { code: 'W', label: 'Weights', validityMonths: 24, routing: 'LMO', baseFeeDemo: 100, tolerancesDemo: 0.1, sourceNote: 'General rules', verified: true },
  'Length measure': { code: 'LM', label: 'Length measure', validityMonths: 24, routing: 'LMO', baseFeeDemo: 50, tolerancesDemo: 0.5, sourceNote: 'General rules', verified: true },
  'Capacity measure': { code: 'CM', label: 'Capacity measure', validityMonths: 24, routing: 'LMO', baseFeeDemo: 75, tolerancesDemo: 0.5, sourceNote: 'General rules', verified: false },
  'Counter machine': { code: 'CMAC', label: 'Counter machine', validityMonths: 12, routing: 'LMO', baseFeeDemo: 200, tolerancesDemo: 0.2, sourceNote: 'General rules', verified: true },
  'NAWI class III up to 150 kg': { code: 'NAWI-III-150', label: 'NAWI class III up to 150 kg', validityMonths: 12, routing: 'GATC', baseFeeDemo: 500, tolerancesDemo: 0.05, sourceNote: 'General rules', verified: true }
};

export function computeValidTo(instrumentClass: InstrumentClass, inspectedAt: number): number {
  const rule = instrumentRules[instrumentClass];
  if (!rule) throw new Error(`Unknown class: ${instrumentClass}`);
  
  const d = new Date(inspectedAt);
  const targetMonth = d.getUTCMonth() + rule.validityMonths;
  const targetYear = d.getUTCFullYear() + Math.floor(targetMonth / 12);
  const month = targetMonth % 12;
  
  const lastDayOfMonth = new Date(Date.UTC(targetYear, month + 1, 0)).getUTCDate();
  const targetDay = Math.min(d.getUTCDate(), lastDayOfMonth);
  
  const result = new Date(Date.UTC(targetYear, month, targetDay, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
  return result.getTime();
}

export function requiresGatc(instrumentClass: InstrumentClass): boolean {
  return instrumentRules[instrumentClass].routing === 'GATC';
}

export function computeFee(instrumentClass: InstrumentClass): number {
  return instrumentRules[instrumentClass].baseFeeDemo;
}

export function evaluateReadings(instrumentClass: InstrumentClass, readings: { nominal: number, observed: number }[]) {
  const tolerance = instrumentRules[instrumentClass].tolerancesDemo;
  const details = readings.map(r => {
    const error = Math.abs(r.observed - r.nominal);
    const pass = error <= tolerance;
    return { ...r, error, tolerance, pass };
  });
  const pass = details.every(d => d.pass);
  return { pass, details };
}
