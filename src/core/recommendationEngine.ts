import type { SimulationResult, Recommendation, StructureType, Warning } from './types';

/** Display name — PFA shows as "PFA / II" since they share the same tax engine */
function displayName(s: StructureType): string {
  if (s === 'PFA' || s === 'II') return 'PFA / II';
  return s;
}

export function generateRecommendations(
  results: SimulationResult[],
  warnings: Warning[],
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (results.length === 0) return recommendations;

  // Find best personal net
  const sorted = [...results].sort((a, b) => b.annualNetPersonalCash - a.annualNetPersonalCash);
  const bestNet = sorted[0];
  const secondNet = sorted[1];

  // Check if micro is lost
  const microLost = warnings.some(w => w.id === 'micro_cap_exceeded');
  const microAtRisk = warnings.some(w => w.id === 'micro_cap_risk');

  // Best personal net
  recommendations.push({
    label: 'Highest personal net income',
    structureType: bestNet.structureType === 'IF' ? bestNet.structureType : bestNet.structureType,
    reason: `${displayName(bestNet.structureType)} yields the highest estimated annual personal cash (€${Math.round(bestNet.annualNetPersonalCash).toLocaleString()}).`,
  });

  // Best effective tax rate
  const byRate = [...results].sort((a, b) => a.effectiveTaxRate - b.effectiveTaxRate);
  const bestRate = byRate[0];
  if (bestRate.structureType !== bestNet.structureType) {
    recommendations.push({
      label: 'Lowest effective tax rate',
      structureType: bestRate.structureType,
      reason: `${displayName(bestRate.structureType)} has the lowest effective tax rate (${(bestRate.effectiveTaxRate * 100).toFixed(1)}%).`,
    });
  }

  // Simplest
  const simplestType: StructureType = 'PFA';
  const pfaResult = results.find(r => r.structureType === 'PFA');
  if (pfaResult) {
    recommendations.push({
      label: 'Simplest setup',
      structureType: simplestType,
      reason: 'PFA has the lowest admin overhead — single-entry bookkeeping, no accountant required for basic cases.',
    });
  }

  // Best for retention (SRL)
  const srlResult = results.find(r => r.structureType === 'SRL');
  if (srlResult && 'retainedCompanyCash' in srlResult && srlResult.retainedCompanyCash > 0) {
    recommendations.push({
      label: 'Best for cash retention',
      structureType: 'SRL',
      reason: `SRL allows retaining €${Math.round(srlResult.retainedCompanyCash).toLocaleString()} in the company for reinvestment.`,
    });
  }

  // Micro risk warning
  if (microLost) {
    const srlInResults = results.find(r => r.structureType === 'SRL');
    if (srlInResults) {
      recommendations.push({
        label: 'Micro regime not available',
        structureType: 'SRL',
        reason: 'Revenue exceeds the €100,000 micro ceiling. SRL would operate under profit tax (16% CIT), which changes the optimization math significantly.',
      });
    }
  } else if (microAtRisk) {
    recommendations.push({
      label: 'High threshold risk',
      structureType: 'SRL',
      reason: 'Revenue is very close to the €100,000 micro cap. Any additional income could trigger a switch to profit tax mid-year.',
    });
  }

  // Close comparison note
  if (secondNet && bestNet.annualNetPersonalCash > 0) {
    const diff = bestNet.annualNetPersonalCash - secondNet.annualNetPersonalCash;
    const diffPct = diff / bestNet.annualNetPersonalCash;
    if (diffPct < 0.05) {
      recommendations.push({
        label: 'Close comparison',
        structureType: secondNet.structureType,
        reason: `${displayName(bestNet.structureType)} and ${displayName(secondNet.structureType)} are within ${(diffPct * 100).toFixed(1)}% of each other. Consider non-tax factors (liability, admin complexity, flexibility).`,
      });
    }
  }

  return recommendations;
}
