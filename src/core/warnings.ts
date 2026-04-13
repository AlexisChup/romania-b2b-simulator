import type { SimulatorInputs, Warning, SimulationResult } from './types';
import { TAX } from './constants';

export function generateWarnings(inputs: SimulatorInputs, results: SimulationResult[]): Warning[] {
  const warnings: Warning[] = [];
  const revenue = inputs.dailyRateEur * inputs.billableDaysPerMonth * 12
    + inputs.annualAppIncomeEur
    + inputs.annualOtherIncomeEur;

  const revenueRon = revenue * inputs.fxEurToRon;
  const revenueEurEquiv = revenue; // already in EUR

  // ─── Micro turnover cap ───
  if (revenueEurEquiv > TAX.microCapEur) {
    warnings.push({
      id: 'micro_cap_exceeded',
      severity: 'high',
      title: 'Micro regime lost',
      message: `Annual revenue (€${Math.round(revenueEurEquiv).toLocaleString()}) exceeds the €100,000 micro turnover cap. The SRL would switch to profit tax (16%) from the quarter of exceedance.`,
      appliesTo: ['SRL'],
    });
  } else if (revenueEurEquiv > TAX.microCapEur * 0.90) {
    warnings.push({
      id: 'micro_cap_risk',
      severity: 'high',
      title: 'Near micro turnover cap',
      message: `Annual revenue (€${Math.round(revenueEurEquiv).toLocaleString()}) is within 10% of the €100,000 micro ceiling. Risk of losing micro regime if any additional income is received.`,
      appliesTo: ['SRL'],
    });
  } else if (revenueEurEquiv > TAX.microCapEur * 0.80) {
    warnings.push({
      id: 'micro_cap_warning',
      severity: 'medium',
      title: 'Approaching micro turnover cap',
      message: `Annual revenue (€${Math.round(revenueEurEquiv).toLocaleString()}) is above 80% of the €100,000 micro ceiling. Monitor closely.`,
      appliesTo: ['SRL'],
    });
  }

  // ─── VAT threshold ───
  if (revenueRon > TAX.vatExemptionThresholdRon) {
    warnings.push({
      id: 'vat_threshold_exceeded',
      severity: 'high',
      title: 'VAT registration required',
      message: `Annual turnover (${Math.round(revenueRon).toLocaleString()} RON) exceeds the VAT exemption threshold of 395,000 RON. VAT registration is required by the 10th of the following month.`,
      appliesTo: ['PFA', 'SRL'],
    });
  } else if (revenueRon > TAX.vatExemptionThresholdRon * 0.85) {
    warnings.push({
      id: 'vat_threshold_approaching',
      severity: 'medium',
      title: 'Approaching VAT threshold',
      message: `Annual turnover (${Math.round(revenueRon).toLocaleString()} RON) is nearing the 395,000 RON VAT exemption threshold.`,
      appliesTo: ['PFA', 'SRL'],
    });
  }

  // ─── SRL capital rule ───
  if (revenueRon > 400_000) {
    warnings.push({
      id: 'srl_capital_high',
      severity: 'medium',
      title: 'Higher SRL capital required',
      message: 'Net turnover exceeds 400,000 RON — minimum share capital must be increased to 5,000 RON (from 500 RON).',
      appliesTo: ['SRL'],
    });
  }

  // ─── SRL micro employee condition ───
  warnings.push({
    id: 'micro_employee_condition',
    severity: 'info',
    title: 'Micro requires at least 1 employee',
    message: 'SRL micro regime requires at least one employee. New companies must meet this within 90 days or switch to profit tax.',
    appliesTo: ['SRL'],
  });

  // ─── e-Factura ───
  warnings.push({
    id: 'efactura_b2b',
    severity: 'info',
    title: 'e-Factura compliance',
    message: 'B2B invoices must be transmitted via RO e-Factura within 5 days of issuance. Non-compliance can trigger a 15% penalty on the invoice total.',
    appliesTo: ['PFA', 'SRL'],
  });

  // ─── PFA / II structural limits ───
  warnings.push({
    id: 'pfa_limits',
    severity: 'info',
    title: 'PFA / II structural limits',
    message: 'PFA is limited to 5 CAEN classes and 3 employees. II allows up to 10 CAEN classes and 8 employees. Consider SRL if you need more.',
    appliesTo: ['PFA'],
  });

  // ─── CASS cap note ───
  const netIncomeRon = (revenue - revenue * inputs.expensePct) * inputs.fxEurToRon;
  const mw72 = 72 * inputs.minimumWageRon;
  if (netIncomeRon > mw72) {
    warnings.push({
      id: 'cass_cap_hit',
      severity: 'info',
      title: 'CASS cap reached',
      message: `Net income exceeds the CASS cap of 72 minimum wages (${Math.round(mw72).toLocaleString()} RON). CASS contribution is capped.`,
      appliesTo: ['PFA'],
    });
  }

  // ─── Dividend tax note ───
  const srlResult = results.find(r => r.structureType === 'SRL') as Extract<SimulationResult, { structureType: 'SRL' }> | undefined;
  if (srlResult && srlResult.dividendGross > 0) {
    warnings.push({
      id: 'dividend_tax_note',
      severity: 'info',
      title: 'Dividend tax: 16% from 2026',
      message: 'Dividends distributed from 1 Jan 2026 are taxed at 16% (up from 10%). This applies based on the distribution date, even for profits from earlier years.',
      appliesTo: ['SRL'],
    });
  }

  return warnings;
}
