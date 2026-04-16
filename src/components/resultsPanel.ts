import type { SimulationResult, SimulatorInputs, PfaIiResult, SrlResult, Warning, Recommendation, ComparisonResult, MonthlyBreakdownRow, FormulaStep } from '../core/types';
import { formatEur, formatDual, formatPct, formatRon } from '../core/formatters';
import { glossaryLink } from '../core/glossary';

const MONTH_HEADERS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function tooltipHtml(text: string): string {
  return `<span class="info-trigger" tabindex="0">?<span class="info-popup">${text}</span></span>`;
}

// Known acronyms to link in breakdown labels
const LINKABLE_ACRONYMS = ['CAS', 'CASS', 'PIT', 'CAM', 'VAT', 'CAEN'];

function linkAcronyms(text: string): string {
  // Replace whole-word acronyms with glossary links (avoid double-linking)
  let result = text;
  for (const acr of LINKABLE_ACRONYMS) {
    const re = new RegExp(`\\b${acr}\\b(?![^<]*>)`, 'g');
    result = result.replace(re, glossaryLink(acr));
  }
  return result;
}

/** Display name for comparison cards — PFA shows as "PFA / II" since they share the same tax engine */
function displayName(structureType: string): string {
  if (structureType === 'PFA') return `${glossaryLink('PFA')} / ${glossaryLink('II')}`;
  return glossaryLink(structureType);
}

function displayNamePlain(structureType: string): string {
  if (structureType === 'PFA') return 'PFA / II';
  return structureType;
}

function categoryClass(cat: string): string {
  switch (cat) {
    case 'revenue': return 'bd-row-revenue';
    case 'expense': return 'bd-row-expense';
    case 'tax': return 'bd-row-tax';
    case 'contribution': return 'bd-row-contribution';
    case 'result': return 'bd-row-result';
    case 'assumption': return 'bd-row-assumption';
    case 'subtotal': return 'bd-row-subtotal';
    case 'section-header': return 'bd-row-section-header';
    default: return '';
  }
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function stepsToJson(steps: FormulaStep[] | undefined): string {
  if (!steps || steps.length === 0) return '';
  return escapeAttr(JSON.stringify(steps));
}

function renderBreakdownTable(rows: MonthlyBreakdownRow[], fxRate: number): string {
  const headerCells = MONTH_HEADERS.map(m => `<th>${m}</th>`).join('');
  const totalCols = 14; // label + 12 months + annual

  const bodyRows = rows.map(row => {
    // Section header row — spans all columns
    if (row.category === 'section-header') {
      return `<tr class="bd-row-section-header">
        <td colspan="${totalCols}" class="bd-section-label">${row.label}</td>
      </tr>`;
    }

    const isResult = row.category === 'result';
    const isSubtotal = row.category === 'subtotal';
    const rateTag = row.rate ? `<span class="bd-rate">${row.rate}</span>` : '';
    const tip = row.tooltip ? tooltipHtml(row.tooltip) : '';

    // Structured formula steps for monthly and annual cells
    const monthlyStepsAttr = row.monthlyFormula ? ` data-formula-steps="${stepsToJson(row.monthlyFormula)}"` : '';
    const annualStepsAttr = row.annualFormula ? ` data-formula-steps="${stepsToJson(row.annualFormula)}"` : '';

    // Fallback: legacy formulaDetails as plain text
    const fallbackAttr = (!row.monthlyFormula && row.formulaDetails) ? ` data-formula="${escapeAttr(row.formulaDetails)}"` : '';
    const fallbackAnnualAttr = (!row.annualFormula && row.formulaDetails) ? ` data-formula="${escapeAttr(row.formulaDetails)}"` : '';

    const showMonthlyRon = isResult || isSubtotal;

    const monthlyCells = row.values.map(v => {
      const absV = Math.abs(v);
      const display = v === 0 ? '<span class="bd-zero">—</span>' : `<span class="${v < 0 ? 'bd-neg' : ''}">${v < 0 ? '−' : ''}€${Math.round(absV).toLocaleString('en-US')}</span>`;
      const monthlyRon = (showMonthlyRon && v !== 0) ? `<br><span class="bd-ron-monthly">${formatRon(Math.abs(v) * fxRate)}</span>` : '';
      return `<td class="bd-cell-numeric"${monthlyStepsAttr || fallbackAttr}>${display}${monthlyRon}</td>`;
    }).join('');

    const absAnnual = Math.abs(row.annual);
    const annualDisplay = row.annual === 0
      ? '<span class="bd-zero">—</span>'
      : `<span class="${row.annual < 0 ? 'bd-neg' : ''}">${row.annual < 0 ? '−' : ''}€${Math.round(absAnnual).toLocaleString('en-US')}</span>`;
    const annualRon = `<span class="bd-ron">${formatRon(Math.abs(row.annual) * fxRate)}</span>`;

    return `<tr class="${categoryClass(row.category)}${isResult ? ' bd-row-highlight' : ''}${isSubtotal ? ' bd-row-subtotal-highlight' : ''}">
      <td class="bd-label">${linkAcronyms(row.label)} ${rateTag} ${tip}</td>
      ${monthlyCells}
      <td class="bd-annual bd-cell-numeric"${annualStepsAttr || fallbackAnnualAttr}>${annualDisplay}<br>${annualRon}</td>
    </tr>`;
  }).join('');

  return `
    <div class="breakdown-table-wrap">
      <table class="breakdown-table">
        <thead>
          <tr>
            <th class="bd-label-head">Item</th>
            ${headerCells}
            <th class="bd-annual-head">Annual</th>
          </tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
}

export function renderScenarioSummary(
  container: HTMLElement,
  inputs: SimulatorInputs,
  results: SimulationResult[],
): void {
  const rev = results[0]?.revenue;
  if (!rev) { container.innerHTML = ''; return; }

  const expenses = results[0].structureType === 'SRL'
    ? (results[0] as SrlResult).annualOperatingExpenses
    : (results[0] as PfaIiResult).annualDeductibleExpenses;

  container.innerHTML = `
    <div class="scenario-summary-card card">
      <h3 class="scenario-title">Scenario Summary</h3>
      <div class="scenario-grid">
        <div class="scenario-item">
          <span class="scenario-label">Gross annual revenue</span>
          <span class="scenario-value">${formatDual(rev.annualTotalRevenue, inputs.fxEurToRon)}</span>
        </div>
        <div class="scenario-item">
          <span class="scenario-label">Deductible expenses</span>
          <span class="scenario-value">${formatDual(expenses, inputs.fxEurToRon)}</span>
        </div>
        <div class="scenario-item">
          <span class="scenario-label">EUR → RON rate</span>
          <span class="scenario-value">${inputs.fxEurToRon.toFixed(4)}</span>
        </div>
        <div class="scenario-item">
          <span class="scenario-label">Tax year</span>
          <span class="scenario-value">${inputs.taxYear}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderBestScenario(
  container: HTMLElement,
  comparison: ComparisonResult,
  billableDaysPerYear: number,
): void {
  const best = comparison.results.find(r => r.structureType === comparison.bestPersonalNet);
  if (!best) { container.innerHTML = ''; return; }

  const worst = comparison.results.find(r => r.structureType === comparison.worstPersonalNet);
  const deltaMonthly = worst ? Math.round((best.annualNetPersonalCash - worst.annualNetPersonalCash) / 12) : 0;

  container.innerHTML = `
    <div class="best-scenario-card card">
      <div class="best-scenario-inner">
        <div class="best-scenario-main">
          <span class="best-scenario-label">Best current option</span>
          <span class="best-scenario-structure">${displayNamePlain(best.structureType)}</span>
        </div>
        <div class="best-scenario-stats">
          <div class="best-scenario-stat">
            <span class="best-scenario-stat-value">${formatEur(best.annualNetPersonalCash)}</span>
            <span class="best-scenario-stat-label">annual personal net</span>
          </div>
          <div class="best-scenario-stat">
            <span class="best-scenario-stat-value">${formatEur(best.monthlyNetPersonalCash)}</span>
            <span class="best-scenario-stat-label">per month</span>
          </div>
          ${billableDaysPerYear > 0 ? `
          <div class="best-scenario-stat">
            <span class="best-scenario-stat-value">${formatEur(Math.round(best.annualNetPersonalCash / billableDaysPerYear))}</span>
            <span class="best-scenario-stat-label">per billable day</span>
          </div>
          ` : ''}
          ${deltaMonthly > 0 ? `
          <div class="best-scenario-stat">
            <span class="best-scenario-stat-value best-scenario-delta">+${formatEur(deltaMonthly)}/mo</span>
            <span class="best-scenario-stat-label">vs ${displayNamePlain(comparison.worstPersonalNet)}</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

export function renderComparisonCards(
  results: SimulationResult[],
  comparison: ComparisonResult,
  container: HTMLElement,
  fxRate: number,
): void {
  container.innerHTML = '';

  for (const result of results) {
    const isBest = result.structureType === comparison.bestPersonalNet;
    const card = document.createElement('div');
    card.className = `result-card${isBest ? ' best' : ''}`;

    const badges: string[] = [];
    if (isBest) {
      badges.push(`<span class="result-badge badge-best">Best net</span>`);
      if (comparison.bestVsWorstMonthly > 0) {
        badges.push(`<span class="result-badge badge-delta">+${formatEur(comparison.bestVsWorstMonthly)}/mo vs ${displayNamePlain(comparison.worstPersonalNet)}</span>`);
      }
    }
    if (result.structureType === 'PFA') badges.push('<span class="result-badge badge-simple">Simplest</span>');
    if (result.structureType === comparison.bestEffectiveRate && result.structureType !== comparison.bestPersonalNet) {
      badges.push('<span class="result-badge badge-rate">Best rate</span>');
    }

    card.innerHTML = `
      <div class="result-card-header">
        <span class="result-structure-name">${displayName(result.structureType)}</span>
        <div class="result-badges">${badges.join(' ')}</div>
      </div>
      <div class="result-hero">
        <div class="result-hero-label">Annual net personal cash</div>
        <div class="result-hero-value">${formatEur(result.annualNetPersonalCash)}</div>
        <div class="result-hero-ron">${formatRon(result.annualNetPersonalCash * fxRate)}</div>
        <div class="result-hero-sub">${formatEur(result.monthlyNetPersonalCash)} / month</div>
      </div>
      <div class="result-rows">
        <div class="result-row subtotal"><span class="result-row-label">Total taxes &amp; contributions</span><span class="result-row-value">${formatDual(result.totalTaxesContributions, fxRate)}</span></div>
        <div class="result-row highlight-row"><span class="result-row-label">Effective tax rate</span><span class="result-row-value">${formatPct(result.effectiveTaxRate)}</span></div>
      </div>
      <details class="result-details breakdown-details">
        <summary>Detailed monthly breakdown</summary>
        ${renderBreakdownTable(result.monthlyBreakdown.rows, fxRate)}
      </details>
    `;

    container.appendChild(card);
  }

  // Accordion behavior: only one breakdown open at a time
  const allDetails = container.querySelectorAll<HTMLDetailsElement>('details.breakdown-details');
  allDetails.forEach(detail => {
    detail.addEventListener('toggle', () => {
      if (detail.open) {
        allDetails.forEach(other => {
          if (other !== detail && other.open) other.open = false;
        });
      }
    });
  });

  // Cell formula tooltip system
  initCellFormulaTooltips(container);

  // Info-popup portal system for mobile (handles ? icons inside overflow containers)
  // Initialize once globally — covers all pages, not just comparison cards
  initInfoPopupPortalOnce();
}

/** Detect touch-primary device */
function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;
}

/**
 * Portal-based info popup system for mobile.
 * On touch devices, ? icon taps open a fixed overlay on document.body
 * instead of relying on CSS :hover/:focus inside overflow containers.
 * Initializes once globally on document.body to cover all pages.
 */
let infoPortalInitialized = false;

export function initInfoPopupPortalOnce(): void {
  if (infoPortalInitialized) return;
  if (!isTouchDevice()) return;
  infoPortalInitialized = true;

  // Create overlay backdrop + popup container on body
  const overlay = document.createElement('div');
  overlay.className = 'info-portal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const portalContent = document.createElement('div');
  portalContent.className = 'info-portal-content';

  overlay.appendChild(portalContent);
  document.body.appendChild(overlay);

  function closePortal() {
    overlay.classList.remove('visible');
  }

  // Dismiss on overlay tap
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePortal();
    }
  });

  // Intercept taps on .info-trigger anywhere on the page
  document.body.addEventListener('click', (e) => {
    const trigger = (e.target as HTMLElement).closest('.info-trigger') as HTMLElement | null;
    if (!trigger) return;

    e.preventDefault();
    e.stopPropagation();

    const popup = trigger.querySelector('.info-popup');
    if (!popup) return;

    // Clone content into portal
    portalContent.innerHTML = popup.innerHTML;
    overlay.classList.add('visible');

    // Remove focus from trigger so CSS :focus popup doesn't also show
    trigger.blur();
  }, true);
}

function initCellFormulaTooltips(container: HTMLElement): void {
  // Create shared tooltip element on body to avoid clipping
  let popup = document.querySelector('.cell-formula-popup') as HTMLElement | null;
  if (!popup) {
    popup = document.createElement('div');
    popup.className = 'cell-formula-popup';
    popup.setAttribute('role', 'tooltip');
    document.body.appendChild(popup);
  }

  // Create backdrop for mobile tap-to-dismiss
  let backdrop = document.querySelector('.cell-formula-backdrop') as HTMLElement | null;
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'cell-formula-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', () => hidePopup());
  }

  let activeCell: HTMLElement | null = null;

  function renderSteps(steps: FormulaStep[]): string {
    return `<div class="formula-ledger">${steps.map(step => {
      const cls = `formula-step formula-step-${step.type}`;
      const amountHtml = step.amount ? `<span class="formula-step-amount">${step.amount}</span>` : '';
      return `<div class="${cls}"><span class="formula-step-label">${step.label}</span>${amountHtml}</div>`;
    }).join('')}</div>`;
  }

  function positionPopup(cell: HTMLElement) {
    if (!popup) return;

    const mobile = isTouchDevice();
    const cellRect = cell.getBoundingClientRect();

    if (mobile) {
      // Mobile: bottom-anchored panel, full width
      popup.classList.add('cell-formula-popup--mobile');
      popup.style.left = '';
      popup.style.top = '';
      popup.style.right = '';
      popup.style.bottom = '';
      // Show backdrop
      if (backdrop) backdrop.classList.add('visible');
    } else {
      // Desktop: position above cell, centered
      popup.classList.remove('cell-formula-popup--mobile');
      if (backdrop) backdrop.classList.remove('visible');

      // Measure popup to do viewport-aware positioning
      popup.style.left = `${cellRect.left + cellRect.width / 2}px`;
      popup.style.top = `${cellRect.top - 8}px`;

      // After render, check if popup goes off-screen and adjust
      requestAnimationFrame(() => {
        if (!popup) return;
        const popupRect = popup.getBoundingClientRect();

        // Prevent left overflow
        if (popupRect.left < 8) {
          popup.style.left = `${8 + popupRect.width / 2}px`;
        }
        // Prevent right overflow
        if (popupRect.right > window.innerWidth - 8) {
          popup.style.left = `${window.innerWidth - 8 - popupRect.width / 2}px`;
        }
        // If not enough room above, show below
        if (popupRect.top < 8) {
          popup.style.top = `${cellRect.bottom + 8}px`;
          popup.classList.add('cell-formula-popup--below');
        } else {
          popup.classList.remove('cell-formula-popup--below');
        }
      });
    }
  }

  function showPopup(cell: HTMLElement) {
    if (!popup) return;

    // Try structured steps first, then fall back to plain formula
    const stepsJson = cell.getAttribute('data-formula-steps');
    const plainFormula = cell.getAttribute('data-formula');

    if (stepsJson) {
      try {
        const steps: FormulaStep[] = JSON.parse(stepsJson);
        popup.innerHTML = renderSteps(steps);
      } catch {
        popup.textContent = stepsJson;
      }
    } else if (plainFormula) {
      popup.textContent = plainFormula;
    } else {
      return;
    }

    popup.classList.add('visible');
    activeCell = cell;
    cell.classList.add('bd-cell-active');

    positionPopup(cell);
  }

  function hidePopup() {
    if (!popup) return;
    popup.classList.remove('visible');
    popup.classList.remove('cell-formula-popup--mobile');
    popup.classList.remove('cell-formula-popup--below');
    if (backdrop) backdrop.classList.remove('visible');
    if (activeCell) {
      activeCell.classList.remove('bd-cell-active');
      activeCell = null;
    }
  }

  const cellSelector = '.bd-cell-numeric[data-formula-steps], .bd-cell-numeric[data-formula]';

  // Delegate events on the container
  container.addEventListener('mouseenter', (e) => {
    if (isTouchDevice()) return; // skip hover on touch
    const cell = (e.target as HTMLElement).closest(cellSelector) as HTMLElement | null;
    if (cell) showPopup(cell);
  }, true);

  container.addEventListener('mouseleave', (e) => {
    if (isTouchDevice()) return;
    const cell = (e.target as HTMLElement).closest(cellSelector) as HTMLElement | null;
    if (cell) hidePopup();
  }, true);

  // Mobile: tap to show, tap elsewhere to dismiss
  container.addEventListener('click', (e) => {
    const cell = (e.target as HTMLElement).closest(cellSelector) as HTMLElement | null;
    if (cell) {
      if (activeCell === cell) {
        hidePopup();
      } else {
        hidePopup();
        showPopup(cell);
      }
      e.stopPropagation();
    } else if (isTouchDevice()) {
      // Tap outside cell on mobile = dismiss
      hidePopup();
    }
  });

  // Also dismiss on scroll for mobile (table scrolls horizontally)
  container.addEventListener('scroll', () => {
    if (activeCell) hidePopup();
  }, true);
}

export function renderRecommendations(
  recommendations: Recommendation[],
  container: HTMLElement,
): void {
  container.innerHTML = '';

  for (let i = 0; i < recommendations.length; i++) {
    const rec = recommendations[i];
    const card = document.createElement('div');
    card.className = `rec-card${i === 0 ? ' highlight' : ''}`;
    card.innerHTML = `
      <div class="rec-label">${rec.label}</div>
      <div class="rec-structure">${rec.structureType}</div>
      <div class="rec-reason">${rec.reason}</div>
    `;
    container.appendChild(card);
  }
}

export function renderWarnings(warnings: Warning[], container: HTMLElement): void {
  container.innerHTML = '';

  const severityIcon: Record<string, string> = {
    high: '🔴',
    medium: '🟡',
    low: '🔵',
    info: 'ℹ️',
  };

  for (const w of warnings) {
    const item = document.createElement('div');
    item.className = `warning-item severity-${w.severity}`;
    item.innerHTML = `
      <span class="warning-icon">${severityIcon[w.severity] || 'ℹ️'}</span>
      <div class="warning-body">
        <div class="warning-title">${w.title}</div>
        <div class="warning-message">${w.message}</div>
        <div class="warning-applies">
          ${w.appliesTo.map(s => `<span class="warning-tag">${s}</span>`).join('')}
        </div>
      </div>
    `;
    container.appendChild(item);
  }
}
