import constantsData from '../data/constants.json';
import type { ConstantsData, ConstantEntry } from './types';

const data = constantsData as ConstantsData;

export function getConstant(id: string): ConstantEntry | undefined {
  return data.constants.find(c => c.id === id);
}

export function getConstantValue(id: string): number {
  const c = getConstant(id);
  if (!c || typeof c.value !== 'number') {
    throw new Error(`Constant ${id} not found or not numeric`);
  }
  return c.value;
}

export function getAllConstants(): ConstantEntry[] {
  return data.constants;
}

export function getDefaults() {
  return data.defaults;
}

export function getMeta() {
  return data.meta;
}

// Pre-resolved tax constants for quick access
export const TAX = {
  microRate: getConstantValue('ro_micro_tax_rate_2026'),
  microCapEur: getConstantValue('ro_micro_turnover_cap_eur'),
  dividendRate: getConstantValue('ro_dividend_tax_rate_2026'),
  citRate: getConstantValue('ro_cit_rate'),
  pitRate: getConstantValue('ro_pit_rate'),
  casRate: getConstantValue('ro_cas_rate'),
  cassRate: getConstantValue('ro_cass_rate'),
  casThresholdMult: getConstantValue('ro_cas_threshold_mult'),
  casBaseLowMult: getConstantValue('ro_cas_base_low_mult'),
  casBaseHighMult: getConstantValue('ro_cas_base_high_mult'),
  cassMinBaseMult: getConstantValue('ro_cass_min_base_mult'),
  cassCapMult2026: getConstantValue('ro_cass_cap_mult_2026'),
  vatExemptionThresholdRon: getConstantValue('ro_vat_exemption_threshold_ron'),
} as const;
