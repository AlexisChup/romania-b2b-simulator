import { getAllConstants } from '../core/constants';

export function renderConstantsTable(container: HTMLElement): void {
  const constants = getAllConstants();

  const table = document.createElement('table');
  table.className = 'constants-table';

  table.innerHTML = `
    <thead>
      <tr>
        <th>Constant</th>
        <th>Value</th>
        <th>Applies to</th>
        <th>Confidence</th>
        <th>Source</th>
      </tr>
    </thead>
    <tbody>
      ${constants.map(c => {
        const displayValue = Array.isArray(c.value)
          ? c.value.join(', ') + '×MW'
          : typeof c.value === 'boolean'
          ? (c.value ? 'Yes' : 'No')
          : c.unit === 'fraction'
          ? `${((c.value as number) * 100).toFixed((c.value as number) < 0.1 ? 2 : 0)}%`
          : c.unit === 'min_wage_multiplier'
          ? `${c.value}× min wage`
          : c.unit === 'EUR'
          ? `€${(c.value as number).toLocaleString()}`
          : c.unit === 'RON'
          ? `${(c.value as number).toLocaleString()} RON`
          : c.unit === 'days'
          ? `${c.value} days`
          : String(c.value);

        const sourceLink = c.sourceUrl
          ? `<a href="${c.sourceUrl}" target="_blank" rel="noopener noreferrer">${c.sourceType}</a>`
          : `<span style="color:var(--color-text-muted)">${c.sourceType || '—'}</span>`;

        return `
          <tr>
            <td>
              <div class="constant-label">${c.label}</div>
              <div class="constant-desc">${c.description.length > 100 ? c.description.substring(0, 100) + '…' : c.description}</div>
            </td>
            <td><span class="constant-value">${displayValue}</span></td>
            <td>${c.appliesTo.join(', ')}</td>
            <td><span class="confidence-badge confidence-${c.confidence}">${c.confidence}</span></td>
            <td class="constant-source">${sourceLink}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;

  container.innerHTML = '';
  container.appendChild(table);
}
