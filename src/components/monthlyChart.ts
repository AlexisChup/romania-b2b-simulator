import { Chart, registerables } from 'chart.js';
import type { SimulationResult } from '../core/types';

Chart.register(...registerables);

let chartInstance: Chart | null = null;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const COLORS: Record<string, string> = {
  PFA: '#2563eb',
  II: '#7c3aed',
  IF: '#d97706',
  SRL: '#059669',
};

/** Display name for chart legend — PFA shows as "PFA / II" */
function chartLabel(structureType: string): string {
  if (structureType === 'PFA') return 'PFA / II';
  return structureType;
}

export function renderMonthlyChart(canvas: HTMLCanvasElement, results: SimulationResult[]): void {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const isMobile = window.innerWidth <= 768;
  const isSmallMobile = window.innerWidth <= 480;

  const datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    borderWidth: number;
    pointRadius: number;
    tension: number;
    fill: boolean;
  }[] = [];

  for (const result of results) {
    const cashflow = result.monthlyCashflow;
    // Build cumulative data: each month = sum of totalPersonalCash from Jan to that month
    const cumulative: number[] = [];
    let runningTotal = 0;
    for (const c of cashflow) {
      runningTotal += c.totalPersonalCash;
      cumulative.push(Math.round(runningTotal));
    }

    const color = COLORS[result.structureType] || '#888';

    datasets.push({
      label: chartLabel(result.structureType),
      data: cumulative,
      borderColor: color,
      backgroundColor: color + '10',
      borderWidth: isMobile ? 2 : 2.5,
      pointRadius: isMobile ? 2 : 3,
      tension: 0.15,
      fill: false,
    });
  }

  chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: MONTH_LABELS,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: isSmallMobile ? 10 : (isMobile ? 11 : 12), family: "'Inter', sans-serif" },
            usePointStyle: true,
            padding: isMobile ? 10 : 16,
            boxWidth: isMobile ? 8 : 10,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: €${(ctx.parsed.y ?? 0).toLocaleString()}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { size: isSmallMobile ? 9 : (isMobile ? 10 : 12), family: "'Inter', sans-serif" },
            maxRotation: isMobile ? 45 : 0,
          },
        },
        y: {
          title: {
            display: !isMobile,
            text: 'Cumulative personal cash (EUR)',
            font: { size: 12, family: "'Inter', sans-serif" },
          },
          ticks: {
            callback: (value) => `€${Number(value).toLocaleString()}`,
            font: { size: isSmallMobile ? 9 : (isMobile ? 10 : 11), family: "'Inter', sans-serif" },
          },
          grid: {
            color: 'rgba(0,0,0,0.05)',
          },
        },
      },
    },
  });
}
