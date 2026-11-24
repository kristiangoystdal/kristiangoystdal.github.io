type Attrs = Record<string, string | number | boolean | EventListener | undefined | null>;
type Child = Node | string | number | false | null | undefined | Child[];

/** h('button.primary', { onclick }, 'Text') */
export function h<K extends keyof HTMLElementTagNameMap>(sel: K | `${K}.${string}` | `${K}#${string}`, attrs: Attrs = {}, ...children: Child[]) {
  const [tagAndId, ...classes] = sel.split('.');
  const [tag, id] = tagAndId.split('#');
  const el = document.createElement(tag as K);
  if (id) el.id = id;
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className += ' ' + v;
    else if (k === 'html') el.innerHTML = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

function append(el: Node, children: Child[]) {
  for (const c of children) {
    if (c === false || c === null || c === undefined) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const clear = (el: Element) => {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
};

/** Appends children, skipping false/null/undefined like h() does. */
export function add(el: Node, ...children: Child[]) {
  append(el, children);
  return el;
}

/** Replaces all children. */
export const fill = (el: Element, ...children: Child[]) => add(clear(el), ...children);
