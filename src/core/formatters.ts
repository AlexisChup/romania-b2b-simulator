export function formatEur(value: number): string {
  return `€${Math.round(value).toLocaleString('en-US')}`;
}

export function formatEurDetailed(value: number): string {
  return `€${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatRon(value: number): string {
  return `${Math.round(value).toLocaleString('en-US')} RON`;
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatPctInt(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDual(eurValue: number, fxRate: number): string {
  const ronValue = eurValue * fxRate;
  return `${formatEur(eurValue)}<span class="dual-ron">${formatRon(ronValue)}</span>`;
}

export function formatDualPlain(eurValue: number, fxRate: number): { eur: string; ron: string } {
  return {
    eur: formatEur(eurValue),
    ron: formatRon(eurValue * fxRate),
  };
}
