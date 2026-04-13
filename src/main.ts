import './styles/main.css';
import type { SimulatorInputs, ExpenseMode, SalaryStrategy, SrlRegime, DividendTiming } from './core/types';
import { simulateAll } from './core/formulaEngine';
import { generateWarnings } from './core/warnings';
import { generateRecommendations } from './core/recommendationEngine';
import { compareResults } from './core/comparators';
import { renderComparisonCards, renderRecommendations, renderWarnings, renderScenarioSummary, renderBestScenario, initInfoPopupPortalOnce } from './components/resultsPanel';
import { renderMonthlyChart } from './components/monthlyChart';
import { renderConstantsTable } from './components/constantsPanel';
import { getDefaults } from './core/constants';

// ─── DOM references ───

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const dailyRateEl = $<HTMLInputElement>('dailyRate');
const billableDaysEl = $<HTMLInputElement>('billableDays');
const otherIncomeEl = $<HTMLInputElement>('otherIncome');
const expenseModeEl = $<HTMLSelectElement>('expenseMode');
const expenseValueEl = $<HTMLInputElement>('expenseValue');
const expenseValueLabelEl = $<HTMLElement>('expenseValueLabel');
const expenseHintEl = $<HTMLSpanElement>('expenseHint');
const srlRegimeEl = $<HTMLSelectElement>('srlRegime');
const salaryStrategyEl = $<HTMLSelectElement>('salaryStrategy');
const grossSalaryEl = $<HTMLInputElement>('grossSalary');
const customSalaryGroupEl = $<HTMLDivElement>('customSalaryGroup');
const retainedProfitEl = $<HTMLInputElement>('retainedProfit');
const retainedProfitGroupEl = $<HTMLDivElement>('retainedProfitGroup');
const dividendTimingEl = $<HTMLSelectElement>('dividendTiming');
const taxYearEl = $<HTMLInputElement>('taxYear');
const minWageEl = $<HTMLInputElement>('minWage');
const fxRateEl = $<HTMLInputElement>('fxRate');
const fxClosePrevEl = $<HTMLInputElement>('fxClosePrev');
const fxHintEl = $<HTMLSpanElement>('fxHint');
const fetchFxBtn = $<HTMLButtonElement>('fetchFxBtn');
const cassExceptionEl = $<HTMLInputElement>('cassException');
const simulateBtn = $<HTMLButtonElement>('simulateBtn');

const billableDaysToggle = $<HTMLDivElement>('billableDaysToggle');
const billableDaysUnitEl = $<HTMLSpanElement>('billableDaysUnit');
const billableDaysHintEl = $<HTMLSpanElement>('billableDaysHint');
const otherIncomeToggle = $<HTMLDivElement>('otherIncomeToggle');
const otherIncomeUnitEl = $<HTMLSpanElement>('otherIncomeUnit');

const recommendationsSection = $('recommendationsSection');
const recommendationCards = $('recommendationCards');
const bestScenarioSection = $('bestScenarioSection');
const chartSection = $('chartSection');
const monthlyChartCanvas = $<HTMLCanvasElement>('monthlyChart');
const scenarioSummary = $('scenarioSummary');
const comparisonSection = $('comparisonSection');
const comparisonCards = $('comparisonCards');
const warningsSection = $('warningsSection');
const warningsList = $('warningsList');
const emptyState = $('emptyState');
const constantsTable = $('constantsTable');

// ─── Toggle state ───

let billableDaysMode: 'monthly' | 'yearly' = 'yearly';
let otherIncomeMode: 'monthly' | 'yearly' = 'monthly';

// ─── Initialize defaults ───

const defaults = getDefaults();
minWageEl.value = String(defaults.minimum_wage_gross_monthly_ron);
fxRateEl.value = String(defaults.fx_eur_to_ron);
fxClosePrevEl.value = String(defaults.fx_close_prev_year_eur_to_ron);

// ─── Segmented control helper ───

function initSegmentedControl(
  container: HTMLElement,
  onChange: (value: string) => void,
): void {
  const buttons = container.querySelectorAll<HTMLButtonElement>('.seg-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.value || 'monthly');
    });
  });
}

// ─── UI interactions ───

// Billable days toggle
initSegmentedControl(billableDaysToggle, (value) => {
  billableDaysMode = value as 'monthly' | 'yearly';
  if (value === 'monthly') {
    billableDaysUnitEl.textContent = '/ month';
    billableDaysHintEl.textContent = 'Working days you invoice each month';
    billableDaysEl.value = '18';
    billableDaysEl.max = '31';
    billableDaysEl.step = '1';
  } else {
    billableDaysUnitEl.textContent = '/ year';
    billableDaysHintEl.textContent = 'Total working days you invoice per year';
    billableDaysEl.value = '216';
    billableDaysEl.max = '366';
    billableDaysEl.step = '1';
  }
});

// Other income toggle
initSegmentedControl(otherIncomeToggle, (value) => {
  otherIncomeMode = value as 'monthly' | 'yearly';
  otherIncomeUnitEl.textContent = value === 'monthly' ? '/ month' : '/ year';
});

// Expense mode
expenseModeEl.addEventListener('change', () => {
  if (expenseModeEl.value === 'percent') {
    expenseValueLabelEl.textContent = 'Expense rate';
    expenseHintEl.textContent = '% of your total gross revenue — covers tools, accountant, subscriptions, etc.';
    expenseValueEl.value = '10';
    expenseValueEl.step = '1';
    expenseValueEl.max = '100';
  } else {
    expenseValueLabelEl.textContent = 'Annual expenses';
    expenseHintEl.textContent = 'Fixed total business costs per year in EUR';
    expenseValueEl.value = '5000';
    expenseValueEl.step = '500';
    expenseValueEl.max = '';
  }
});

// Salary strategy
salaryStrategyEl.addEventListener('change', () => {
  customSalaryGroupEl.style.display =
    salaryStrategyEl.value === 'custom_salary' ? 'block' : 'none';
});

// Dividend timing — hide retained % when "none"
dividendTimingEl.addEventListener('change', () => {
  retainedProfitGroupEl.style.display =
    dividendTimingEl.value === 'none' ? 'none' : 'block';
});

// FX fetch
async function fetchLiveEurRon(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://data-api.ecb.europa.eu/service/data/EXR/D.RON.EUR.SP00.A?lastNObservations=1&format=csvdata',
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;
    const header = lines[0].split(',');
    const valIdx = header.indexOf('OBS_VALUE');
    if (valIdx < 0) return null;
    const lastLine = lines[lines.length - 1].split(',');
    const rate = parseFloat(lastLine[valIdx]);
    return isNaN(rate) ? null : rate;
  } catch {
    return null;
  }
}

fetchFxBtn.addEventListener('click', async () => {
  fetchFxBtn.disabled = true;
  fetchFxBtn.querySelector('.btn-icon-label')!.textContent = '⏳';
  const rate = await fetchLiveEurRon();
  if (rate !== null) {
    fxRateEl.value = rate.toFixed(4);
    fxHintEl.textContent = `Live rate updated: ${rate.toFixed(4)} (ECB reference)`;
  } else {
    fxHintEl.textContent = 'Could not fetch live rate — using manual value';
  }
  fetchFxBtn.disabled = false;
  fetchFxBtn.querySelector('.btn-icon-label')!.textContent = '↻ Live';
});

// ─── Gather inputs ───

function gatherInputs(): SimulatorInputs {
  const expenseMode = expenseModeEl.value as ExpenseMode;
  const expenseValue = parseFloat(expenseValueEl.value) || 0;

  // Normalize billable days to monthly
  const rawBillableDays = parseInt(billableDaysEl.value) || 0;
  const billableDaysPerMonth = billableDaysMode === 'yearly'
    ? rawBillableDays / 12
    : rawBillableDays;

  // Normalize other income to annual
  const rawOtherIncome = parseFloat(otherIncomeEl.value) || 0;
  const annualOtherIncome = otherIncomeMode === 'monthly'
    ? rawOtherIncome * 12
    : rawOtherIncome;

  return {
    structureType: 'PFA', // will be overridden by simulateAll
    dailyRateEur: parseFloat(dailyRateEl.value) || 0,
    billableDaysPerMonth,
    annualAppIncomeEur: 0, // consolidated into otherIncome
    annualOtherIncomeEur: annualOtherIncome,
    expenseMode,
    expensePct: expenseMode === 'percent' ? expenseValue / 100 : 0,
    annualFixedExpensesEur: expenseMode === 'fixed' ? expenseValue : 0,
    taxYear: parseInt(taxYearEl.value) || 2026,
    minimumWageRon: parseFloat(minWageEl.value) || defaults.minimum_wage_gross_monthly_ron,
    fxEurToRon: parseFloat(fxRateEl.value) || defaults.fx_eur_to_ron,
    fxClosePrevYearEurToRon: parseFloat(fxClosePrevEl.value) || defaults.fx_close_prev_year_eur_to_ron,
    srlRegime: srlRegimeEl.value as SrlRegime,
    salaryStrategy: salaryStrategyEl.value as SalaryStrategy,
    ownerGrossSalaryMonthly: parseFloat(grossSalaryEl.value) || 0,
    retainedProfitPct: parseFloat(retainedProfitEl.value) || 0,
    dividendTiming: dividendTimingEl.value as DividendTiming,
    ifMemberCount: 1,
    ifMemberShares: [1.0],
    cassMinBaseException: cassExceptionEl.checked,
  };
}

// ─── Run simulation ───

function runSimulation(): void {
  const inputs = gatherInputs();
  const results = simulateAll(inputs);
  const warnings = generateWarnings(inputs, results);
  const comparison = compareResults(results);
  const recommendations = generateRecommendations(results, warnings);

  // Hide empty state, show sections
  emptyState.style.display = 'none';

  // Scenario summary (shared values)
  scenarioSummary.style.display = 'block';
  renderScenarioSummary(scenarioSummary, inputs, results);

  // Best scenario card
  const billableDaysPerYear = inputs.billableDaysPerMonth * 12;
  bestScenarioSection.style.display = 'block';
  renderBestScenario(bestScenarioSection, comparison, billableDaysPerYear);

  // Recommendations
  if (recommendations.length > 0) {
    recommendationsSection.style.display = 'block';
    renderRecommendations(recommendations, recommendationCards);
  }

  // Monthly chart
  chartSection.style.display = 'block';
  renderMonthlyChart(monthlyChartCanvas, results);

  // Comparison cards
  comparisonSection.style.display = 'block';
  renderComparisonCards(results, comparison, comparisonCards, inputs.fxEurToRon);

  // Warnings
  if (warnings.length > 0) {
    warningsSection.style.display = 'block';
    renderWarnings(warnings, warningsList);
  }
}

// ─── Event listeners ───

simulateBtn.addEventListener('click', runSimulation);

// Auto-simulate on Enter key in any input
document.querySelectorAll<HTMLInputElement>('.input-panel input, .input-panel select').forEach(el => {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSimulation();
  });
});

// ─── Constants table ───

renderConstantsTable(constantsTable);

// ─── Info popup portal for mobile ───

initInfoPopupPortalOnce();

