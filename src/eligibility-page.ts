import './styles/main.css';
import type { EligibilityInput } from './core/eligibilityEngine';
import { evaluateEligibility } from './core/eligibilityEngine';
import { glossaryLink } from './core/glossary';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const soloToggle = $<HTMLDivElement>('soloToggle');
const familyMembersGroup = $<HTMLDivElement>('familyMembersGroup');
const familyMembersEl = $<HTMLInputElement>('familyMembers');
const caenClassesEl = $<HTMLInputElement>('caenClasses');
const plannedEmployeesEl = $<HTMLInputElement>('plannedEmployees');
const liabilityToggle = $<HTMLDivElement>('liabilityToggle');
const adminToggle = $<HTMLDivElement>('adminToggle');
const combineToggle = $<HTMLDivElement>('combineToggle');
const evaluateBtn = $<HTMLButtonElement>('evaluateBtn');
const resultsSection = $('eligibilityResults');
const cardsContainer = $('eligibilityCards');

// ─── Segmented control state ───

let isSolo = true;
let needLimitedLiability = false;
let needSimplestAdmin = true;
let needCombine = false;

function initSegmentedControl(
  container: HTMLElement,
  onChange: (value: string) => void,
): void {
  const buttons = container.querySelectorAll<HTMLButtonElement>('.seg-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.value || '');
    });
  });
}

initSegmentedControl(soloToggle, (value) => {
  isSolo = value === 'solo';
  familyMembersGroup.style.display = isSolo ? 'none' : 'block';
});

initSegmentedControl(liabilityToggle, (value) => {
  needLimitedLiability = value === 'yes';
});

initSegmentedControl(adminToggle, (value) => {
  needSimplestAdmin = value === 'yes';
});

initSegmentedControl(combineToggle, (value) => {
  needCombine = value === 'yes';
});

// ─── Gather inputs ───

function gatherInputs(): EligibilityInput {
  return {
    isSolo,
    familyMemberCount: isSolo ? 1 : (parseInt(familyMembersEl.value) || 2),
    caenClassesNeeded: parseInt(caenClassesEl.value) || 1,
    plannedEmployees: parseInt(plannedEmployeesEl.value) || 0,
    needLimitedLiability,
    needSimplestAdmin,
    needCombineServicesProducts: needCombine,
  };
}

// ─── Status label + class ───

function statusLabel(status: string): string {
  switch (status) {
    case 'eligible': return 'Eligible';
    case 'conditionally-eligible': return 'Conditionally Eligible';
    case 'not-suitable': return 'Not Suitable';
    case 'not-eligible': return 'Not Eligible';
    default: return status;
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'eligible': return 'elig-status-eligible';
    case 'conditionally-eligible': return 'elig-status-conditional';
    case 'not-suitable': return 'elig-status-not-suitable';
    case 'not-eligible': return 'elig-status-not-eligible';
    default: return '';
  }
}

function reasonIcon(type: string): string {
  switch (type) {
    case 'positive': return '✓';
    case 'negative': return '✗';
    case 'warning': return '⚠';
    default: return '•';
  }
}

// ─── Render results ───

function renderResults(): void {
  const input = gatherInputs();
  const results = evaluateEligibility(input);

  resultsSection.style.display = 'block';
  cardsContainer.innerHTML = '';

  // Sort: eligible first, then conditional, then not-suitable, then not-eligible
  const statusOrder: Record<string, number> = {
    'eligible': 0,
    'conditionally-eligible': 1,
    'not-suitable': 2,
    'not-eligible': 3,
  };
  results.sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

  for (const result of results) {
    const card = document.createElement('div');
    card.className = `elig-card ${statusClass(result.status)}`;

    const reasonsHtml = result.reasons.map(r =>
      `<li class="elig-reason elig-reason-${r.type}"><span class="elig-reason-icon">${reasonIcon(r.type)}</span> ${r.text}</li>`,
    ).join('');

    const constraintsHtml = result.constraints.length > 0
      ? `<div class="elig-section"><h4 class="elig-section-title">Constraints</h4><ul class="elig-list">${result.constraints.map(c => `<li>${c}</li>`).join('')}</ul></div>`
      : '';

    const warningsHtml = result.nextWarnings.length > 0
      ? `<div class="elig-section"><h4 class="elig-section-title">Key Warnings</h4><ul class="elig-list">${result.nextWarnings.map(w => `<li>${w}</li>`).join('')}</ul></div>`
      : '';

    card.innerHTML = `
      <div class="elig-card-header">
        <div class="elig-card-title">
          <span class="elig-structure-name">${glossaryLink(result.structureName)}</span>
          <span class="elig-full-name">${result.fullName}</span>
        </div>
        <span class="elig-status-badge">${statusLabel(result.status)}</span>
      </div>
      <ul class="elig-reasons">${reasonsHtml}</ul>
      ${constraintsHtml}
      ${warningsHtml}
    `;

    cardsContainer.appendChild(card);
  }
}

// ─── Event listeners ───

evaluateBtn.addEventListener('click', renderResults);

document.querySelectorAll<HTMLInputElement>('.input-panel input').forEach(el => {
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') renderResults();
  });
});
