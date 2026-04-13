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
