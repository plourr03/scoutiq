// The Account screen, and the "Finish setting up your account" screen that comes before
// everything else while the details needed for invoicing are not complete. Both use the same
// form and the same checks (account-check.js), and the security rules insist on them too.
// Each save writes the details and a change record together. The admin sees the details
// read only, plus the change record, and is never held at the finish screen.
import {
  collection, doc, getDocs, limit, orderBy, query, serverTimestamp, writeBatch,
} from 'firebase/firestore/lite';
import {
  ADDRESS_KEYS, CHOICES, OPTIONAL, TEXT_KEYS, clean, fieldsOf, isComplete, problemWith,
} from './account-check.js';
import { h } from './dom.js';
import { contactLink, copy, fb, heading, linked, render, state } from './context.js';
import { fill } from './format.js';

const MAX = { billingName: 120, contactName: 120, email: 254, phone: 40, line1: 120, line2: 120, city: 80, state: 40, postalCode: 20 };
const AUTOCOMPLETE = {
  billingName: 'organization', contactName: 'name', email: 'email', phone: 'tel',
  line1: 'address-line1', line2: 'address-line2', city: 'address-level2', state: 'address-level1', postalCode: 'postal-code',
};
const OPTIONS = { appToolsInvoice: 'appToolsOptions', payBy: 'payOptions' };

/** Every field present, in the shape the rules expect. */
function normal(acc) {
  const f = fieldsOf(acc);
  return {
    billingName: f.billingName,
    contactName: f.contactName,
    email: f.email,
    phone: f.phone,
    mailingAddress: Object.fromEntries(ADDRESS_KEYS.map((k) => [k, f[k]])),
    preferences: { appToolsInvoice: f.appToolsInvoice, appToolsNote: f.appToolsNote, payBy: f.payBy, payNote: f.payNote },
  };
}

function fieldLabel(key) {
  const t = copy.account;
  return t.labels[key] ?? t[key] ?? key;
}

function shownValue(key, value) {
  const t = copy.account;
  if (!value) return key in OPTIONS ? t.notChosen : t.blank;
  if (key in OPTIONS) return t[OPTIONS[key]][value] ?? value;
  return value;
}

export async function showAccount(id, data) {
  const account = normal(data.account);
  if (state.admin) return showReadOnly(id, account);
  return showForm(id, data, account, { finishing: false });
}

/** The screen a member sees first while the account is not complete. `done` goes on to Overview. */
export function showFinish(id, data, done) {
  return showForm(id, data, normal(data.account), { finishing: true, done });
}

// ---------- The member's form ----------
function showForm(id, data, account, { finishing, done }) {
  const t = copy.account;
  const f = copy.finish;
  const values = fieldsOf(account);
  const inputs = {};
  const groups = {};
  const status = h('span', { class: 'vh', role: 'status' });
  const error = h('p', { class: 'notice', role: 'alert', hidden: true }, t.saveError);
  const label = finishing ? f.save : t.save;
  const button = h('button', { type: 'submit', class: 'btn btn--primary' }, label);
  const touched = () => {
    button.textContent = label;
    status.textContent = '';
  };

  // A field's problem shows as a line of text under it. The line is tied to the field, so a
  // screen reader reads it with the field, and it is a polite live region, so a change while
  // typing is announced too.
  const problemLine = (id) => h('p', { class: 'field-problem', id: `${id}-problem`, 'aria-live': 'polite' });
  const setProblem = (lineId, targets, problem) => {
    const line = document.getElementById(`${lineId}-problem`);
    const text = problem ? t[problem] : '';
    if (line.textContent !== text) line.textContent = text;
    for (const el of targets) {
      if (problem) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
    }
    return problem;
  };

  // Checked all together on Save, then again as the person fixes a field that has a problem.
  // Not on leaving a field: a line appearing then would push Save down the page between
  // pressing and releasing it, and the click would miss.
  const checkText = (el) => {
    const note = el.dataset.note === 'true';
    let problem = problemWith(el.name, el.value, note || !OPTIONAL.has(el.name));
    if (note && problem === 'required') problem = 'noteNeeded';
    return setProblem(el.id, [el], problem);
  };
  const checkChoice = ({ key, radios }) => setProblem(`acc-${key}`, radios, radios.some((r) => r.checked) ? '' : 'choose');

  const input = (attrs) => {
    const el = h('input', {
      ...attrs,
      'aria-describedby': `${attrs.id}-problem`,
      oninput: () => {
        touched();
        if (el.hasAttribute('aria-invalid')) checkText(el);
      },
    });
    inputs[attrs.name] = el;
    return el;
  };

  const textField = (key) => {
    const required = !OPTIONAL.has(key);
    const el = input({
      id: `acc-${key}`, name: key, type: key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text',
      maxlength: MAX[key], autocomplete: AUTOCOMPLETE[key], required: required || null, value: values[key],
      inputmode: key === 'postalCode' ? 'numeric' : null,
    });
    return h('div', { class: 'field' }, h('label', { for: el.id }, t[key]), el, problemLine(el.id));
  };

  const choice = ({ key, note: noteKey }) => {
    const current = values[key];
    const note = input({ id: `acc-${noteKey}`, name: noteKey, type: 'text', maxlength: 500, value: values[noteKey], 'data-note': 'true' });
    const noteField = h('div', { class: 'field note-field', hidden: current !== 'other' }, h('label', { for: note.id }, t.note), note, problemLine(note.id));
    const radios = [];
    const rows = Object.entries(t[OPTIONS[key]]).map(([value, text]) => {
      const radio = h('input', {
        type: 'radio', name: key, id: `acc-${key}-${value}`, value, checked: value === current || null, required: true,
        'aria-describedby': `acc-${key}-problem`,
        onchange: () => {
          noteField.hidden = value !== 'other';
          touched();
          if (radio.hasAttribute('aria-invalid')) checkChoice(groups[key]);
        },
      });
      radios.push(radio);
      return h('div', { class: 'choice' }, radio, h('label', { for: radio.id }, text));
    });
    groups[key] = { key, radios };
    return h('fieldset', { class: 'choices', id: `acc-${key}` }, h('legend', null, t[key]), problemLine(`acc-${key}`), rows, noteField);
  };

  const form = h(
    'form',
    {
      class: 'account-form',
      // Problems show as text under each field, not in the browser's own bubbles.
      novalidate: true,
      onsubmit: async (event) => {
        event.preventDefault();
        const order = [
          ...TEXT_KEYS.map((k) => inputs[k]),
          ...ADDRESS_KEYS.map((k) => inputs[k]),
          ...CHOICES.flatMap(({ key, note }) => [groups[key], inputs[note]]),
        ];
        let first = null;
        for (const item of order) {
          if (item.radios) {
            if (checkChoice(item)) first ??= item.radios[0];
          } else if (!item.closest('[hidden]')) {
            if (checkText(item)) first ??= item;
          } else {
            setProblem(item.id, [item], '');
          }
        }
        if (first) {
          first.focus();
          return;
        }
        error.hidden = true;
        const next = readForm(form, inputs);
        const before = fieldsOf(account);
        const after = fieldsOf(next);
        const changes = {};
        for (const key of Object.keys(after)) {
          if (after[key] !== before[key]) changes[key] = { from: before[key], to: after[key] };
        }
        if (!Object.keys(changes).length) {
          if (finishing && isComplete(next)) return done();
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
          if (finishing) return done();
          button.textContent = t.saved;
          status.textContent = t.saved;
        } catch {
          button.textContent = label;
          error.hidden = false;
        } finally {
          button.disabled = false;
        }
      },
    },
    TEXT_KEYS.map(textField),
    h('fieldset', { class: 'address' }, h('legend', null, t.address), ADDRESS_KEYS.map(textField)),
    CHOICES.map(choice),
    error,
    h('div', { class: 'actions' }, button, status),
  );

  if (finishing) {
    render(heading(f.heading), h('p', { class: 'lede' }, f.lede), form, h('p', { class: 'finish-help' }, ...linked(f.questions, contactLink())));
  } else {
    render(heading(copy.sections.account), h('p', { class: 'lede' }, t.lede), form);
  }
}

function readForm(form, inputs) {
  const value = (key) => clean(inputs[key].value);
  const picked = (name) => form.querySelector(`input[name="${name}"]:checked`)?.value ?? '';
  const appToolsInvoice = picked('appToolsInvoice');
  const payBy = picked('payBy');
  return {
    billingName: value('billingName'),
    contactName: value('contactName'),
    email: value('email'),
    phone: value('phone'),
    mailingAddress: Object.fromEntries(ADDRESS_KEYS.map((k) => [k, value(k)])),
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
  const rows = Object.entries(fieldsOf(account));
  const snap = await getDocs(query(collection(fb.db, `clients/${id}/accountChanges`), orderBy('at', 'desc'), limit(100)));
  const when = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' });
  const changes = snap.docs.map((d) => d.data());
  render(
    heading(copy.sections.account),
    isComplete(account) ? null : h('p', { class: 'strip' }, t.notFinished),
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
