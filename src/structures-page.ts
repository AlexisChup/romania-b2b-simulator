import './styles/main.css';
import structuresData from './data/structures.json';
import type { StructureInfo } from './core/types';

const structures = structuresData.structures as StructureInfo[];

function renderStructureCards(container: HTMLElement): void {
  container.innerHTML = '';

  for (const s of structures) {
    const card = document.createElement('div');
    card.className = 'structure-card';

    const metaChips: string[] = [];
    if (s.maxCaenClasses !== null) metaChips.push(`${s.maxCaenClasses} CAEN classes`);
    if (s.maxEmployees !== null) metaChips.push(`${s.maxEmployees} employees max`);
    else if (s.canHireEmployees) metaChips.push('Unlimited employees');
    metaChips.push(s.bookkeeping);
    metaChips.push(s.liabilityType === 'limited' ? 'Limited liability' : 'Unlimited liability');
    metaChips.push(`Admin: ${s.adminComplexity}`);

    card.innerHTML = `
      <div class="structure-card-header">
        <span class="structure-name">${s.name}</span>
        <span class="structure-fullname">${s.fullName}</span>
      </div>
      <p class="structure-nature">${s.legalNature}</p>

      <div class="structure-meta">
        ${metaChips.map(c => `<span class="meta-chip">${c}</span>`).join('')}
      </div>

      <div class="structure-section-label">Advantages</div>
      <ul class="structure-list pros">
        ${s.pros.map(p => `<li>${p}</li>`).join('')}
      </ul>

      <div class="structure-section-label">Disadvantages</div>
      <ul class="structure-list cons">
        ${s.cons.map(c => `<li>${c}</li>`).join('')}
      </ul>

      <div class="structure-best-for"><strong>Best for:</strong> ${s.bestFor}</div>
      <div class="structure-unsuitable"><strong>Unsuitable when:</strong> ${s.unsuitableWhen}</div>
    `;

    container.appendChild(card);
  }
}

function renderComparisonTable(table: HTMLTableElement): void {
  const topics = [
    { label: 'Legal nature', key: 'legalNature' },
    { label: 'Solo eligible', key: 'soloEligible', format: (v: boolean) => v ? 'Yes' : 'No' },
    { label: 'Max CAEN classes', key: 'maxCaenClasses', format: (v: number | null) => v !== null ? String(v) : 'No fixed limit' },
    { label: 'Max employees', key: 'maxEmployees', format: (v: number | null) => v !== null ? (v === 0 ? 'Cannot hire' : String(v)) : 'No fixed limit' },
    { label: 'Liability', key: 'liabilityDescription' },
    { label: 'Bookkeeping', key: 'bookkeeping' },
    { label: 'Tax logic', key: 'taxLogic' },
    { label: 'Admin complexity', key: 'adminComplexity' },
    { label: 'Forced change trigger', key: 'forcedChangeTriggersDescription' },
  ];

  table.innerHTML = `
    <thead>
      <tr>
        <th>Topic</th>
        ${structures.map(s => `<th>${s.name}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${topics.map(t => `
        <tr>
          <td>${t.label}</td>
          ${structures.map(s => {
            const raw = (s as unknown as Record<string, unknown>)[t.key];
            const val = t.format ? t.format(raw as never) : String(raw ?? '—');
            return `<td>${val}</td>`;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  `;
}

// ─── Init ───

const structuresContent = document.getElementById('structuresContent');
const comparisonTable = document.getElementById('comparisonTable') as HTMLTableElement;

if (structuresContent) renderStructureCards(structuresContent);
if (comparisonTable) renderComparisonTable(comparisonTable);
