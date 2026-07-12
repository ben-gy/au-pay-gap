// Tiny DOM helpers to keep view code terse and safe (no innerHTML for data).

type Attrs = Record<string, string | number | boolean | undefined | null>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] | string = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else if (k === 'html') node.innerHTML = String(v);
    else if (k.startsWith('data-') || k === 'role' || k === 'aria-label' || k.startsWith('aria-'))
      node.setAttribute(k, String(v));
    else if (v === true) node.setAttribute(k, '');
    else (node as any)[k] = v;
  }
  const kids = typeof children === 'string' ? [children] : children;
  for (const c of kids) node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return node;
}

export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export const NS = 'http://www.w3.org/2000/svg';
export function svgEl(tag: string, attrs: Record<string, string | number> = {}, children: Element[] = []): SVGElement {
  const node = document.createElementNS(NS, tag) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  for (const c of children) node.append(c);
  return node;
}

/** Debounce a function by `ms`. */
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  }) as T;
}

/**
 * Build a span containing text plus a glossary info icon for `term`. The icon
 * carries a data-term attribute picked up by the global tooltip handler.
 */
export function withGlossary(text: string, term: string): HTMLElement {
  const span = el('span', { class: 'gloss-wrap' }, [text]);
  span.append(
    el('button', {
      class: 'gloss-link',
      'data-term': term,
      'aria-label': `What is ${term}?`,
      type: 'button',
    }, ['ⓘ']),
  );
  return span;
}
