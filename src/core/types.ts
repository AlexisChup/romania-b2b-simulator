export type StructureType = 'PFA' | 'II' | 'IF' | 'SRL';
export type SrlRegime = 'micro' | 'profit_tax';
export type ExpenseMode = 'percent' | 'fixed';
export type SalaryStrategy = 'no_salary' | 'minimum_salary' | 'custom_salary';
export type DividendTiming = 'quarterly' | 'annual' | 'none';

export interface SimulatorInputs {
  structureType: StructureType;
  dailyRateEur: number;
  billableDaysPerMonth: number;
  annualAppIncomeEur: number;
  annualOtherIncomeEur: number;
  expenseMode: ExpenseMode;
  expensePct: number;
  annualFixedExpensesEur: number;
  taxYear: number;
  minimumWageRon: number;
  fxEurToRon: number;
  fxClosePrevYearEurToRon: number;
  // SRL-specific
  srlRegime: SrlRegime;
  salaryStrategy: SalaryStrategy;
  ownerGrossSalaryMonthly: number;
  retainedProfitPct: number;
  dividendTiming: DividendTiming;
  // IF-specific
  ifMemberCount: number;
  ifMemberShares: number[];
  // Advanced
  cassMinBaseException: boolean;
}

export interface RevenueBreakdown {
  annualServiceRevenue: number;
  annualAppIncome: number;
  annualOtherIncome: number;
  annualTotalRevenue: number;
  monthlyGrossRevenue: number;
}

export interface PfaIiResult {
  structureType: 'PFA' | 'II' | 'IF';
  revenue: RevenueBreakdown;
  annualDeductibleExpenses: number;
  netIncome: number;
  casDue: number;
  cassDue: number;
  pitDue: number;
  totalTaxesContributions: number;
  annualNetPersonalCash: number;
  monthlyNetPersonalCash: number;
  effectiveTaxRate: number;
  monthlyBreakdown: MonthlyBreakdown;
  monthlyCashflow: MonthlyCashflow[];
}

export interface SrlSalaryDetail {
  grossMonthly: number;
  annualGross: number;
  salCas: number;
  salCass: number;
  salPit: number;
  netSalaryMonthly: number;
  annualNetSalary: number;
  employerCam: number;
  totalCompanySalaryCost: number;
}

export interface SrlResult {
  structureType: 'SRL';
  regime: SrlRegime;
  revenue: RevenueBreakdown;
  annualOperatingExpenses: number;
  companyTax: number;
  companyTaxLabel: string;
  salary: SrlSalaryDetail;
  companyCashAfterOps: number;
  dividendGross: number;
  dividendWithholding: number;
  dividendNetPaid: number;
  cassDividendsDue: number;
  retainedCompanyCash: number;
  annualNetPersonalCash: number;
  monthlyNetPersonalCash: number;
  totalTaxesContributions: number;
  effectiveTaxRate: number;
  dividendTiming: DividendTiming;
  monthlyBreakdown: MonthlyBreakdown;
  monthlyCashflow: MonthlyCashflow[];
}

export type FormulaStepType = 'base' | 'add' | 'subtract' | 'result' | 'info';

export interface FormulaStep {
  label: string;
  amount?: string;
  type: FormulaStepType;
}

export interface MonthlyBreakdownRow {
  label: string;
  tooltip?: string;
  category: 'revenue' | 'expense' | 'tax' | 'contribution' | 'result' | 'assumption' | 'subtotal' | 'section-header';
  rate?: string;
  values: number[]; // 12 months
  annual: number;
  formulaDetails?: string;
  monthlyFormula?: FormulaStep[];
  annualFormula?: FormulaStep[];
}

export interface MonthlyBreakdown {
  rows: MonthlyBreakdownRow[];
}

export interface MonthlyCashflow {
  month: string;
  totalPersonalCash: number;
  salaryCash?: number;
  dividendCash?: number;
  retainedCompanyCash?: number;
}

export type SimulationResult = PfaIiResult | SrlResult;

export interface ComparisonResult {
  results: SimulationResult[];
  bestPersonalNet: StructureType;
  bestEffectiveRate: StructureType;
  bestRetainedCash: StructureType | null;
  simplest: StructureType;
  bestVsWorstAnnual: number;
  bestVsWorstMonthly: number;
  worstPersonalNet: StructureType;
}

export type WarningSeverity = 'high' | 'medium' | 'low' | 'info';

export interface Warning {
  id: string;
  severity: WarningSeverity;
  title: string;
  message: string;
  appliesTo: StructureType[];
}

export interface Recommendation {
  label: string;
  structureType: StructureType;
  reason: string;
}

export interface ConstantEntry {
  id: string;
  label: string;
  description: string;
  value: number | boolean | number[] | string;
  unit: string;
  appliesTo: string[];
  condition: string;
  validityStart: string | null;
  validityEnd: string | null;
  sourceUrl: string | null;
  sourceType: string;
  confidence: string;
  notes?: string;
}

export interface ConstantsData {
  meta: {
    country: string;
    tax_year: number;
    currency_base: string;
    last_verified_at: string;
    assumptions: Record<string, boolean>;
  };
  constants: ConstantEntry[];
  defaults: {
    tax_year: number;
    minimum_wage_gross_monthly_ron: number;
    fx_eur_to_ron: number;
    fx_close_prev_year_eur_to_ron: number;
    billable_days_per_month: number;
    expense_pct: number;
    cam_rate: number;
  };
}

export interface StructureInfo {
  id: StructureType;
  name: string;
  fullName: string;
  legalNature: string;
  soloEligible: boolean;
  maxCaenClasses: number | null;
  maxEmployees: number | null;
  canHireEmployees: boolean;
  multipleClients: boolean;
  liabilityType: string;
  liabilityDescription: string;
  bookkeeping: string;
  taxLogic: string;
  adminComplexity: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  unsuitableWhen: string;
  forcedChangeTriggersDescription: string;
}
