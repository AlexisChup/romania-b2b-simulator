import type { SimulationResult, ComparisonResult, StructureType } from './types';

export function compareResults(results: SimulationResult[]): ComparisonResult {
  const sorted = [...results].sort((a, b) => b.annualNetPersonalCash - a.annualNetPersonalCash);

  const bestPersonalNet = sorted[0].structureType;

  const bestEffectiveRate = results.reduce((best, r) =>
    r.effectiveTaxRate < best.effectiveTaxRate ? r : best
  ).structureType;

  let bestRetainedCash: StructureType | null = null;
  const srl = results.find(r => r.structureType === 'SRL');
  if (srl && 'retainedCompanyCash' in srl && srl.retainedCompanyCash > 0) {
    bestRetainedCash = 'SRL';
  }

  const simplest: StructureType = 'PFA';

  // Delta: best vs worst
  const worstNet = sorted[sorted.length - 1];
  const bestNetResult = sorted[0];
  const bestVsWorstAnnual = bestNetResult.annualNetPersonalCash - worstNet.annualNetPersonalCash;
  const bestVsWorstMonthly = bestVsWorstAnnual / 12;

  return {
    results,
    bestPersonalNet,
    bestEffectiveRate,
    bestRetainedCash,
    simplest,
    bestVsWorstAnnual,
    bestVsWorstMonthly,
    worstPersonalNet: worstNet.structureType,
  };
}
