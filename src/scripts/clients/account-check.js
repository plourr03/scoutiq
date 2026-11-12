// What invoicing needs from a client's account details, checked one way everywhere: the Account
// screens, the "finish setting up" screen, the admin view and the unit tests. The security rules
// (completeAccount in firestore.rules) hold every member's save to the same standard.
// The import may still create an account with blanks: that is how a client starts.

export const TEXT_KEYS = ['billingName', 'contactName', 'email', 'phone'];
export const ADDRESS_KEYS = ['line1', 'line2', 'city', 'state', 'postalCode'];
export const OPTIONAL = new Set(['line2']);
export const CHOICES = [
  { key: 'appToolsInvoice', note: 'appToolsNote' },
  { key: 'payBy', note: 'payNote' },
];

// Card and bank numbers do not belong here: no run of 13 or more digits (in any script), even
// with up to two spaces, dots, slashes, underscores or hyphens between them.
const LONG_NUMBER = /(\p{Nd}[ ./_-]{0,2}){12}\p{Nd}/u;
const PHONE_CHARS = /^[0-9 ()+.-]*$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ZIP = /^[0-9]{5}(-[0-9]{4})?$/;
const digits = (v) => v.replace(/\D/g, '').length;

/**
 * Every field is one line of visible text. Line breaks, tabs and invisible formatting
 * characters (the rules refuse them) become plain spaces, and the ends are trimmed.
 */
export const clean = (value) => String(value ?? '').replace(/[\p{Cc}\p{Cf}]+/gu, ' ').trim();

/** Every account field by its own name (each name is different), blank when missing. */
export function fieldsOf(acc) {
  const a = acc?.mailingAddress ?? {};
  const p = acc?.preferences ?? {};
  return {
    billingName: acc?.billingName ?? '',
    contactName: acc?.contactName ?? '',
    email: acc?.email ?? '',
    phone: acc?.phone ?? '',
    line1: a.line1 ?? '',
    line2: a.line2 ?? '',
    city: a.city ?? '',
    state: a.state ?? '',
    postalCode: a.postalCode ?? '',
    appToolsInvoice: p.appToolsInvoice ?? '',
    appToolsNote: p.appToolsNote ?? '',
    payBy: p.payBy ?? '',
    payNote: p.payNote ?? '',
  };
}

/**
 * The problem with one text field, as a key into the account copy, or '' when it is fine.
 * `required` defaults to whether the field is needed for invoicing.
 */
export function problemWith(key, value, required = !OPTIONAL.has(key)) {
  const v = clean(value);
  if (!v) return required ? 'required' : '';
  if (key === 'phone') {
    if (!PHONE_CHARS.test(v) || digits(v) > 15) return 'phoneFormat';
    return digits(v) < 10 ? 'phoneDigits' : '';
  }
  if (key === 'email') {
    if (LONG_NUMBER.test(v)) return 'noCardNumbers';
    return EMAIL.test(v) ? '' : 'emailFormat';
  }
  if (key === 'postalCode') return ZIP.test(v) ? '' : 'zipFormat';
  return LONG_NUMBER.test(v) ? 'noCardNumbers' : '';
}

/** The fields that keep the account from being complete, each with its problem. */
export function missing(acc) {
  const f = fieldsOf(acc);
  const out = [];
  for (const key of [...TEXT_KEYS, ...ADDRESS_KEYS]) {
    const problem = problemWith(key, f[key]);
    if (problem) out.push({ key, problem });
  }
  for (const { key, note } of CHOICES) {
    if (!f[key]) out.push({ key, problem: 'choose' });
    else if (f[key] === 'other' && !f[note].trim()) out.push({ key: note, problem: 'noteNeeded' });
    else if (f[key] === 'other' && problemWith(note, f[note])) out.push({ key: note, problem: problemWith(note, f[note]) });
  }
  return out;
}

export const isComplete = (acc) => missing(acc).length === 0;
