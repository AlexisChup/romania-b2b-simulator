import structuresData from '../data/structures.json';

export type EligibilityStatus = 'eligible' | 'conditionally-eligible' | 'not-suitable' | 'not-eligible';

export interface EligibilityInput {
  isSolo: boolean;
  familyMemberCount: number;
  caenClassesNeeded: number;
  plannedEmployees: number;
  needLimitedLiability: boolean;
  needSimplestAdmin: boolean;
  needCombineServicesProducts: boolean;
}

export interface EligibilityReason {
  text: string;
  type: 'positive' | 'negative' | 'warning';
}

export interface EligibilityResult {
  structureId: string;
  structureName: string;
  fullName: string;
  status: EligibilityStatus;
  reasons: EligibilityReason[];
  constraints: string[];
  nextWarnings: string[];
}

interface StructureData {
  id: string;
  name: string;
  fullName: string;
  soloEligible: boolean;
  maxCaenClasses: number | null;
  maxEmployees: number | null;
  canHireEmployees: boolean;
  liabilityType: string;
  adminComplexity: string;
}

export function evaluateEligibility(input: EligibilityInput): EligibilityResult[] {
  const structures = structuresData.structures as StructureData[];
  return structures.map(s => evaluateStructure(s, input));
}

function evaluateStructure(s: StructureData, input: EligibilityInput): EligibilityResult {
  const reasons: EligibilityReason[] = [];
  const constraints: string[] = [];
  const nextWarnings: string[] = [];
  let blocked = false;
  let hasWarning = false;

  // ─── Solo check ───
  if (input.isSolo) {
    if (!s.soloEligible) {
      reasons.push({ text: 'Requires 2+ family members — not available for solo operators', type: 'negative' });
      blocked = true;
    } else {
      reasons.push({ text: 'Available for solo operation', type: 'positive' });
    }
  } else {
    // Family setup
    if (s.id === 'IF') {
      if (input.familyMemberCount >= 2) {
        reasons.push({ text: `Supports ${input.familyMemberCount} family members with income splitting`, type: 'positive' });
      } else {
        reasons.push({ text: 'IF requires at least 2 family members', type: 'negative' });
        blocked = true;
      }
    }
  }

  // ─── CAEN class check ───
  if (s.maxCaenClasses !== null) {
    if (input.caenClassesNeeded > s.maxCaenClasses) {
      reasons.push({ text: `Needs ${input.caenClassesNeeded} CAEN classes but ${s.id} allows max ${s.maxCaenClasses}`, type: 'negative' });
      blocked = true;
    } else if (input.caenClassesNeeded === s.maxCaenClasses) {
      reasons.push({ text: `Using all ${s.maxCaenClasses} allowed CAEN classes — no room to add more`, type: 'warning' });
      hasWarning = true;
      constraints.push(`Max ${s.maxCaenClasses} CAEN classes`);
    } else {
      reasons.push({ text: `${input.caenClassesNeeded} of ${s.maxCaenClasses} CAEN classes used`, type: 'positive' });
    }
  } else {
    reasons.push({ text: 'No limit on CAEN activity classes', type: 'positive' });
  }

  // ─── Employee check ───
  if (!s.canHireEmployees && input.plannedEmployees > 0) {
    reasons.push({ text: `Cannot hire employees — ${s.id} only allows family members`, type: 'negative' });
    blocked = true;
  } else if (s.maxEmployees !== null && input.plannedEmployees > s.maxEmployees) {
    reasons.push({ text: `Needs ${input.plannedEmployees} employees but ${s.id} allows max ${s.maxEmployees}`, type: 'negative' });
    blocked = true;
  } else if (s.maxEmployees !== null && input.plannedEmployees > 0) {
    if (input.plannedEmployees === s.maxEmployees) {
      reasons.push({ text: `Using all ${s.maxEmployees} employee slots — no room to grow`, type: 'warning' });
      hasWarning = true;
      constraints.push(`Max ${s.maxEmployees} employees`);
    } else {
      reasons.push({ text: `${input.plannedEmployees} of ${s.maxEmployees} employee slots used`, type: 'positive' });
    }
  } else if (s.maxEmployees === null && input.plannedEmployees > 0) {
    reasons.push({ text: 'No limit on number of employees', type: 'positive' });
  }

  // ─── Limited liability check ───
  if (input.needLimitedLiability) {
    if (s.liabilityType === 'limited') {
      reasons.push({ text: 'Provides limited liability — personal assets protected', type: 'positive' });
    } else {
      reasons.push({ text: 'Unlimited personal liability — personal assets at risk', type: 'negative' });
      hasWarning = true;
    }
  }

  // ─── Simplest admin check ───
  if (input.needSimplestAdmin) {
    if (s.adminComplexity === 'low') {
      reasons.push({ text: 'Simple admin — single-entry bookkeeping, no accountant required', type: 'positive' });
    } else if (s.adminComplexity === 'medium') {
      reasons.push({ text: 'Moderate admin complexity', type: 'warning' });
      hasWarning = true;
    } else {
      reasons.push({ text: 'Higher admin — double-entry bookkeeping, accountant required', type: 'warning' });
      hasWarning = true;
    }
  }

  // ─── Services + products combo ───
  if (input.needCombineServicesProducts) {
    if (s.id === 'SRL') {
      reasons.push({ text: 'Best suited for combining services and software product revenue', type: 'positive' });
    } else if (s.maxCaenClasses !== null && s.maxCaenClasses >= 2) {
      reasons.push({ text: 'Can register multiple CAEN classes for services + products', type: 'positive' });
    }
  }

  // ─── Structure-specific warnings ───
  if (s.id === 'SRL') {
    nextWarnings.push('Micro regime requires ≥1 employee (90-day deadline for new companies)');
    nextWarnings.push('Revenue above €100,000 triggers switch from micro (1%) to profit tax (16%)');
    constraints.push('Double-entry bookkeeping required');
    constraints.push('Minimum share capital: 500 RON (5,000 RON if turnover > 400,000 RON)');
  }

  if (s.id === 'PFA') {
    nextWarnings.push('Need >5 CAEN classes → must upgrade to II or SRL');
    nextWarnings.push('Need >3 employees → must upgrade to II or SRL');
  }

  if (s.id === 'II') {
    nextWarnings.push('Need >10 CAEN classes → must move to SRL');
    nextWarnings.push('Need >8 employees → must move to SRL');
  }

  if (s.id === 'IF') {
    nextWarnings.push('Cannot hire non-family employees');
    nextWarnings.push('All family members share joint and several liability');
  }

  // ─── Determine status ───

  let status: EligibilityStatus;
  if (blocked) {
    // If blocked only because of liability preference (soft), mark as not-suitable instead of not-eligible
    const hardBlocked = reasons.some(r =>
      r.type === 'negative' &&
      !r.text.includes('personal liability'),
    );
    status = hardBlocked ? 'not-eligible' : 'not-suitable';
  } else if (hasWarning) {
    status = 'conditionally-eligible';
  } else {
    status = 'eligible';
  }

  return {
    structureId: s.id,
    structureName: s.name,
    fullName: s.fullName,
    status,
    reasons,
    constraints,
    nextWarnings,
  };
}

// ─── Best-fit recommendation ───

export interface BestFitRecommendation {
  structureId: string;
  structureName: string;
  fullName: string;
  summary: string;
  fitReasons: string[];
  tradeoffs: string[];
  keyLimits: string[];
  isConditional: boolean;
}

export function recommendBestFit(
  results: EligibilityResult[],
  input: EligibilityInput,
): BestFitRecommendation | null {
  const structures = structuresData.structures as StructureData[];
  const candidates = results.filter(r =>
    r.status === 'eligible' || r.status === 'conditionally-eligible',
  );
  if (candidates.length === 0) return null;

  const scored = candidates.map(r => {
    const s = structures.find(st => st.id === r.structureId)!;
    return { result: r, structure: s, score: scoreFit(s, input) };
  });
  scored.sort((a, b) => b.score - a.score);
  const { result, structure } = scored[0];
  return buildRecommendation(result, structure, input);
}

function scoreFit(s: StructureData, input: EligibilityInput): number {
  let score = 0;

  // Solo / family structural fit
  if (input.isSolo && s.soloEligible) score += 2;
  if (!input.isSolo && s.id === 'IF' && input.familyMemberCount >= 2) score += 4;

  // CAEN headroom — prefer structures with more remaining capacity
  if (s.maxCaenClasses !== null) {
    score += Math.min(s.maxCaenClasses - input.caenClassesNeeded, 3);
  } else {
    score += 4; // no cap = maximum headroom bonus
  }

  // Employee flexibility
  if (input.plannedEmployees > 0) {
    if (!s.canHireEmployees) {
      score -= 10;
    } else if (s.maxEmployees === null) {
      score += 3;
    } else {
      score += Math.min(s.maxEmployees - input.plannedEmployees, 3);
    }
  }

  // Limited liability preference
  if (input.needLimitedLiability) {
    if (s.liabilityType === 'limited') score += 8;
    else score -= 4;
  }

  // Admin simplicity preference
  if (input.needSimplestAdmin) {
    if (s.adminComplexity === 'low') score += 4;
    else if (s.adminComplexity === 'medium') score += 1;
    else score -= 3;
  } else {
    if (s.id === 'SRL') score += 2; // slight SRL bonus when admin is not a concern
  }

  // Combine services + software product revenue
  if (input.needCombineServicesProducts) {
    if (s.id === 'SRL') score += 5;
    else if (s.maxCaenClasses !== null && s.maxCaenClasses >= 2) score += 2;
  }

  return score;
}

function buildRecommendation(
  result: EligibilityResult,
  s: StructureData,
  input: EligibilityInput,
): BestFitRecommendation {
  const fitReasons: string[] = [];
  const tradeoffs: string[] = [];

  // Why this fits — each point tied to a user criterion
  if (input.isSolo && s.soloEligible && s.id !== 'SRL') {
    fitReasons.push('Available for solo operation — no co-founders or family required');
  }
  if (s.id === 'SRL' && input.isSolo) {
    fitReasons.push('Available as a single-member company (SRL unipersonal)');
  }
  if (!input.isSolo && s.id === 'IF') {
    fitReasons.push(`Designed for family operations — income split across ${input.familyMemberCount} members by agreement`);
  }
  if (input.needLimitedLiability && s.liabilityType === 'limited') {
    fitReasons.push('Provides the limited liability protection you require');
  }
  if (input.needSimplestAdmin && s.adminComplexity === 'low') {
    fitReasons.push('Single-entry bookkeeping — minimal admin overhead, no accountant needed');
  }
  if (s.maxCaenClasses !== null) {
    const headroom = s.maxCaenClasses - input.caenClassesNeeded;
    const pl = input.caenClassesNeeded !== 1 ? 'es' : '';
    fitReasons.push(
      headroom > 0
        ? `Fits your ${input.caenClassesNeeded} CAEN class${pl} with ${headroom} slot${headroom !== 1 ? 's' : ''} to spare`
        : `Covers your ${input.caenClassesNeeded} CAEN class${pl} — at capacity`,
    );
  } else {
    fitReasons.push('No cap on CAEN activity classes — room to diversify at any time');
  }
  if (input.needCombineServicesProducts && s.id === 'SRL') {
    fitReasons.push('Best suited for mixing service and software product revenue streams');
  }
  if (input.plannedEmployees > 0 && s.canHireEmployees) {
    if (s.maxEmployees === null) {
      fitReasons.push(`No employee cap — covers your ${input.plannedEmployees} planned hire${input.plannedEmployees !== 1 ? 's' : ''} and future growth`);
    } else {
      const rem = s.maxEmployees - input.plannedEmployees;
      fitReasons.push(`Covers your ${input.plannedEmployees} employee${input.plannedEmployees !== 1 ? 's' : ''} (${rem} slot${rem !== 1 ? 's' : ''} remaining)`);
    }
  }

  // Trade-offs
  if (s.liabilityType !== 'limited') {
    tradeoffs.push('Unlimited personal liability — business debts may reach personal assets');
  }
  if (s.id === 'IF') {
    tradeoffs.push('Cannot hire non-family employees — growth limited to family members');
    tradeoffs.push('All family members share joint and several liability');
  }
  if (s.adminComplexity === 'high') {
    tradeoffs.push('Double-entry bookkeeping — accountant is practically mandatory');
    tradeoffs.push('Higher fixed compliance costs (filings, payroll, annual statements)');
  }
  if (s.id === 'SRL') {
    tradeoffs.push('16% dividend withholding tax on all profit distributions (2026)');
    tradeoffs.push('Micro regime (1% tax) requires ≥1 employee and revenue ≤ €100,000');
  }
  if (s.maxCaenClasses !== null) {
    tradeoffs.push(`Limited to ${s.maxCaenClasses} CAEN classes — exceeding this forces conversion to SRL`);
  }
  if (s.maxEmployees !== null && s.maxEmployees > 0) {
    tradeoffs.push(`Maximum ${s.maxEmployees} employees — must convert to SRL to grow beyond this`);
  }

  return {
    structureId: s.id,
    structureName: s.name,
    fullName: s.fullName,
    summary: buildSummary(s, input),
    fitReasons,
    tradeoffs,
    keyLimits: result.nextWarnings,
    isConditional: result.status === 'conditionally-eligible',
  };
}

function buildSummary(s: StructureData, input: EligibilityInput): string {
  if (s.id === 'PFA') {
    const adminNote = input.needSimplestAdmin
      ? 'matching your preference for minimal admin'
      : 'with simple single-entry bookkeeping';
    return `The simplest structure for solo contracting, ${adminNote}. No mandatory accountant, quick to register, low fixed costs.`;
  }
  if (s.id === 'II') {
    return `More capacity than PFA (10 CAEN classes, 8 employees) with the same straightforward tax logic. Suitable when your needs outgrow PFA without requiring a full corporate structure.`;
  }
  if (s.id === 'IF') {
    return `Purpose-built for family-run operations with ${input.familyMemberCount} members. Income is split by agreement among family members, potentially reducing per-member social contribution exposure.`;
  }
  if (s.id === 'SRL') {
    const drivers: string[] = [];
    if (input.needLimitedLiability) drivers.push('liability protection');
    if (input.needCombineServicesProducts) drivers.push('mixed revenue streams');
    if (input.plannedEmployees > 3) drivers.push(`${input.plannedEmployees} planned employees`);
    if (drivers.length === 0) drivers.push('flexible corporate structure and tax planning');
    return `Corporate structure best suited for ${drivers.join(', ')}. More admin overhead, but significantly more flexibility for scaling and payout optimization.`;
  }
  return '';
}
