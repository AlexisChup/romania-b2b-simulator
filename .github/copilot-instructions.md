# Project Guidelines

## Overview

Client-side Romanian IT contractor income simulator comparing four legal structures (PFA, II, IF, SRL). Vanilla TypeScript + Vite + Chart.js — no framework.

## Architecture

```
src/
  main.ts                 # Entry: simulator page (index.html)
  structures-page.ts      # Entry: structures guide (structures.html)
  core/
    types.ts              # All domain types, enums, interfaces
    formulaEngine.ts      # Pure tax computation functions (PFA/II/IF/SRL)
    constants.ts          # Loads & re-exports src/data/constants.json
    comparators.ts        # Ranks structures by net, rate, simplicity
    recommendationEngine.ts # Generates actionable recommendations
    warnings.ts           # Threshold-based warnings (micro cap, VAT, etc.)
    formatters.ts         # EUR/RON/% display helpers
  components/
    resultsPanel.ts       # Renders cards, breakdowns, recommendations, warnings
    monthlyChart.ts       # Chart.js monthly cashflow visualization
    constantsPanel.ts     # Tax constants reference table
  data/
    constants.json        # All tax parameters with provenance & confidence
    structures.json       # Structure metadata (pros, cons, legal details)
```

- **Three HTML entry points** configured in `vite.config.ts`: `index.html`, `structures.html`, `about.html`
- **All computation is client-side** — no backend
- **Formula engine is pure functions** — no side effects, no DOM access
- **Data-driven**: tax constants and structure metadata live in JSON, not hardcoded
- **Currency convention**: EUR for all calculations; RON shown alongside using FX rate input

## Build and Test

```bash
npm run dev      # Vite dev server
npm run build    # tsc + vite build
npm run preview  # Preview production build
```

No test framework is configured yet. TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`) serves as the primary static check.

## Conventions

- **DOM access pattern**: `const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;` — used in entry files for typed element refs
- **Module exports**: each core module exports one primary function (`simulateAll`, `compareResults`, `generateRecommendations`, `generateWarnings`)
- **Enums for structure types**: always use `StructureType.PFA` etc., never raw strings
- **Constants with provenance**: every tax parameter in `constants.json` includes `label`, `description`, `confidence`, `source`, and `validFrom`/`validUntil` — maintain this when adding or updating constants
- **Tooltips**: UI uses inline `(?)` tooltip triggers — keep explanations non-technical and cite the underlying rule
- **No frameworks**: UI updates are manual DOM manipulation. Do not introduce React/Vue/etc.

## Domain Context

The four Romanian structures for IT contracting:

| Structure | Type | Key trait |
|-----------|------|-----------|
| **PFA** | Sole trader | Simplest, personal liability |
| **II** | Individual enterprise | Similar to PFA, patrimony separation |
| **IF** | Family enterprise | Multi-member family business |
| **SRL** | Limited company | Limited liability, micro or profit tax regime |

Tax year is **2026**. Key 2026 changes: micro rate 1%, €100k micro cap, 16% dividend tax, CASS cap at 72× minimum wage.

See [docs/Implementation-oriented-research-for-a-Romanian-IT-contractor-income-simulator.md](../docs/Implementation-oriented-research-for-a-Romanian-IT-contractor-income-simulator.md) for the full formula sheet and constant provenance.
See [docs/Romanian-structures-for-IT-contracting-and-software-product-income.md](../docs/Romanian-structures-for-IT-contracting-and-software-product-income.md) for the practitioner guide on each structure.

## Current Limitations (V1)

- IF modeled as single-member PFA (multi-member allocation not yet implemented)
- No VAT registration/filing logic (warning-only)
- Quarterly dividends are a deterministic timing assumption
- No edge cases like multiple CAEN codes or cross-border scenarios
