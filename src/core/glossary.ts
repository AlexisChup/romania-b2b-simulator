import glossaryData from '../data/glossary.json';

export interface GlossaryTerm {
  id: string;
  acronym: string;
  fullName: string;
  description: string;
}

export interface GlossaryCategory {
  id: string;
  label: string;
  terms: GlossaryTerm[];
}

const allTerms: Map<string, GlossaryTerm> = new Map();
for (const cat of glossaryData.categories as GlossaryCategory[]) {
  for (const term of cat.terms) {
    allTerms.set(term.acronym.toUpperCase(), term);
  }
}

export function getGlossaryCategories(): GlossaryCategory[] {
  return glossaryData.categories as GlossaryCategory[];
}

export function glossaryLink(acronym: string): string {
  const term = allTerms.get(acronym.toUpperCase());
  if (!term) return acronym;
  return `<a href="/glossary.html#${term.id}" class="glossary-link" title="${term.fullName}">${acronym}</a>`;
}
