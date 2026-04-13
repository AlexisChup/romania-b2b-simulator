import { getGlossaryCategories } from './core/glossary';

const container = document.getElementById('glossaryContent');
if (container) {
  const categories = getGlossaryCategories();
  container.innerHTML = categories.map(cat => `
    <section class="glossary-category">
      <h2 class="glossary-category-title">${cat.label}</h2>
      <div class="glossary-terms">
        ${cat.terms.map(term => `
          <div class="glossary-term" id="${term.id}">
            <div class="glossary-term-header">
              <span class="glossary-acronym">${term.acronym}</span>
              <span class="glossary-fullname">${term.fullName}</span>
            </div>
            <p class="glossary-desc">${term.description}</p>
          </div>
        `).join('')}
      </div>
    </section>
  `).join('');
}
