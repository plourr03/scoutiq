// The Account screen. A member keeps their billing and contact details and two preferences up
// to date. Each save writes the details and a change record together (the security rules
// insist on both). The admin sees the same details read only, plus the change record.
import {
  collection, doc, getDocs, limit, orderBy, query, serverTimestamp, writeBatch,
} from 'firebase/firestore/lite';
import { h } from './dom.js';
import { copy, fb, heading, render, state } from './context.js';
import { fill } from './format.js';

const TEXT_FIELDS = [
  ['billingName', 120, 'organization', true],
  ['contactName', 120, 'name', true],
  ['email', 254, 'email', true],
  ['phone', 40, 'tel', false],
];
const ADDRESS_FIELDS = [
  ['line1', 120, 'address-line1'],
  ['line2', 120, 'address-line2'],
  ['city', 80, 'address-level2'],
  ['state', 40, 'address-level1'],
  ['postalCode', 20, 'postal-code'],
];
const CHOICES = [
  ['appToolsInvoice', 'appToolsNote', 'appToolsOptions'],
  ['payBy', 'payNote', 'payOptions'],
];

/** Every field present, in the shape the rules expect. */
function normal(acc = {}) {
  const addr = acc.mailingAddress ?? {};
  const p = acc.preferences ?? {};
  return {
    billingName: acc.billingName ?? '',
    contactName: acc.contactName ?? '',
    email: acc.email ?? '',
    phone: acc.phone ?? '',
    mailingAddress: Object.fromEntries(ADDRESS_FIELDS.map(([k]) => [k, addr[k] ?? ''])),
    preferences: {
      appToolsInvoice: p.appToolsInvoice ?? '', appToolsNote: p.appToolsNote ?? '', payBy: p.payBy ?? '', payNote: p.payNote ?? '',
    },
  };
}

/** One flat list of field name and value; every field name is different, so it reads simply. */
const flat = (a) => ({ ...a, ...a.mailingAddress, ...a.preferences, mailingAddress: undefined, preferences: undefined });

function fieldLabel(key) {
  const t = copy.account;
  return t.labels[key] ?? t[key] ?? key;
}

function shownValue(key, value) {
  const t = copy.account;
  if (!value) return key === 'appToolsInvoice' || key === 'payBy' ? t.notChosen : t.blank;
  if (key === 'appToolsInvoice') return t.appToolsOptions[value] ?? value;
  if (key === 'payBy') return t.payOptions[value] ?? value;
  return value;
}

export async function showAccount(id, data) {
  const account = normal(data.account ?? {});
  if (state.admin) return showReadOnly(id, account);
  return showForm(id, data, account);
}

// The same limits as the security rules: no card or bank numbers (13 or more digits in a row,
// even with spaces, dots or hyphens between), a plain phone number, a whole email address.
const LONG_NUMBER = /([0-9][ .-]?){12}[0-9]/;
const PHONE = /^[0-9 ()+.-]*$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The problem with one field's value, in plain words, or '' when it is fine. */
function problemWith(input) {
  const t = copy.account;
  const v = input.value.trim();
  if (input.required && !v) return t.required;
  if (input.name === 'phone') return !PHONE.test(v) || v.replace(/\D/g, '').length > 15 ? t.phoneFormat : '';
  if (input.name === 'email') return v && !EMAIL.test(v) ? t.emailFormat : '';
  return LONG_NUMBER.test(v) ? t.noCardNumbers : '';
}

/**
 * Shows a field's problem (or clears it) as a line of text under the field. The line is tied to
 * the field, so a screen reader reads it with the field, and it is a polite live region, so a
 * change while typing is announced too.
 */
function showProblem(input) {
  const line = document.getElementById(`${input.id}-problem`);
  const problem = problemWith(input);
  if (line.textContent !== problem) line.textContent = problem;
  if (problem) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
  return problem;
}

// ---------- The member's form ----------
function showForm(id, data, account) {
  const t = copy.account;
  const inputs = {};
  const status = h('span', { class: 'vh', role: 'status' });
  const error = h('p', { class: 'notice', role: 'alert', hidden: true }, t.saveError);
  const button = h('button', { type: 'submit', class: 'btn btn--primary' }, t.save);
  const touched = () => {
    button.textContent = t.save;
    status.textContent = '';
  };

  // Checked the same way the security rules check it, all together on Save, then again as the
  // person fixes a field that has a problem. Not on leaving a field: a line appearing then would
  // push Save down the page between pressing and releasing it, and the click would miss.
  const input = (attrs) => {
    const el = h('input', {
      ...attrs,
      'aria-describedby': `${attrs.id}-problem`,
      oninput: () => {
        touched();
        if (el.hasAttribute('aria-invalid')) showProblem(el);
      },
    });
    return el;
  };
  const problemLine = (el) => h('p', { class: 'field-problem', id: `${el.id}-problem`, 'aria-live': 'polite' });

  const textField = ([key, max, autocomplete, required], value) => {
    const el = input({
      id: `acc-${key}`, name: key, type: key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text',
      maxlength: max, autocomplete, required: required || null, value,
    });
    inputs[key] = el;
    return h('div', { class: 'field' }, h('label', { for: el.id }, t[key]), el, problemLine(el));
  };

  const choice = ([key, noteKey, optionsKey]) => {
    const current = account.preferences[key];
    const note = input({ id: `acc-${noteKey}`, name: noteKey, type: 'text', maxlength: 500, value: account.preferences[noteKey] });
    inputs[noteKey] = note;
    const noteField = h('div', { class: 'field note-field', hidden: current !== 'other' }, h('label', { for: note.id }, t.note), note, problemLine(note));
    const radios = Object.entries(t[optionsKey]).map(([value, label]) => {
      const radio = h('input', {
        type: 'radio', name: key, id: `acc-${key}-${value}`, value, checked: value === current || null,
        onchange: () => {
          noteField.hidden = value !== 'other';
          touched();
        },
      });
      return h('div', { class: 'choice' }, radio, h('label', { for: radio.id }, label));
    });
    return h('fieldset', { class: 'choices' }, h('legend', null, t[key]), radios, noteField);
  };

  const form = h(
    'form',
    {
      class: 'account-form',
      // Problems show as text under each field, not in the browser's own bubbles.
      novalidate: true,
      onsubmit: async (event) => {
        event.preventDefault();
        const shown = Object.values(inputs).filter((el) => !el.closest('[hidden]'));
        const firstProblem = shown.filter((el) => showProblem(el))[0];
        if (firstProblem) {
          firstProblem.focus();
          return;
        }
        error.hidden = true;
        const next = readForm(form, inputs);
        const before = flat(account);
        const after = flat(next);
        const changes = {};
        for (const key of Object.keys(after)) {
          if (after[key] === undefined || after[key] === before[key]) continue;
          changes[key] = { from: before[key] ?? '', to: after[key] };
        }
        if (!Object.keys(changes).length) {
          button.textContent = t.saved;
          status.textContent = t.saved;
          return;
        }
        button.disabled = true;
        button.textContent = t.saving;
        try {
          await save(id, next, changes);
          Object.assign(account, next);
          data.account = { ...data.account, ...next };
          button.textContent = t.saved;
          status.textContent = t.saved;
        } catch {
          button.textContent = t.save;
          error.hidden = false;
        } finally {
          button.disabled = false;
        }
      },
    },
    TEXT_FIELDS.map((f) => textField(f, account[f[0]])),
    h(
      'fieldset',
      { class: 'address' },
      h('legend', null, t.address),
      ADDRESS_FIELDS.map(([key, max, autocomplete]) => textField([key, max, autocomplete, false], account.mailingAddress[key])),
    ),
    CHOICES.map(choice),
    error,
    h('div', { class: 'actions' }, button, status),
  );

  render(heading(copy.sections.account), h('p', { class: 'lede' }, t.lede), form);
}

function readForm(form, inputs) {
  const value = (key) => inputs[key].value.trim();
  const picked = (name) => form.querySelector(`input[name="${name}"]:checked`)?.value ?? '';
  const appToolsInvoice = picked('appToolsInvoice');
  const payBy = picked('payBy');
  return {
    billingName: value('billingName'),
    contactName: value('contactName'),
    email: value('email'),
    phone: value('phone'),
    mailingAddress: Object.fromEntries(ADDRESS_FIELDS.map(([k]) => [k, value(k)])),
    preferences: {
      appToolsInvoice,
      appToolsNote: appToolsInvoice === 'other' ? value('appToolsNote') : '',
      payBy,
      payNote: payBy === 'other' ? value('payNote') : '',
    },
  };
}

async function save(id, next, changes) {
  const me = state.user.email.toLowerCase();
  const batch = writeBatch(fb.db);
  const changeRef = doc(collection(fb.db, `clients/${id}/accountChanges`));
  batch.update(doc(fb.db, `clients/${id}/account/details`), {
    ...next, updatedBy: me, updatedAt: serverTimestamp(), lastChangeId: changeRef.id,
  });
  batch.set(changeRef, { by: me, at: serverTimestamp(), changes });
  await batch.commit();
}

// ---------- The admin's read-only view and the change record ----------
async function showReadOnly(id, account) {
  const t = copy.account;
  const rows = Object.entries(flat(account)).filter(([, v]) => v !== undefined);
  const snap = await getDocs(query(collection(fb.db, `clients/${id}/accountChanges`), orderBy('at', 'desc'), limit(100)));
  const when = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' });
  const changes = snap.docs.map((d) => d.data());
  render(
    heading(copy.sections.account),
    h('p', { class: 'notice' }, t.readOnly),
    h('dl', { class: 'sheet-list' }, rows.map(([key, value]) => h('div', null, h('dt', null, fieldLabel(key)), h('dd', null, shownValue(key, value))))),
    h(
      'section',
      { class: 'block', 'aria-labelledby': 'changes' },
      h('h2', { id: 'changes' }, t.changes),
      changes.length
        ? h(
            'ul',
            { class: 'item-list' },
            changes.map((c) =>
              h(
                'li',
                { class: 'change' },
                h('p', { class: 'meta' }, fill(t.changeBy, { when: c.at?.toDate ? when.format(c.at.toDate()) : '', who: c.by })),
                h(
                  'ul',
                  null,
                  Object.entries(c.changes ?? {}).map(([key, v]) =>
                    h('li', null, fill(t.changeLine, { field: fieldLabel(key), from: shownValue(key, v?.from), to: shownValue(key, v?.to) }))),
                ),
              )),
          )
        : h('p', null, t.noChanges),
    ),
  );
}
