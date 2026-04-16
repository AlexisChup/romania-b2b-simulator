import type {
  SimulatorInputs,
  RevenueBreakdown,
  PfaIiResult,
  SrlResult,
  SrlSalaryDetail,
  SimulationResult,
  MonthlyBreakdown,
  MonthlyBreakdownRow,
  MonthlyCashflow,
} from './types';
import { TAX } from './constants';
import { getDefaults } from './constants';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Helper: format EUR amount for formula steps
function eur(v: number): string {
  return `€${Math.round(v).toLocaleString('en-US')}`;
}

// ─── Revenue calculation ───

export function computeRevenue(inputs: SimulatorInputs): RevenueBreakdown {
  const annualServiceRevenue = inputs.dailyRateEur * inputs.billableDaysPerMonth * 12;
  const annualAppIncome = inputs.annualAppIncomeEur;
  const annualOtherIncome = inputs.annualOtherIncomeEur;
  const annualTotalRevenue = annualServiceRevenue + annualAppIncome + annualOtherIncome;
  return {
    annualServiceRevenue,
    annualAppIncome,
    annualOtherIncome,
    annualTotalRevenue,
    monthlyGrossRevenue: annualTotalRevenue / 12,
  };
}

// ─── Expenses calculation ───

export function computeExpenses(inputs: SimulatorInputs, totalRevenue: number): number {
  if (inputs.expenseMode === 'percent') {
    return totalRevenue * inputs.expensePct;
  }
  return inputs.annualFixedExpensesEur;
}

// ─── PFA / II individual tax engine ───

function computeCas(netIncome: number, minWage: number): number {
  const mw12 = 12 * minWage;
  const mw24 = 24 * minWage;

  if (netIncome < mw12) return 0;
  const casBase = netIncome >= mw24 ? mw24 : mw12;
  return casBase * TAX.casRate;
}

function computeCassIndependent(
  netIncome: number,
  minWage: number,
  cassMinBaseException: boolean,
): number {
  // If the user has CASS coverage through employment, they are exempt
  // from CASS on independent activity income entirely.
  if (cassMinBaseException) return 0;

  if (netIncome <= 0) return 0;

  const mw6 = 6 * minWage;
  const mw72 = TAX.cassCapMult2026 * minWage;

  let cassBase = Math.min(netIncome, mw72);

  if (cassBase < mw6) {
    cassBase = mw6;
  }

  return cassBase * TAX.cassRate;
}

function computePit(netIncome: number, casDue: number, cassDue: number): number {
  // CASS deductible part: min(cass_due, net_income * 0.10)
  const cassDeductible = Math.min(cassDue, netIncome * TAX.cassRate);
  const pitBase = netIncome - casDue - cassDeductible;
  return Math.max(0, pitBase) * TAX.pitRate;
}

export function computePfaIi(inputs: SimulatorInputs): PfaIiResult {
  const revenue = computeRevenue(inputs);
  const annualDeductibleExpenses = computeExpenses(inputs, revenue.annualTotalRevenue);
  const netIncomeEur = revenue.annualTotalRevenue - annualDeductibleExpenses;
  const netIncomeRon = netIncomeEur * inputs.fxEurToRon;
  const minWage = inputs.minimumWageRon;

  const casDueRon = computeCas(netIncomeRon, minWage);
  const cassDueRon = computeCassIndependent(netIncomeRon, minWage, inputs.cassMinBaseException);
  const pitDueRon = computePit(netIncomeRon, casDueRon, cassDueRon);

  // Convert back to EUR for display consistency
  const casDue = casDueRon / inputs.fxEurToRon;
  const cassDue = cassDueRon / inputs.fxEurToRon;
  const pitDue = pitDueRon / inputs.fxEurToRon;

  const totalTaxes = casDue + cassDue + pitDue;
  const annualNet = netIncomeEur - totalTaxes;

  // Monthly breakdown
  const monthlyRev = revenue.annualTotalRevenue / 12;
  const monthlyExp = annualDeductibleExpenses / 12;
  const monthlyNetIncome = netIncomeEur / 12;
  const monthlyCas = casDue / 12;
  const monthlyCass = cassDue / 12;
  const monthlyPit = pitDue / 12;
  const monthlyNet = annualNet / 12;

  // Pre-compute values for formula steps
  const mwEur = inputs.minimumWageRon / inputs.fxEurToRon;
  const cassDeductibleRon = Math.min(cassDueRon, netIncomeRon * TAX.cassRate);
  const cassDeductibleEur = cassDeductibleRon / inputs.fxEurToRon;
  const pitBaseEur = Math.max(0, netIncomeEur - casDue - cassDeductibleEur);

  const breakdown: MonthlyBreakdown = {
    rows: [
      {
        label: 'Gross revenue',
        tooltip: 'Total professional income before any deductions.',
        category: 'revenue',
        values: Array(12).fill(monthlyRev),
        annual: revenue.annualTotalRevenue,
        monthlyFormula: [
          { label: `Annual revenue ${eur(revenue.annualTotalRevenue)} ÷ 12`, type: 'base' },
          { label: 'Monthly gross', amount: eur(monthlyRev), type: 'result' },
        ],
        annualFormula: [
          { label: `Service: ${inputs.dailyRateEur} €/day × ${inputs.billableDaysPerMonth} days × 12`, amount: eur(revenue.annualServiceRevenue), type: 'base' },
          ...(inputs.annualAppIncomeEur > 0 ? [{ label: 'App income', amount: eur(inputs.annualAppIncomeEur), type: 'add' as const }] : []),
          ...(inputs.annualOtherIncomeEur > 0 ? [{ label: 'Other income', amount: eur(inputs.annualOtherIncomeEur), type: 'add' as const }] : []),
          { label: 'Annual gross revenue', amount: eur(revenue.annualTotalRevenue), type: 'result' },
        ],
      },
      {
        label: 'Deductible expenses',
        tooltip: 'Operating costs that reduce your taxable income: accountant, tools, subscriptions, travel, etc.',
        category: 'expense',
        values: Array(12).fill(-monthlyExp),
        annual: -annualDeductibleExpenses,
        monthlyFormula: [
          { label: `Annual expenses ${eur(annualDeductibleExpenses)} ÷ 12`, type: 'base' },
          { label: 'Monthly expenses', amount: eur(monthlyExp), type: 'subtract' },
        ],
        annualFormula: inputs.expenseMode === 'percent'
          ? [
              { label: `Revenue ${eur(revenue.annualTotalRevenue)} × ${(inputs.expensePct * 100).toFixed(0)}%`, type: 'base' },
              { label: 'Annual expenses', amount: eur(annualDeductibleExpenses), type: 'subtract' },
            ]
          : [
              { label: 'Fixed annual expenses', amount: eur(annualDeductibleExpenses), type: 'subtract' },
            ],
      },
      {
        label: 'Net income (taxable base)',
        tooltip: 'Revenue minus deductible expenses. This is the base for CAS/CASS/PIT calculations.',
        category: 'subtotal',
        values: Array(12).fill(monthlyNetIncome),
        annual: netIncomeEur,
        monthlyFormula: [
          { label: 'Monthly revenue', amount: eur(monthlyRev), type: 'base' },
          { label: 'Monthly expenses', amount: `−${eur(monthlyExp)}`, type: 'subtract' },
          { label: 'Monthly net income', amount: eur(monthlyNetIncome), type: 'result' },
        ],
        annualFormula: [
          { label: 'Annual revenue', amount: eur(revenue.annualTotalRevenue), type: 'base' },
          { label: 'Annual expenses', amount: `−${eur(annualDeductibleExpenses)}`, type: 'subtract' },
          { label: 'Annual net income', amount: eur(netIncomeEur), type: 'result' },
        ],
      },
      {
        label: 'CAS (pension)',
        tooltip: 'Pension contribution. Mandatory if net income ≥ 12×minimum wage. Base: 12 or 24×MW depending on income level.',
        category: 'contribution',
        rate: `${TAX.casRate * 100}%`,
        values: Array(12).fill(-monthlyCas),
        annual: -casDue,
        monthlyFormula: casDue === 0
          ? [
              { label: `Net income < 12×MW (${eur(12 * mwEur)})`, type: 'info' },
              { label: 'CAS not due', amount: eur(0), type: 'result' },
            ]
          : [
              { label: `Annual CAS ${eur(casDue)} ÷ 12`, type: 'base' },
              { label: 'Monthly CAS', amount: eur(monthlyCas), type: 'subtract' },
            ],
        annualFormula: casDue === 0
          ? [
              { label: `Net income ${eur(netIncomeEur)} < 12×MW (${eur(12 * mwEur)})`, type: 'info' },
              { label: 'CAS not due', amount: eur(0), type: 'result' },
            ]
          : [
              { label: `CAS rate: ${TAX.casRate * 100}%`, type: 'info' },
              { label: `Minimum wage: ${eur(mwEur)}/month`, type: 'info' },
              { label: `CAS base: ${netIncomeRon >= 24 * inputs.minimumWageRon ? '24' : '12'}×MW = ${eur(netIncomeRon >= 24 * inputs.minimumWageRon ? 24 * mwEur : 12 * mwEur)}`, type: 'base' },
              { label: `× ${TAX.casRate * 100}%`, type: 'base' },
              { label: 'Annual CAS', amount: eur(casDue), type: 'subtract' },
            ],
      },
      {
        label: 'CASS (health)',
        tooltip: inputs.cassMinBaseException
          ? 'CASS exempted — already insured through employment.'
          : 'Health insurance contribution. Base: net income capped at 72×MW. Min base: 6×MW unless exempted.',
        category: 'contribution',
        rate: inputs.cassMinBaseException ? 'exempt' : `${TAX.cassRate * 100}%`,
        values: Array(12).fill(-monthlyCass),
        annual: -cassDue,
        monthlyFormula: inputs.cassMinBaseException
          ? [{ label: 'Exempt — insured through employment', type: 'info' }]
          : cassDue === 0
            ? [{ label: 'Net income ≤ 0 → no CASS due', type: 'info' }]
            : [
                { label: `Annual CASS ${eur(cassDue)} ÷ 12`, type: 'base' },
                { label: 'Monthly CASS', amount: eur(monthlyCass), type: 'subtract' },
              ],
        annualFormula: inputs.cassMinBaseException
          ? [{ label: 'Exempt — already insured through employment', type: 'info' }]
          : cassDue === 0
            ? [{ label: 'Net income ≤ 0 → no CASS due', type: 'info' }]
            : (() => {
                const cassBaseEur = Math.min(Math.max(netIncomeEur, 6 * mwEur), TAX.cassCapMult2026 * mwEur);
                return [
                  { label: `CASS rate: ${TAX.cassRate * 100}%`, type: 'info' as const },
                  { label: `Min base: 6×MW = ${eur(6 * mwEur)}`, type: 'info' as const },
                  { label: `Cap: ${TAX.cassCapMult2026}×MW = ${eur(TAX.cassCapMult2026 * mwEur)}`, type: 'info' as const },
                  { label: `CASS base (clamped)`, amount: eur(cassBaseEur), type: 'base' as const },
                  { label: `× ${TAX.cassRate * 100}%`, type: 'base' as const },
                  { label: 'Annual CASS', amount: eur(cassDue), type: 'subtract' as const },
                ];
              })(),
      },
      {
        label: 'Income tax (PIT)',
        tooltip: 'Personal income tax on (net income − CAS − deductible CASS).',
        category: 'tax',
        rate: `${TAX.pitRate * 100}%`,
        values: Array(12).fill(-monthlyPit),
        annual: -pitDue,
        monthlyFormula: [
          { label: `Annual PIT ${eur(pitDue)} ÷ 12`, type: 'base' },
          { label: 'Monthly PIT', amount: eur(monthlyPit), type: 'subtract' },
        ],
        annualFormula: [
          { label: `PIT rate: ${TAX.pitRate * 100}%`, type: 'info' },
          { label: 'Net income', amount: eur(netIncomeEur), type: 'base' },
          { label: 'CAS deduction', amount: `−${eur(casDue)}`, type: 'subtract' },
          { label: `CASS deductible (min of CASS, net×${TAX.cassRate * 100}%)`, amount: `−${eur(cassDeductibleEur)}`, type: 'subtract' },
          { label: 'PIT taxable base', amount: eur(pitBaseEur), type: 'base' },
          { label: `× ${TAX.pitRate * 100}%`, type: 'base' },
          { label: 'Annual PIT', amount: eur(pitDue), type: 'subtract' },
        ],
      },
      {
        label: 'Net personal cash',
        tooltip: 'What you actually receive after all taxes and contributions.',
        category: 'result',
        values: Array(12).fill(monthlyNet),
        annual: annualNet,
        monthlyFormula: [
          { label: 'Monthly net income', amount: eur(monthlyNetIncome), type: 'base' },
          { label: 'CAS', amount: `−${eur(monthlyCas)}`, type: 'subtract' },
          { label: 'CASS', amount: `−${eur(monthlyCass)}`, type: 'subtract' },
          { label: 'PIT', amount: `−${eur(monthlyPit)}`, type: 'subtract' },
          { label: 'Monthly net personal cash', amount: eur(monthlyNet), type: 'result' },
        ],
        annualFormula: [
          { label: 'Annual net income', amount: eur(netIncomeEur), type: 'base' },
          { label: 'CAS', amount: `−${eur(casDue)}`, type: 'subtract' },
          { label: 'CASS', amount: `−${eur(cassDue)}`, type: 'subtract' },
          { label: 'PIT', amount: `−${eur(pitDue)}`, type: 'subtract' },
          { label: 'Annual net personal cash', amount: eur(annualNet), type: 'result' },
        ],
      },
    ],
  };

  const monthlyCashflow: MonthlyCashflow[] = MONTHS.map(month => ({
    month,
    totalPersonalCash: monthlyNet,
  }));

  return {
    structureType: inputs.structureType as 'PFA' | 'II' | 'IF',
    revenue,
    annualDeductibleExpenses,
    netIncome: netIncomeEur,
    casDue,
    cassDue,
    pitDue,
    totalTaxesContributions: totalTaxes,
    annualNetPersonalCash: annualNet,
    monthlyNetPersonalCash: annualNet / 12,
    effectiveTaxRate: revenue.annualTotalRevenue > 0 ? totalTaxes / revenue.annualTotalRevenue : 0,
    monthlyBreakdown: breakdown,
    monthlyCashflow,
  };
}

// ─── IF (family enterprise) ───

export function computeIf(inputs: SimulatorInputs): PfaIiResult {
  // For V1 simplification: model IF as single-member (100%) which equals PFA
  // The IF advantage only manifests with multiple members splitting income
  // We still compute it so users see the structure in comparison
  return { ...computePfaIi({ ...inputs, structureType: 'IF' }), structureType: 'IF' };
}

// ─── SRL salary computation ───

function computeSrlSalary(
  grossMonthly: number,
  fxEurToRon: number,
): SrlSalaryDetail {
  if (grossMonthly <= 0) {
    return {
      grossMonthly: 0,
      annualGross: 0,
      salCas: 0,
      salCass: 0,
      salPit: 0,
      netSalaryMonthly: 0,
      annualNetSalary: 0,
      employerCam: 0,
      totalCompanySalaryCost: 0,
    };
  }

  const grossRon = grossMonthly * fxEurToRon;
  const defaults = getDefaults();

  // Employee-side monthly
  const salCasRon = grossRon * TAX.casRate;
  const salCassRon = grossRon * TAX.cassRate;
  const salaryTaxableRon = grossRon - salCasRon - salCassRon;
  const salPitRon = Math.max(0, salaryTaxableRon) * TAX.pitRate;

  // Employer-side monthly
  const employerCamRon = grossRon * defaults.cam_rate;

  const netSalaryRon = grossRon - salCasRon - salCassRon - salPitRon;
  const companySalaryCostRon = grossRon + employerCamRon;

  // Convert to EUR
  return {
    grossMonthly,
    annualGross: grossMonthly * 12,
    salCas: (salCasRon * 12) / fxEurToRon,
    salCass: (salCassRon * 12) / fxEurToRon,
    salPit: (salPitRon * 12) / fxEurToRon,
    netSalaryMonthly: netSalaryRon / fxEurToRon,
    annualNetSalary: (netSalaryRon * 12) / fxEurToRon,
    employerCam: (employerCamRon * 12) / fxEurToRon,
    totalCompanySalaryCost: (companySalaryCostRon * 12) / fxEurToRon,
  };
}

// ─── CASS on dividends ───

function computeCassDividends(dividendGrossEur: number, minWage: number, fxEurToRon: number): number {
  const incomeRon = dividendGrossEur * fxEurToRon;
  const mw6 = 6 * minWage;
  const mw12 = 12 * minWage;
  const mw24 = 24 * minWage;

  let base: number;
  if (incomeRon < mw6) {
    return 0;
  } else if (incomeRon < mw12) {
    base = mw6;
  } else if (incomeRon < mw24) {
    base = mw12;
  } else {
    base = mw24;
  }

  const cassRon = base * TAX.cassRate;
  return cassRon / fxEurToRon;
}

// ─── SRL engine ───

export function computeSrl(inputs: SimulatorInputs): SrlResult {
  const revenue = computeRevenue(inputs);
  const annualOperatingExpenses = computeExpenses(inputs, revenue.annualTotalRevenue);

  // Determine gross salary
  let ownerGrossSalary = 0;
  if (inputs.salaryStrategy === 'minimum_salary') {
    ownerGrossSalary = inputs.minimumWageRon / inputs.fxEurToRon;
  } else if (inputs.salaryStrategy === 'custom_salary') {
    ownerGrossSalary = inputs.ownerGrossSalaryMonthly;
  }

  const salary = computeSrlSalary(ownerGrossSalary, inputs.fxEurToRon);

  // Company tax
  let companyTax: number;
  let companyTaxLabel: string;
  const regime = inputs.srlRegime;
  const isMicro = regime === 'micro' || regime === 'micro_3';
  const effectiveMicroRate = regime === 'micro_3' ? TAX.microRate3Pct : TAX.microRate;

  if (isMicro) {
    companyTax = revenue.annualTotalRevenue * effectiveMicroRate;
    companyTaxLabel = `Micro tax (${effectiveMicroRate * 100}%)`;
  } else {
    const profitBeforeTax = revenue.annualTotalRevenue - annualOperatingExpenses - salary.totalCompanySalaryCost;
    companyTax = Math.max(0, profitBeforeTax) * TAX.citRate;
    companyTaxLabel = `Profit tax (${TAX.citRate * 100}%)`;
  }

  // Company cash after operations
  const companyCashAfterOps = revenue.annualTotalRevenue - annualOperatingExpenses - salary.totalCompanySalaryCost - companyTax;

  // Retained cash and dividends
  const dividendTiming = inputs.dividendTiming;
  const retainedTarget = companyCashAfterOps * (inputs.retainedProfitPct / 100);

  let dividendGross = 0;
  if (dividendTiming !== 'none') {
    dividendGross = Math.max(0, companyCashAfterOps - retainedTarget);
  }

  const dividendWithholding = dividendGross * TAX.dividendRate;
  const dividendNetPaid = dividendGross - dividendWithholding;

  // CASS on dividends
  const cassDividendsDue = computeCassDividends(
    dividendGross,
    inputs.minimumWageRon,
    inputs.fxEurToRon,
  );

  const annualNetPersonalCash = salary.annualNetSalary + dividendNetPaid - cassDividendsDue;
  const retainedCompanyCash = dividendTiming === 'none' ? companyCashAfterOps : retainedTarget;

  const totalTaxes = companyTax
    + salary.salCas + salary.salCass + salary.salPit + salary.employerCam
    + dividendWithholding + cassDividendsDue;

  // Build monthly breakdown and cashflow
  const monthlyRev = revenue.annualTotalRevenue / 12;
  const monthlyExp = annualOperatingExpenses / 12;
  const monthlyCompanyTax = companyTax / 12;
  const monthlyNetSalary = salary.netSalaryMonthly;

  // Dividend distribution months
  const dividendNetMonthly = Array(12).fill(0);
  const dividendTaxMonthly = Array(12).fill(0);
  const retainedMonthly = Array(12).fill(0);
  const cassOnDivMonthly = Array(12).fill(0);

  if (dividendTiming === 'quarterly' && dividendGross > 0) {
    const quarterlyNet = dividendNetPaid / 4;
    const quarterlyTax = dividendWithholding / 4;
    const quarterlyCass = cassDividendsDue / 4;
    [2, 5, 8, 11].forEach(m => {
      dividendNetMonthly[m] = quarterlyNet;
      dividendTaxMonthly[m] = -quarterlyTax;
      cassOnDivMonthly[m] = -quarterlyCass;
    });
    const quarterlyRetained = retainedTarget / 4;
    [2, 5, 8, 11].forEach(m => {
      retainedMonthly[m] = quarterlyRetained;
    });
  } else if (dividendTiming === 'annual' && dividendGross > 0) {
    dividendNetMonthly[11] = dividendNetPaid;
    dividendTaxMonthly[11] = -dividendWithholding;
    cassOnDivMonthly[11] = -cassDividendsDue;
    retainedMonthly[11] = retainedTarget;
  } else {
    for (let m = 0; m < 12; m++) {
      retainedMonthly[m] = retainedCompanyCash / 12;
    }
  }

  const defaults = getDefaults();

  // Intermediate values for SRL
  const revenueAfterExpenses = revenue.annualTotalRevenue - annualOperatingExpenses;
  const companyCashAfterTax = revenueAfterExpenses - companyTax;
  const grossSalaryAnnual = salary.annualGross;
  const employerCamAnnual = salary.employerCam;

  const mwEurSrl = inputs.minimumWageRon / inputs.fxEurToRon;
  const netDividendsReceived = dividendNetPaid - cassDividendsDue;

  const breakdownRows: MonthlyBreakdownRow[] = [
    // ── Section: Company Flow ──
    {
      label: 'Company Flow',
      category: 'section-header',
      values: Array(12).fill(0),
      annual: 0,
    },
    {
      label: 'Gross revenue',
      tooltip: 'Total company income before any deductions.',
      category: 'revenue',
      values: Array(12).fill(monthlyRev),
      annual: revenue.annualTotalRevenue,
      monthlyFormula: [
        { label: `Annual revenue ${eur(revenue.annualTotalRevenue)} ÷ 12`, type: 'base' },
        { label: 'Monthly gross', amount: eur(monthlyRev), type: 'result' },
      ],
      annualFormula: [
        { label: `Service: ${inputs.dailyRateEur} €/day × ${inputs.billableDaysPerMonth} days × 12`, amount: eur(revenue.annualServiceRevenue), type: 'base' },
        ...(inputs.annualAppIncomeEur > 0 ? [{ label: 'App income', amount: eur(inputs.annualAppIncomeEur), type: 'add' as const }] : []),
        ...(inputs.annualOtherIncomeEur > 0 ? [{ label: 'Other income', amount: eur(inputs.annualOtherIncomeEur), type: 'add' as const }] : []),
        { label: 'Annual gross revenue', amount: eur(revenue.annualTotalRevenue), type: 'result' },
      ],
    },
    {
      label: 'Operating expenses',
      tooltip: 'Deductible business costs (accountant, tools, subscriptions, etc.) that reduce taxable income.',
      category: 'expense',
      values: Array(12).fill(-monthlyExp),
      annual: -annualOperatingExpenses,
      monthlyFormula: [
        { label: `Annual expenses ${eur(annualOperatingExpenses)} ÷ 12`, type: 'base' },
        { label: 'Monthly expenses', amount: eur(monthlyExp), type: 'subtract' },
      ],
      annualFormula: inputs.expenseMode === 'percent'
        ? [
            { label: `Revenue ${eur(revenue.annualTotalRevenue)} × ${(inputs.expensePct * 100).toFixed(0)}%`, type: 'base' },
            { label: 'Annual expenses', amount: eur(annualOperatingExpenses), type: 'subtract' },
          ]
        : [{ label: 'Fixed annual expenses', amount: eur(annualOperatingExpenses), type: 'subtract' }],
    },
    {
      label: 'Revenue after operating expenses',
      tooltip: 'Company income after deducting operating costs.',
      category: 'subtotal',
      values: Array(12).fill(revenueAfterExpenses / 12),
      annual: revenueAfterExpenses,
      monthlyFormula: [
        { label: 'Monthly revenue', amount: eur(monthlyRev), type: 'base' },
        { label: 'Monthly expenses', amount: `−${eur(monthlyExp)}`, type: 'subtract' },
        { label: 'Monthly after expenses', amount: eur(revenueAfterExpenses / 12), type: 'result' },
      ],
      annualFormula: [
        { label: 'Annual revenue', amount: eur(revenue.annualTotalRevenue), type: 'base' },
        { label: 'Annual expenses', amount: `−${eur(annualOperatingExpenses)}`, type: 'subtract' },
        { label: 'Revenue after expenses', amount: eur(revenueAfterExpenses), type: 'result' },
      ],
    },
    {
      label: companyTaxLabel,
      tooltip: isMicro
        ? 'Flat tax on total revenue. Applied regardless of expenses.'
        : 'Tax on net profit (revenue minus expenses minus salary costs).',
      category: 'tax',
      rate: isMicro ? `${effectiveMicroRate * 100}%` : `${TAX.citRate * 100}%`,
      values: Array(12).fill(-monthlyCompanyTax),
      annual: -companyTax,
      monthlyFormula: [
        { label: `Annual tax ${eur(companyTax)} ÷ 12`, type: 'base' },
        { label: 'Monthly tax', amount: eur(monthlyCompanyTax), type: 'subtract' },
      ],
      annualFormula: isMicro
        ? [
            { label: `Micro tax rate: ${effectiveMicroRate * 100}%`, type: 'info' },
            { label: `Revenue ${eur(revenue.annualTotalRevenue)} × ${effectiveMicroRate * 100}%`, type: 'base' },
            { label: 'Annual micro tax', amount: eur(companyTax), type: 'subtract' },
          ]
        : [
            { label: `CIT rate: ${TAX.citRate * 100}%`, type: 'info' },
            { label: 'Revenue', amount: eur(revenue.annualTotalRevenue), type: 'base' },
            { label: 'Operating expenses', amount: `−${eur(annualOperatingExpenses)}`, type: 'subtract' },
            { label: 'Salary cost', amount: `−${eur(salary.totalCompanySalaryCost)}`, type: 'subtract' },
            { label: 'Profit base', amount: eur(Math.max(0, revenue.annualTotalRevenue - annualOperatingExpenses - salary.totalCompanySalaryCost)), type: 'base' },
            { label: `× ${TAX.citRate * 100}%`, type: 'base' },
            { label: 'Annual profit tax', amount: eur(companyTax), type: 'subtract' },
          ],
    },
    {
      label: 'Company cash after tax',
      tooltip: 'Revenue after expenses and company tax, before salary payments.',
      category: 'subtotal',
      values: Array(12).fill(companyCashAfterTax / 12),
      annual: companyCashAfterTax,
      monthlyFormula: [
        { label: 'Monthly after expenses', amount: eur(revenueAfterExpenses / 12), type: 'base' },
        { label: 'Monthly tax', amount: `−${eur(monthlyCompanyTax)}`, type: 'subtract' },
        { label: 'Monthly after tax', amount: eur(companyCashAfterTax / 12), type: 'result' },
      ],
      annualFormula: [
        { label: 'Revenue after expenses', amount: eur(revenueAfterExpenses), type: 'base' },
        { label: 'Company tax', amount: `−${eur(companyTax)}`, type: 'subtract' },
        { label: 'Company cash after tax', amount: eur(companyCashAfterTax), type: 'result' },
      ],
    },
  ];

  if (salary.annualGross > 0) {
    breakdownRows.push(
      {
        label: 'Owner gross salary (company cost)',
        tooltip: 'Gross salary paid to owner, deducted from company cash.',
        category: 'expense',
        values: Array(12).fill(-salary.grossMonthly),
        annual: -grossSalaryAnnual,
        monthlyFormula: [
          { label: 'Monthly gross salary', amount: eur(salary.grossMonthly), type: 'subtract' },
        ],
        annualFormula: [
          { label: `${eur(salary.grossMonthly)}/month × 12`, type: 'base' },
          { label: 'Annual gross salary', amount: eur(grossSalaryAnnual), type: 'subtract' },
        ],
      },
      {
        label: 'Employer CAM (work insurance)',
        tooltip: 'Work insurance paid by company on gross salary.',
        category: 'contribution',
        rate: `${(defaults.cam_rate * 100).toFixed(2)}%`,
        values: Array(12).fill(-(salary.employerCam / 12)),
        annual: -employerCamAnnual,
        monthlyFormula: [
          { label: `CAM rate: ${(defaults.cam_rate * 100).toFixed(2)}%`, type: 'info' },
          { label: `Gross salary ${eur(salary.grossMonthly)} × ${(defaults.cam_rate * 100).toFixed(2)}%`, type: 'base' },
          { label: 'Monthly CAM', amount: eur(salary.employerCam / 12), type: 'subtract' },
        ],
        annualFormula: [
          { label: `CAM rate: ${(defaults.cam_rate * 100).toFixed(2)}%`, type: 'info' },
          { label: `Annual gross salary ${eur(grossSalaryAnnual)} × ${(defaults.cam_rate * 100).toFixed(2)}%`, type: 'base' },
          { label: 'Annual CAM', amount: eur(employerCamAnnual), type: 'subtract' },
        ],
      },
    );
  }

  breakdownRows.push({
    label: 'Company cash after all outflows',
    tooltip: 'Cash remaining in the company after expenses, tax, and salary costs. Available for dividends or retention.',
    category: 'subtotal',
    values: Array(12).fill(companyCashAfterOps / 12),
    annual: companyCashAfterOps,
    monthlyFormula: salary.annualGross > 0
      ? [
          { label: 'Monthly cash after tax', amount: eur(companyCashAfterTax / 12), type: 'base' },
          { label: 'Gross salary', amount: `−${eur(salary.grossMonthly)}`, type: 'subtract' },
          { label: 'Employer CAM', amount: `−${eur(salary.employerCam / 12)}`, type: 'subtract' },
          { label: 'Monthly cash after outflows', amount: eur(companyCashAfterOps / 12), type: 'result' },
        ]
      : [
          { label: 'Cash after tax (no salary)', amount: eur(companyCashAfterOps / 12), type: 'result' },
        ],
    annualFormula: salary.annualGross > 0
      ? [
          { label: 'Cash after tax', amount: eur(companyCashAfterTax), type: 'base' },
          { label: 'Gross salary', amount: `−${eur(grossSalaryAnnual)}`, type: 'subtract' },
          { label: 'Employer CAM', amount: `−${eur(employerCamAnnual)}`, type: 'subtract' },
          { label: 'Company cash after outflows', amount: eur(companyCashAfterOps), type: 'result' },
        ]
      : [
          { label: 'Cash after tax (no salary)', amount: eur(companyCashAfterOps), type: 'result' },
        ],
  });

  if (dividendTiming !== 'none') {
    const quarterlyDiv = dividendGross / 4;
    breakdownRows.push(
      {
        label: `Dividends declared (${dividendTiming})`,
        tooltip: dividendTiming === 'quarterly'
          ? 'Gross dividends distributed quarterly (Mar, Jun, Sep, Dec).'
          : 'Gross dividends distributed as annual lump sum in December.',
        category: 'assumption',
        values: dividendTiming === 'quarterly'
          ? MONTHS.map((_, i) => [2, 5, 8, 11].includes(i) ? quarterlyDiv : 0)
          : MONTHS.map((_, i) => i === 11 ? dividendGross : 0),
        annual: dividendGross,
        monthlyFormula: dividendTiming === 'quarterly'
          ? [
              { label: `Annual dividends ${eur(dividendGross)} ÷ 4 quarters`, type: 'base' },
              { label: 'Quarterly dividend (Mar/Jun/Sep/Dec)', amount: eur(quarterlyDiv), type: 'result' },
            ]
          : [
              { label: 'Annual lump sum in December', amount: eur(dividendGross), type: 'result' },
            ],
        annualFormula: [
          { label: `Retained: ${inputs.retainedProfitPct}%`, type: 'info' },
          { label: 'Cash available', amount: eur(companyCashAfterOps), type: 'base' },
          { label: `Retained (${inputs.retainedProfitPct}%)`, amount: `−${eur(retainedCompanyCash)}`, type: 'subtract' },
          { label: 'Total dividends declared', amount: eur(dividendGross), type: 'result' },
        ],
      },
    );
  }

  breakdownRows.push({
    label: 'Retained company cash',
    tooltip: dividendTiming === 'none'
      ? 'All post-tax profit kept in the company.'
      : 'Portion of post-tax profit kept for reinvestment.',
    category: 'assumption',
    values: retainedMonthly,
    annual: retainedCompanyCash,
    monthlyFormula: dividendTiming === 'none'
      ? [{ label: 'All cash retained (no dividends)', amount: eur(retainedCompanyCash / 12), type: 'result' }]
      : dividendTiming === 'quarterly'
        ? [{ label: `Annual retained ${eur(retainedCompanyCash)} ÷ 4`, amount: eur(retainedCompanyCash / 4), type: 'result' }]
        : [{ label: 'Full retained in December', amount: eur(retainedCompanyCash), type: 'result' }],
    annualFormula: dividendTiming === 'none'
      ? [{ label: 'All company cash retained', amount: eur(retainedCompanyCash), type: 'result' }]
      : [
          { label: `Cash available ${eur(companyCashAfterOps)} × ${inputs.retainedProfitPct}%`, type: 'base' },
          { label: 'Annual retained', amount: eur(retainedCompanyCash), type: 'result' },
        ],
  });

  // ── Section: Salary Flow (Owner) ──
  if (salary.annualGross > 0) {
    const salCasMonthly = salary.salCas / 12;
    const salCassMonthly = salary.salCass / 12;
    const salPitMonthly = salary.salPit / 12;

    breakdownRows.push(
      {
        label: 'Salary Flow (Owner)',
        category: 'section-header',
        values: Array(12).fill(0),
        annual: 0,
      },
      {
        label: 'Gross owner salary',
        tooltip: 'Monthly gross salary before employee-side deductions.',
        category: 'revenue',
        values: Array(12).fill(salary.grossMonthly),
        annual: grossSalaryAnnual,
        monthlyFormula: [
          { label: 'Monthly gross salary', amount: eur(salary.grossMonthly), type: 'base' },
        ],
        annualFormula: [
          { label: `${eur(salary.grossMonthly)}/month × 12`, type: 'base' },
          { label: 'Annual gross salary', amount: eur(grossSalaryAnnual), type: 'result' },
        ],
      },
      {
        label: 'Salary CAS (pension)',
        tooltip: 'Pension contribution withheld from salary.',
        category: 'contribution',
        rate: `${TAX.casRate * 100}%`,
        values: Array(12).fill(-salCasMonthly),
        annual: -salary.salCas,
        monthlyFormula: [
          { label: `CAS rate: ${TAX.casRate * 100}%`, type: 'info' },
          { label: `Gross salary ${eur(salary.grossMonthly)} × ${TAX.casRate * 100}%`, type: 'base' },
          { label: 'Monthly CAS', amount: eur(salCasMonthly), type: 'subtract' },
        ],
        annualFormula: [
          { label: `CAS rate: ${TAX.casRate * 100}%`, type: 'info' },
          { label: `Annual gross ${eur(grossSalaryAnnual)} × ${TAX.casRate * 100}%`, type: 'base' },
          { label: 'Annual CAS', amount: eur(salary.salCas), type: 'subtract' },
        ],
      },
      {
        label: 'Salary CASS (health)',
        tooltip: 'Health insurance withheld from salary.',
        category: 'contribution',
        rate: `${TAX.cassRate * 100}%`,
        values: Array(12).fill(-salCassMonthly),
        annual: -salary.salCass,
        monthlyFormula: [
          { label: `CASS rate: ${TAX.cassRate * 100}%`, type: 'info' },
          { label: `Gross salary ${eur(salary.grossMonthly)} × ${TAX.cassRate * 100}%`, type: 'base' },
          { label: 'Monthly CASS', amount: eur(salCassMonthly), type: 'subtract' },
        ],
        annualFormula: [
          { label: `CASS rate: ${TAX.cassRate * 100}%`, type: 'info' },
          { label: `Annual gross ${eur(grossSalaryAnnual)} × ${TAX.cassRate * 100}%`, type: 'base' },
          { label: 'Annual CASS', amount: eur(salary.salCass), type: 'subtract' },
        ],
      },
      {
        label: 'Salary income tax (PIT)',
        tooltip: 'Personal income tax withheld from salary: (gross − CAS − CASS) × PIT rate.',
        category: 'tax',
        rate: `${TAX.pitRate * 100}%`,
        values: Array(12).fill(-salPitMonthly),
        annual: -salary.salPit,
        monthlyFormula: [
          { label: `PIT rate: ${TAX.pitRate * 100}%`, type: 'info' },
          { label: 'Gross salary', amount: eur(salary.grossMonthly), type: 'base' },
          { label: 'CAS', amount: `−${eur(salCasMonthly)}`, type: 'subtract' },
          { label: 'CASS', amount: `−${eur(salCassMonthly)}`, type: 'subtract' },
          { label: 'Taxable base', amount: eur(salary.grossMonthly - salCasMonthly - salCassMonthly), type: 'base' },
          { label: `× ${TAX.pitRate * 100}%`, type: 'base' },
          { label: 'Monthly PIT', amount: eur(salPitMonthly), type: 'subtract' },
        ],
        annualFormula: [
          { label: `PIT rate: ${TAX.pitRate * 100}%`, type: 'info' },
          { label: 'Annual gross', amount: eur(grossSalaryAnnual), type: 'base' },
          { label: 'CAS', amount: `−${eur(salary.salCas)}`, type: 'subtract' },
          { label: 'CASS', amount: `−${eur(salary.salCass)}`, type: 'subtract' },
          { label: 'Taxable base', amount: eur(grossSalaryAnnual - salary.salCas - salary.salCass), type: 'base' },
          { label: `× ${TAX.pitRate * 100}%`, type: 'base' },
          { label: 'Annual PIT', amount: eur(salary.salPit), type: 'subtract' },
        ],
      },
      {
        label: 'Net salary received',
        tooltip: 'Monthly take-home salary after CAS, CASS, and PIT.',
        category: 'subtotal',
        values: Array(12).fill(monthlyNetSalary),
        annual: salary.annualNetSalary,
        monthlyFormula: [
          { label: 'Gross salary', amount: eur(salary.grossMonthly), type: 'base' },
          { label: 'CAS', amount: `−${eur(salCasMonthly)}`, type: 'subtract' },
          { label: 'CASS', amount: `−${eur(salCassMonthly)}`, type: 'subtract' },
          { label: 'PIT', amount: `−${eur(salPitMonthly)}`, type: 'subtract' },
          { label: 'Net salary received', amount: eur(monthlyNetSalary), type: 'result' },
        ],
        annualFormula: [
          { label: 'Annual gross', amount: eur(grossSalaryAnnual), type: 'base' },
          { label: 'CAS', amount: `−${eur(salary.salCas)}`, type: 'subtract' },
          { label: 'CASS', amount: `−${eur(salary.salCass)}`, type: 'subtract' },
          { label: 'PIT', amount: `−${eur(salary.salPit)}`, type: 'subtract' },
          { label: 'Annual net salary', amount: eur(salary.annualNetSalary), type: 'result' },
        ],
      },
    );
  }

  // ── Section: Dividend Flow (Owner) ──
  if (dividendTiming !== 'none' && dividendGross > 0) {
    const quarterlyGross = dividendGross / 4;
    const quarterlyWithholding = dividendWithholding / 4;
    const quarterlyCassDue = cassDividendsDue / 4;
    const quarterlyNet = (dividendNetPaid - cassDividendsDue) / 4;

    breakdownRows.push(
      {
        label: 'Dividend Flow (Owner)',
        category: 'section-header',
        values: Array(12).fill(0),
        annual: 0,
      },
      {
        label: 'Gross dividends',
        tooltip: dividendTiming === 'quarterly'
          ? 'Gross dividends distributed quarterly (Mar, Jun, Sep, Dec).'
          : 'Gross dividends distributed annually in December.',
        category: 'revenue',
        values: dividendTiming === 'quarterly'
          ? MONTHS.map((_, i) => [2, 5, 8, 11].includes(i) ? quarterlyGross : 0)
          : MONTHS.map((_, i) => i === 11 ? dividendGross : 0),
        annual: dividendGross,
        monthlyFormula: dividendTiming === 'quarterly'
          ? [
              { label: `Annual dividends ${eur(dividendGross)} ÷ 4`, type: 'base' },
              { label: 'Quarterly gross', amount: eur(quarterlyGross), type: 'result' },
            ]
          : [
              { label: 'Annual lump sum in December', amount: eur(dividendGross), type: 'result' },
            ],
        annualFormula: [
          { label: 'Total gross dividends', amount: eur(dividendGross), type: 'result' },
        ],
      },
      {
        label: 'Dividend tax',
        tooltip: 'Withholding tax deducted at distribution.',
        category: 'tax',
        rate: `${TAX.dividendRate * 100}%`,
        values: dividendTaxMonthly,
        annual: -dividendWithholding,
        monthlyFormula: dividendTiming === 'quarterly'
          ? [
              { label: `Dividend tax rate: ${TAX.dividendRate * 100}%`, type: 'info' },
              { label: `Quarterly gross ${eur(quarterlyGross)} × ${TAX.dividendRate * 100}%`, type: 'base' },
              { label: 'Quarterly tax', amount: eur(quarterlyWithholding), type: 'subtract' },
            ]
          : [
              { label: `Dividend tax rate: ${TAX.dividendRate * 100}%`, type: 'info' },
              { label: `Gross ${eur(dividendGross)} × ${TAX.dividendRate * 100}%`, type: 'base' },
              { label: 'Annual tax', amount: eur(dividendWithholding), type: 'subtract' },
            ],
        annualFormula: [
          { label: `Dividend tax rate: ${TAX.dividendRate * 100}%`, type: 'info' },
          { label: `Gross ${eur(dividendGross)} × ${TAX.dividendRate * 100}%`, type: 'base' },
          { label: 'Annual dividend tax', amount: eur(dividendWithholding), type: 'subtract' },
        ],
      },
    );

    if (cassDividendsDue > 0) {
      const mw6 = 6 * mwEurSrl;
      const mw12 = 12 * mwEurSrl;
      const mw24 = 24 * mwEurSrl;
      const incEur = dividendGross;
      let bracketLabel: string;
      if (incEur < mw12) bracketLabel = `6×MW = ${eur(mw6)}`;
      else if (incEur < mw24) bracketLabel = `12×MW = ${eur(mw12)}`;
      else bracketLabel = `24×MW = ${eur(mw24)}`;

      breakdownRows.push({
        label: 'CASS on dividends',
        tooltip: 'Health insurance on dividend income. Tiered brackets: 6/12/24×minimum wage.',
        category: 'contribution',
        rate: `${TAX.cassRate * 100}%`,
        values: cassOnDivMonthly,
        annual: -cassDividendsDue,
        monthlyFormula: dividendTiming === 'quarterly'
          ? [
              { label: `Annual CASS ${eur(cassDividendsDue)} ÷ 4`, type: 'base' },
              { label: 'Quarterly CASS', amount: eur(quarterlyCassDue), type: 'subtract' },
            ]
          : [
              { label: `CASS rate: ${TAX.cassRate * 100}%`, type: 'info' },
              { label: `CASS base bracket: ${bracketLabel}`, type: 'info' },
              { label: 'Annual CASS', amount: eur(cassDividendsDue), type: 'subtract' },
            ],
        annualFormula: [
          { label: `CASS rate: ${TAX.cassRate * 100}%`, type: 'info' },
          { label: `Minimum wage: ${eur(mwEurSrl)}/month`, type: 'info' },
          { label: `CASS base bracket: ${bracketLabel}`, type: 'info' },
          { label: 'Annual CASS on dividends', amount: eur(cassDividendsDue), type: 'subtract' },
        ],
      });
    }

    breakdownRows.push({
      label: 'Net dividends received',
      tooltip: 'Dividends after withholding tax and CASS.',
      category: 'subtotal',
      values: MONTHS.map((_, i) => dividendNetMonthly[i] + cassOnDivMonthly[i]),
      annual: netDividendsReceived,
      monthlyFormula: dividendTiming === 'quarterly'
        ? [
            { label: 'Quarterly gross', amount: eur(quarterlyGross), type: 'base' },
            { label: 'Dividend tax', amount: `−${eur(quarterlyWithholding)}`, type: 'subtract' },
            ...(cassDividendsDue > 0 ? [{ label: 'CASS', amount: `−${eur(quarterlyCassDue)}`, type: 'subtract' as const }] : []),
            { label: 'Quarterly net dividends', amount: eur(quarterlyNet), type: 'result' },
          ]
        : [
            { label: 'Gross dividends', amount: eur(dividendGross), type: 'base' },
            { label: 'Dividend tax', amount: `−${eur(dividendWithholding)}`, type: 'subtract' },
            ...(cassDividendsDue > 0 ? [{ label: 'CASS', amount: `−${eur(cassDividendsDue)}`, type: 'subtract' as const }] : []),
            { label: 'Net dividends', amount: eur(netDividendsReceived), type: 'result' },
          ],
      annualFormula: [
        { label: 'Gross dividends', amount: eur(dividendGross), type: 'base' },
        { label: 'Dividend tax', amount: `−${eur(dividendWithholding)}`, type: 'subtract' },
        ...(cassDividendsDue > 0 ? [{ label: 'CASS on dividends', amount: `−${eur(cassDividendsDue)}`, type: 'subtract' as const }] : []),
        { label: 'Annual net dividends', amount: eur(netDividendsReceived), type: 'result' },
      ],
    });
  }

  // ── Section: Personal Total ──
  breakdownRows.push(
    {
      label: 'Personal Total',
      category: 'section-header',
      values: Array(12).fill(0),
      annual: 0,
    },
    {
      label: 'Net personal cash',
      tooltip: 'Total cash you personally receive: net salary + net dividends after all taxes.',
      category: 'result',
      values: MONTHS.map((_, i) => monthlyNetSalary + dividendNetMonthly[i] + cassOnDivMonthly[i]),
      annual: annualNetPersonalCash,
      monthlyFormula: [
        ...(salary.annualGross > 0 ? [{ label: 'Net salary', amount: eur(monthlyNetSalary), type: 'base' as const }] : []),
        ...(dividendTiming !== 'none' && dividendGross > 0 && dividendTiming === 'quarterly'
          ? [{ label: 'Net dividends (quarter months)', amount: eur((dividendNetPaid - cassDividendsDue) / 4), type: 'add' as const }]
          : []),
        { label: 'Monthly personal cash (varies by month)', amount: eur(annualNetPersonalCash / 12) + ' avg', type: 'result' },
      ],
      annualFormula: [
        ...(salary.annualGross > 0 ? [{ label: 'Annual net salary', amount: eur(salary.annualNetSalary), type: 'base' as const }] : []),
        ...(dividendTiming !== 'none' && dividendGross > 0
          ? [{ label: 'Net dividends', amount: eur(netDividendsReceived), type: 'add' as const }]
          : []),
        { label: 'Annual net personal cash', amount: eur(annualNetPersonalCash), type: 'result' },
      ],
    },
  );

  const monthlyCashflow: MonthlyCashflow[] = MONTHS.map((month, i) => ({
    month,
    totalPersonalCash: monthlyNetSalary + dividendNetMonthly[i] + cassOnDivMonthly[i],
    salaryCash: monthlyNetSalary,
    dividendCash: dividendNetMonthly[i] + cassOnDivMonthly[i],
    retainedCompanyCash: retainedMonthly[i],
  }));

  return {
    structureType: 'SRL',
    regime,
    revenue,
    annualOperatingExpenses,
    companyTax,
    companyTaxLabel,
    salary,
    companyCashAfterOps,
    dividendGross,
    dividendWithholding,
    dividendNetPaid,
    cassDividendsDue,
    retainedCompanyCash,
    annualNetPersonalCash,
    monthlyNetPersonalCash: annualNetPersonalCash / 12,
    totalTaxesContributions: totalTaxes,
    effectiveTaxRate: revenue.annualTotalRevenue > 0 ? totalTaxes / revenue.annualTotalRevenue : 0,
    dividendTiming,
    monthlyBreakdown: { rows: breakdownRows },
    monthlyCashflow,
  };
}

// ─── Main dispatch ───

export function simulate(inputs: SimulatorInputs): SimulationResult {
  switch (inputs.structureType) {
    case 'PFA':
    case 'II':
      return computePfaIi(inputs);
    case 'IF':
      return computeIf(inputs);
    case 'SRL':
      return computeSrl(inputs);
  }
}

export function simulateAll(baseInputs: SimulatorInputs): SimulationResult[] {
  // PFA and II use the same tax engine — merge into one "PFA / II" result.
  // IF is not meaningful for solo mode — excluded from default comparison.
  const pfaIi = computePfaIi({ ...baseInputs, structureType: 'PFA' });
  const srl = computeSrl({ ...baseInputs, structureType: 'SRL' });
  return [pfaIi, srl];
}
