/** DOM inspection for Cashify's captured defect detail question component.
 * Executed inside Playwright; keep this function self-contained. */
export interface DefectQuestion {
  ok: boolean;
  reason: string | null;
  questionText: string | null;
  options: Array<{ text: string; selected: boolean }>;
  sanitizedHtml: string | null;
}

export function inspectDefectQuestion(element: Element): DefectQuestion {
  const rejected: DefectQuestion = { ok: false, reason: 'defect question structure not verified',
    questionText: null, options: [], sanitizedHtml: null };
  const card = element.closest('div.cursor-pointer');
  const grid = card?.closest('div.flex.flex-row.flex-wrap.w-full');
  const wrapper = grid?.parentElement;
  const component = wrapper?.parentElement;
  if (!card || !grid || !wrapper || !component || !wrapper.classList.contains('flex-col') ||
    !wrapper.classList.contains('w-full') || wrapper.children.length !== 1 || wrapper.firstElementChild !== grid ||
    component.children.length !== 2 || (component as HTMLElement).innerText.length > 1800) return rejected;
  const header = Array.from(component.children).find((child) => child !== wrapper);
  if (!header || header.contains(card)) return rejected;
  const headings = Array.from(header.querySelectorAll('h1,h2,h3,h4,h5,h6,legend,[role="heading"],.body3'))
    .filter((heading) => !!(heading as HTMLElement).innerText.trim());
  const cards = Array.from(grid.querySelectorAll('div.cursor-pointer'));
  if (!cards.length || cards.length > 10) return rejected;
  const options: DefectQuestion['options'] = [];
  let stateValid = true;
  for (const option of cards) {
    const labels = Array.from(option.querySelectorAll('.caption3'));
    const panels = Array.from(option.querySelectorAll('div.flex.flex-col.items-center.w-full.flex-1'));
    if (labels.length !== 1 || panels.length !== 1) return rejected;
    const text = (labels[0] as HTMLElement).innerText.trim().replace(/\s+/g, ' ');
    if (!text || text.length > 220 || !(labels[0] as HTMLElement).getBoundingClientRect().height) return rejected;
    const panel = panels[0];
    const selected = option.classList.contains('border-primary') &&
      panel.classList.contains('border-primary') && panel.classList.contains('bg-primary');
    const unselected = option.classList.contains('border-surface-light-3') &&
      panel.classList.contains('bg-gray-50') && !panel.classList.contains('border-primary') &&
      !panel.classList.contains('bg-primary') && !option.classList.contains('border-primary');
    if (selected === unselected) stateValid = false;
    options.push({ text, selected });
  }
  const headingTexts = headings.map((heading) => (heading as HTMLElement).innerText.trim().replace(/\s+/g, ' '));
  const title = headingTexts.length === 1 ? headingTexts[0] : null;
  // Clone only this bounded question component. No URLs, scripts, images,
  // arbitrary attributes, explanatory text, or surrounding page are saved.
  const clone = component.cloneNode(true) as Element;
  const allowedTexts = [...options.map((option) => option.text), ...headingTexts.filter((text) => text.length <= 220)];
  for (const node of [clone, ...Array.from(clone.querySelectorAll('*'))]) {
    for (const attribute of Array.from(node.attributes)) {
      if (!['class', 'role', 'aria-checked', 'aria-selected', 'type'].includes(attribute.name)) node.removeAttribute(attribute.name);
    }
    if (['SCRIPT', 'STYLE', 'IFRAME', 'IMG', 'SVG', 'INPUT'].includes(node.tagName)) node.remove();
  }
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const value = (walker.currentNode.textContent || '').trim().replace(/\s+/g, ' ');
    if (!allowedTexts.includes(value)) walker.currentNode.textContent = '';
  }
  const result: DefectQuestion = { ok: false, reason: null, questionText: title,
    options, sanitizedHtml: clone.outerHTML };
  if (!title || title.length > 220 || options.some((option) => option.text.toLowerCase() === title.toLowerCase())) {
    result.reason = 'defect question heading missing or ambiguous';
  } else if (new Set(options.map((option) => option.text.toLowerCase())).size !== options.length ||
    options.filter((option) => option.selected).length > 1 || !stateValid) {
    result.reason = 'defect option identity or selection state ambiguous';
  } else { result.ok = true; }
  return result;
}

export function verifyDefectSelection(question: DefectQuestion, requested: string): void {
  if (!question.ok || !question.questionText ||
    !hasVerifiedDefectSelection(question.options, requested)) {
    throw new Error('defect answer selection could not be verified');
  }
}

/** Same evidence rule at the plan and persistence boundaries. */
export function hasVerifiedDefectSelection(options: DefectQuestion['options'] | undefined, requested: string): boolean {
  const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
  return !!options?.length && options.every((option) => typeof option.text === 'string' &&
    !!option.text.trim() && typeof option.selected === 'boolean') &&
    new Set(options.map((option) => normalize(option.text))).size === options.length &&
    options.filter((option) => option.selected).length === 1 &&
    options.filter((option) => option.selected && normalize(option.text) === normalize(requested)).length === 1;
}
