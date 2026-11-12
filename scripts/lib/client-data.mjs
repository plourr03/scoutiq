// Turns a client file (the made-up fixtures, or a real one kept outside the repo) into checked
// database writes. Used by the emulator seed, the rules tests and the admin import script.
import path from 'node:path';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9][a-z0-9-]{1,39}$/;
// A document file: a path inside the client file's folder, plain characters, no going up.
const FILE = /^(?!.*\.\.)[A-Za-z0-9][A-Za-z0-9 ._/-]{0,199}\.(pdf|png|jpg|jpeg|docx|xlsx|txt)$/;

export const DOCUMENT_KINDS = ['estimate', 'agreement', 'other'];
export const DOCUMENT_STATUSES = ['draft', 'final', 'signed'];
export const INVOICE_STATUSES = ['due', 'paid', 'void'];
export const APP_TOOLS_INVOICE = ['', 'after-season', 'with-maintenance', 'other'];
export const PAY_BY = ['', 'online', 'check', 'other'];

// The security rules refuse 13 or more digits in a row (even with spaces, dots or hyphens
// between) in account text, so card and bank numbers cannot be stored.
const LONG_NUMBER = /([0-9][ .-]?){12}[0-9]/;

const isInt = (n) => Number.isInteger(n) && n >= 0;
const isText = (v, max) => typeof v === 'string' && v.length <= max;

/** Where a document's file lives in Storage. */
export const storagePath = (clientId, file) => `clients/${clientId}/docs/${path.posix.basename(file)}`;

/** Returns a list of problems with one client entry. An empty list means it is fine. */
export function checkClient(entry) {
  const errors = [];
  const where = (p) => `${entry?.id ?? '(no id)'}: ${p}`;
  if (!entry || typeof entry !== 'object') return ['client entry is not an object'];
  if (!ID.test(entry.id ?? '')) errors.push(where('id must be lowercase letters, digits and hyphens'));

  const members = entry.members ?? [];
  if (!Array.isArray(members)) errors.push(where('members must be a list'));
  else {
    const seen = new Set();
    for (const email of members) {
      if (typeof email !== 'string' || !EMAIL.test(email)) errors.push(where(`member "${email}" is not an email address`));
      else if (email !== email.toLowerCase()) errors.push(where(`member "${email}" must be all lowercase`));
      if (seen.has(email)) errors.push(where(`member "${email}" is listed twice`));
      seen.add(email);
    }
  }

  const c = entry.client ?? {};
  for (const key of ['name', 'projectName', 'statusLine']) {
    if (typeof c[key] !== 'string' || !c[key].trim()) errors.push(where(`client.${key} is required`));
  }
  if (c.liveSite && !/^https:\/\//.test(c.liveSite.url ?? '')) errors.push(where('client.liveSite.url must start with https://'));
  for (const [i, g] of (c.goals ?? []).entries()) {
    if (!g?.label || !g?.when) errors.push(where(`client.goals[${i}] needs a label and a when`));
  }
  const a = c.agreement ?? {};
  if (typeof a.signed !== 'boolean') errors.push(where('client.agreement.signed must be true or false'));
  for (const key of ['sentOn', 'signedOn']) {
    if (a[key] != null && !DATE.test(a[key])) errors.push(where(`client.agreement.${key} must be YYYY-MM-DD`));
  }
  if (a.signed && !a.signedOn) errors.push(where('client.agreement.signedOn is required when signed is true'));
  if (a.documentId != null && !(entry.documents ?? []).some((d) => d.id === a.documentId)) {
    errors.push(where(`client.agreement.documentId "${a.documentId}" is not in documents`));
  }
  if (c.contact?.email && !EMAIL.test(c.contact.email)) errors.push(where('client.contact.email is not an email address'));
  if (c.invoicesEmptyMessage != null && !isText(c.invoicesEmptyMessage, 300)) {
    errors.push(where('client.invoicesEmptyMessage must be text'));
  }

  const m = entry.costs?.maintenance;
  if (m) {
    for (const key of ['freeThroughSeason', 'ratePerTournamentCents', 'rateLockedThrough', 'exampleSeason']) {
      if (!isInt(m[key])) errors.push(where(`costs.maintenance.${key} must be a whole number`));
    }
    for (const s of m.seasons ?? []) {
      if (!isInt(s.year) || !(s.tournaments === null || isInt(s.tournaments))) {
        errors.push(where('costs.maintenance.seasons entries need a year and a whole number of tournaments, or null'));
      }
    }
  }
  const t = entry.costs?.appTools;
  if (t) {
    for (const key of ['annualShareCents', 'buildRateMillsPerMinute', 'checkInCents']) {
      if (!isInt(t[key])) errors.push(where(`costs.appTools.${key} must be a whole number`));
    }
  }
  const e = entry.costs?.estimate;
  if (e) {
    const n = e.years?.length ?? 0;
    if (!n || !e.years.every(isInt)) errors.push(where('costs.estimate.years must be a list of years'));
    for (const row of [...(e.rows ?? []), e.realistic].filter(Boolean)) {
      if (!row.label) errors.push(where('costs.estimate rows need a label'));
      if (!Array.isArray(row.cents) || row.cents.length !== n || !row.cents.every(isInt)) {
        errors.push(where(`costs.estimate row "${row.label}" needs ${n} whole-cent amounts`));
      }
      if (row.payer && !['scoutiq', 'direct', 'none', 'players'].includes(row.payer)) {
        errors.push(where(`costs.estimate row "${row.label}" has an unknown payer`));
      }
    }
    // An optional cross-check: the totals as written in the estimate the client already has.
    if (e.expectedTotalsCents) {
      const sums = e.years.map((_, i) => (e.rows ?? []).reduce((s, r) => s + (r.cents?.[i] ?? 0), 0));
      if (JSON.stringify(sums) !== JSON.stringify(e.expectedTotalsCents)) {
        errors.push(where(`costs.estimate rows add up to ${sums.join(', ')}, not the expected ${e.expectedTotalsCents.join(', ')}`));
      }
    }
  }
  for (const [i, b] of (entry.buildLog ?? []).entries()) {
    if (!ID.test(b.id ?? '') || !DATE.test(b.date ?? '') || !b.what || !isInt(b.minutes)) {
      errors.push(where(`buildLog[${i}] needs an id, a YYYY-MM-DD date, what was built and whole minutes`));
    }
  }

  const docIds = new Set();
  for (const [i, d] of (entry.documents ?? []).entries()) {
    const at = `documents[${i}]${d?.id ? ` (${d.id})` : ''}`;
    if (!ID.test(d?.id ?? '')) errors.push(where(`${at} needs an id of lowercase letters, digits and hyphens`));
    if (docIds.has(d?.id)) errors.push(where(`${at} id is used twice`));
    docIds.add(d?.id);
    if (!d?.title || !isText(d.title, 160)) errors.push(where(`${at} needs a title`));
    if (!DOCUMENT_KINDS.includes(d?.kind)) errors.push(where(`${at} kind must be ${DOCUMENT_KINDS.join(', ')}`));
    if (!DOCUMENT_STATUSES.includes(d?.status)) errors.push(where(`${at} status must be ${DOCUMENT_STATUSES.join(', ')}`));
    if (!DATE.test(d?.date ?? '')) errors.push(where(`${at} date must be YYYY-MM-DD`));
    const hasUrl = typeof d?.url === 'string' && d.url !== '';
    const hasFile = typeof d?.file === 'string' && d.file !== '';
    if (hasUrl === hasFile) errors.push(where(`${at} needs either a url (an outside link) or a file, not both and not neither`));
    if (hasUrl && !/^https:\/\/\S+$/.test(d.url)) errors.push(where(`${at} url must start with https://`));
    if (hasFile && !FILE.test(d.file)) errors.push(where(`${at} file must be a plain path like docs/estimate.pdf`));
  }
  const fileNames = (entry.documents ?? []).filter((d) => d?.file).map((d) => path.posix.basename(d.file));
  if (new Set(fileNames).size !== fileNames.length) errors.push(where('two documents use files with the same name'));

  const invoiceIds = new Set();
  for (const [i, v] of (entry.invoices ?? []).entries()) {
    const at = `invoices[${i}]${v?.id ? ` (${v.id})` : ''}`;
    if (!ID.test(v?.id ?? '')) errors.push(where(`${at} needs an id of lowercase letters, digits and hyphens`));
    if (invoiceIds.has(v?.id)) errors.push(where(`${at} id is used twice`));
    invoiceIds.add(v?.id);
    if (!v?.number || !isText(v.number, 40)) errors.push(where(`${at} needs a number`));
    if (!DATE.test(v?.date ?? '')) errors.push(where(`${at} date must be YYYY-MM-DD`));
    if (!v?.covers || !isText(v.covers, 200)) errors.push(where(`${at} needs a line saying what it covers`));
    if (!isInt(v?.amountCents)) errors.push(where(`${at} amountCents must be a whole number`));
    if (!INVOICE_STATUSES.includes(v?.status)) errors.push(where(`${at} status must be ${INVOICE_STATUSES.join(', ')}`));
    if (!/^https:\/\/\S+$/.test(v?.url ?? '')) errors.push(where(`${at} url must be the invoice's own https:// page`));
  }

  const acc = entry.account;
  if (acc) {
    // The same limits as the security rules, so a client can always save what was imported.
    const limits = { billingName: 120, contactName: 120, email: 254, phone: 40 };
    for (const [key, max] of Object.entries(limits)) {
      if (!isText(acc[key] ?? '', max)) errors.push(where(`account.${key} must be text of at most ${max} characters`));
    }
    if (acc.email && !EMAIL.test(acc.email)) errors.push(where('account.email is not an email address'));
    if (!/^[0-9 ()+.-]*$/.test(acc.phone ?? '') || (acc.phone ?? '').replace(/\D/g, '').length > 15) {
      errors.push(where('account.phone may hold only digits, spaces and + ( ) . - (at most 15 digits)'));
    }
    const freeText = [acc.billingName, acc.contactName, ...Object.values(acc.mailingAddress ?? {}),
      acc.preferences?.appToolsNote, acc.preferences?.payNote];
    if (freeText.some((v) => typeof v === 'string' && LONG_NUMBER.test(v))) {
      errors.push(where('account holds a long run of digits; card and bank numbers never go here'));
    }
    const addr = acc.mailingAddress ?? {};
    const addrLimits = { line1: 120, line2: 120, city: 80, state: 40, postalCode: 20 };
    for (const key of Object.keys(addr)) if (!(key in addrLimits)) errors.push(where(`account.mailingAddress.${key} is not a known field`));
    for (const [key, max] of Object.entries(addrLimits)) {
      if (!isText(addr[key] ?? '', max)) errors.push(where(`account.mailingAddress.${key} must be text of at most ${max} characters`));
    }
    const p = acc.preferences ?? {};
    if (!APP_TOOLS_INVOICE.includes(p.appToolsInvoice ?? '')) {
      errors.push(where('account.preferences.appToolsInvoice must be after-season, with-maintenance, other, or empty'));
    }
    if (!PAY_BY.includes(p.payBy ?? '')) errors.push(where('account.preferences.payBy must be online, check, other, or empty'));
    for (const key of ['appToolsNote', 'payNote']) {
      if (!isText(p[key] ?? '', 500)) errors.push(where(`account.preferences.${key} must be text of at most 500 characters`));
    }
  }
  return errors;
}

/** The account details exactly as the rules expect them, with every field present. */
export function normalAccount(acc = {}) {
  const addr = acc.mailingAddress ?? {};
  const p = acc.preferences ?? {};
  return {
    billingName: acc.billingName ?? '',
    contactName: acc.contactName ?? '',
    email: (acc.email ?? '').trim(),
    phone: acc.phone ?? '',
    mailingAddress: {
      line1: addr.line1 ?? '', line2: addr.line2 ?? '', city: addr.city ?? '', state: addr.state ?? '', postalCode: addr.postalCode ?? '',
    },
    preferences: {
      appToolsInvoice: p.appToolsInvoice ?? '', appToolsNote: p.appToolsNote ?? '', payBy: p.payBy ?? '', payNote: p.payNote ?? '',
    },
  };
}

// Keys starting with an underscore are notes for whoever edits the file; they are not stored.
const withoutNotes = (obj) => Object.fromEntries(Object.entries(obj).filter(([k]) => !k.startsWith('_')));

/**
 * The writes for one client, as [path, data] pairs. `now` is the timestamp to stamp on the
 * account record (a Date, or the database's server time value).
 */
export function clientWrites(entry, now) {
  const base = `clients/${entry.id}`;
  const writes = [[base, withoutNotes({ ...entry.client })]];
  for (const email of entry.members ?? []) writes.push([`${base}/members/${email}`, { email }]);
  if (entry.costs) writes.push([`${base}/data/costs`, withoutNotes(entry.costs)]);
  for (const { id, ...line } of entry.buildLog ?? []) writes.push([`${base}/buildLog/${id}`, line]);
  if (entry.account) {
    writes.push([
      `${base}/account/details`,
      { ...normalAccount(entry.account), updatedBy: 'scoutiq-import', updatedAt: now, lastChangeId: '' },
    ]);
  }
  for (const { id, file, url, ...doc } of entry.documents ?? []) {
    const data = { ...doc };
    if (file) Object.assign(data, { path: storagePath(entry.id, file), fileName: path.posix.basename(file) });
    else data.url = url;
    writes.push([`${base}/documents/${id}`, data]);
  }
  for (const { id, ...inv } of entry.invoices ?? []) writes.push([`${base}/invoices/${id}`, inv]);
  return writes;
}

/** The document files to upload for one client: local path (relative to the client file) and Storage path. */
export function fileUploads(entry) {
  return (entry.documents ?? [])
    .filter((d) => d.file)
    .map((d) => ({ local: d.file, remote: storagePath(entry.id, d.file), contentType: contentType(d.file) }));
}

/** True when a live import would send document files while file storage is switched off. */
export function filesBlocked({ entries, live, fileStorage }) {
  return live && !fileStorage && entries.some((e) => fileUploads(e).length > 0);
}

function contentType(file) {
  const ext = path.posix.extname(file).toLowerCase();
  return {
    '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.txt': 'text/plain',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }[ext] ?? 'application/octet-stream';
}
