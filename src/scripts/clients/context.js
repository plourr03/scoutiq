// What every client area screen shares: the words, the settings, the signed-in state and the
// small builders for strips, links and sheet tables.
import { h, mount } from './dom.js';
import { isLocal } from './firebase.js';
import { fill } from './format.js';

export const copy = JSON.parse(document.getElementById('client-copy').textContent);
export const settings = JSON.parse(document.getElementById('client-settings').textContent);

// On this computer only: ?flags=emailLinkSignIn,fileStorage,stripePortal turns those switches on,
// so both sides of each switch can be tried on the emulators. Ignored on any real address.
if (isLocal) {
  const asked = new URLSearchParams(location.search).get('flags');
  let saved = '';
  try {
    if (asked !== null) sessionStorage.setItem('scoutiqTestFlags', asked);
    saved = sessionStorage.getItem('scoutiqTestFlags') ?? '';
  } catch {
    saved = asked ?? '';
  }
  for (const flag of saved.split(',')) {
    if (flag === 'emailLinkSignIn' || flag === 'fileStorage') settings[flag] = true;
    if (flag === 'stripePortal') settings.stripePortalUrl = 'https://billing.stripe.com/p/login/test_sample';
  }
}

export const state = { user: null, admin: false, access: null, cache: new Map(), firstRender: true, signInError: false };
export const fb = { app: null, auth: null, db: null };
export const main = document.getElementById('main');

export const heading = (text) => h('h1', { tabindex: '-1' }, text);
export const strip = (...content) => h('p', { class: 'strip' }, ...content);
export const proposedLabel = (client) => (client.agreement?.signed ? null : h('p', { class: 'proposed' }, copy.proposed));
export const mailto = (email, subject) => `mailto:${email}?subject=${encodeURIComponent(subject)}`;
export const contactLink = () => mailto(settings.contactEmail, settings.contactSubject);
export const newTabNote = () => h('span', { class: 'vh' }, ` ${copy.documents.newTab}`);

/**
 * Words with a link inside: "Trouble signing in? [Email us]." becomes text with "Email us" as a
 * link to `href`. Without an href the brackets are simply dropped.
 */
export function linked(template, href, values = {}, attrs = {}) {
  const text = fill(template, values);
  const m = text.match(/^([\s\S]*?)\[([\s\S]+?)\]([\s\S]*)$/);
  if (!m) return [text];
  if (!href) return [m[1] + m[2] + m[3]];
  return [m[1], h('a', { href, ...attrs }, m[2]), m[3]];
}

/** Puts a screen into <main>. After the first screen, focus moves to its heading. */
export function render(...children) {
  mount(main, h('div', { class: 'page-grid view' }, h('div', { class: 'view-body' }, ...children)));
  markScrollers();
  if (state.firstRender) state.firstRender = false;
  else main.querySelector('h1')?.focus();
}

/**
 * A sheet-style table: square corners, Line grid lines, Cell header row. A cell is text, or
 * { text, muted: true } for a value that is not set yet.
 */
export function sheetTable(head, rows, { numeric = [], foot = [], footClass = [], wide = false, label = '' } = {}) {
  const cell = (tag, value, i, extra = {}) => {
    const muted = value && typeof value === 'object';
    const classes = [numeric.includes(i) ? 'num' : '', muted ? 'muted' : ''].filter(Boolean).join(' ') || null;
    return h(tag, { class: classes, ...extra }, muted ? value.text : value);
  };
  const line = (row) => row.map((value, i) => (i === 0 ? cell('th', value, i, { scope: 'row' }) : cell('td', value, i)));
  const table = h(
    'table',
    { class: 'sheet' },
    h('thead', null, h('tr', null, head.map((text, i) => cell('th', text, i, { scope: 'col' })))),
    h('tbody', null, rows.map((row) => h('tr', null, line(row)))),
    foot.length ? h('tfoot', null, foot.map((row, r) => h('tr', { class: footClass[r] || null }, line(row)))) : null,
  );
  return [
    h('p', { class: 'scroll-hint', 'aria-hidden': 'true' }, copy.costs.scrollHint),
    h('div', { class: wide ? 'sheet-scroll wide' : 'sheet-scroll', 'data-label': label }, table),
  ];
}

/** A table wider than the screen scrolls inside its own box. Then it says so, and it can be
 *  scrolled from the keyboard. */
export function markScrollers() {
  for (const box of main.querySelectorAll('.sheet-scroll')) {
    const scrolls = box.scrollWidth > box.clientWidth + 1;
    box.previousElementSibling?.classList.toggle('show', scrolls);
    if (scrolls) {
      box.setAttribute('tabindex', '0');
      box.setAttribute('role', 'region');
      box.setAttribute('aria-label', box.dataset.label || '');
    } else {
      box.removeAttribute('tabindex');
      box.removeAttribute('role');
      box.removeAttribute('aria-label');
    }
  }
}
