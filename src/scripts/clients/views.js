// The read-only screens: Overview, Costs, Documents and Invoices.
// Every number and name comes from the database; nothing about a client is in this code.
import { isComplete } from './account-check.js';
import { h } from './dom.js';
import {
  contactLink, copy, heading, httpsLink, linked, mailto, newTabNote, proposedLabel, render, settings, sheetTable, state, strip,
} from './context.js';
import {
  buildLineCents, estimateTotals, fill, hourlyCents, longDate, maintenanceCents, money, shortDate, sum,
} from './format.js';

// ---------- The agreement sentence, shared by Overview and Documents ----------
function agreementStrip(id, { client, documents }, withLink) {
  const t = copy.overview;
  const a = client.agreement ?? {};
  const docId = a.documentId ?? documents.find((d) => d.kind === 'agreement')?.id;
  const href = withLink && docId && documents.some((d) => d.id === docId) ? `/clients/${id}/documents#doc-${docId}` : null;
  if (a.signed && a.signedOn) return strip(...linked(t.agreementSigned, href, { date: longDate(a.signedOn) }, { 'data-nav': true }));
  if (a.sentOn) return strip(...linked(t.agreementDraft, href, { date: longDate(a.sentOn) }, { 'data-nav': true }));
  return strip(t.agreementNone);
}

// ---------- Overview ----------
export function showOverview(id, data) {
  const t = copy.overview;
  const { client } = data;
  const contact = client.contact ?? {};
  const liveSite = httpsLink(client.liveSite?.url);
  const emailLink = mailto(contact.email, client.projectName);
  render(
    heading(copy.sections.overview),
    state.admin && !isComplete(data.account)
      ? strip(...linked(copy.account.notFinishedLink, `/clients/${id}/account`, {}, { 'data-nav': true }))
      : null,
    agreementStrip(id, data, true),
    h(
      'section',
      { class: 'block', 'aria-labelledby': 'project' },
      h('h2', { id: 'project' }, client.projectName),
      h('p', null, client.statusLine),
      liveSite
        ? h('p', null, `${t.liveSite}: `, h('a', { href: liveSite, rel: 'noopener' }, client.liveSite.label || liveSite))
        : null,
    ),
    client.goals?.length
      ? h(
          'section',
          { class: 'block', 'aria-labelledby': 'goals' },
          h('h2', { id: 'goals' }, t.goals),
          h('p', null, t.goalsNote),
          h('dl', { class: 'sheet-list' }, client.goals.map((g) => h('div', null, h('dt', null, g.label), h('dd', null, g.when)))),
        )
      : null,
    h(
      'section',
      { class: 'block', 'aria-labelledby': 'reach' },
      h('h2', { id: 'reach' }, t.reach),
      contact.email ? h('p', null, `${t.email}: `, emailLink ? h('a', { href: emailLink }, contact.email) : contact.email) : null,
      contact.phone ? h('p', null, `${t.phone}: `, h('a', { href: `tel:${contact.phone.replace(/[^\d+]/g, '')}` }, contact.phone)) : null,
    ),
  );
}

// ---------- Costs ----------
export function showCosts(id, { client, costs, buildLog }) {
  const t = copy.costs;
  if (!costs) return render(heading(copy.sections.costs));
  const m = costs.maintenance;
  const a = costs.appTools;
  const e = costs.estimate;
  const proposed = () => proposedLabel(client);

  // a. What ScoutIQ bills you
  const billed = [];
  if (m) {
    const tm = t.maintenance;
    const rate = money(m.ratePerTournamentCents);
    const muted = (text) => ({ text, muted: true });
    const example = m.seasons.find((s) => s.year === m.exampleSeason && s.tournaments != null);
    billed.push(
      h('h3', null, tm.heading),
      h('p', null, fill(tm.terms, { free: m.freeThroughSeason, from: m.freeThroughSeason + 1, rate, locked: m.rateLockedThrough })),
      sheetTable(
        [tm.season, tm.tournaments, tm.math, tm.amount],
        m.seasons.map((s) => {
          const notSet = s.tournaments == null;
          if (s.year <= m.freeThroughSeason) {
            return [String(s.year), notSet ? muted(tm.notSet) : String(s.tournaments), tm.free, money(0)];
          }
          if (notSet) return [String(s.year), muted(tm.notSet), muted(fill(tm.rateEach, { rate })), muted(tm.setWithSchedule)];
          return [String(s.year), String(s.tournaments), `${s.tournaments} x ${rate}`, money(maintenanceCents(m, s))];
        }),
        { numeric: [1, 3], label: tm.heading },
      ),
      m.countNote ? h('p', null, m.countNote) : null,
      example
        ? h('p', null, fill(tm.example, { season: example.year, count: example.tournaments, rate, total: money(example.tournaments * m.ratePerTournamentCents) }))
        : null,
    );
  }
  if (a) {
    const ta = t.appTools;
    billed.push(
      h('h3', null, ta.heading),
      h('p', null, fill(ta.share, { amount: money(a.annualShareCents) }), ' ', fill(ta.buildTime, { hourly: money(hourlyCents(a.buildRateMillsPerMinute)) })),
      (a.notes ?? []).map((note) => h('p', null, note)),
      buildLogTables(a, buildLog),
    );
  }

  // b. What you pay providers directly
  const direct = (e?.rows ?? []).filter((r) => r.payer === 'direct');

  // c. Five-year estimate
  let estimate = null;
  if (e) {
    const totals = estimateTotals(e.rows, e.years.length);
    const rows = e.rows.map((r) => [r.label, ...r.cents.map(money), money(sum(r.cents))]);
    const foot = [
      [e.totalLabel, ...totals.byYear.map(money), money(totals.all)],
      e.realistic ? [e.realistic.label, ...e.realistic.cents.map(money), money(sum(e.realistic.cents))] : null,
    ].filter(Boolean);
    estimate = h(
      'section',
      { class: 'block', 'aria-labelledby': 'estimate' },
      h('h2', { id: 'estimate' }, t.estimate),
      proposed(),
      e.note ? h('p', null, e.note) : null,
      sheetTable([t.estimateItem, ...e.years.map(String), t.estimateYears], rows, {
        numeric: e.years.map((_, i) => i + 1).concat(e.years.length + 1), foot, wide: true, label: t.estimate,
      }),
    );
  }

  render(
    heading(copy.sections.costs),
    m ? strip(fill(t.strip, { season: m.freeThroughSeason })) : null,
    h('section', { class: 'block', 'aria-labelledby': 'billed' }, h('h2', { id: 'billed' }, t.billsYou), proposed(), billed),
    direct.length
      ? h(
          'section',
          { class: 'block', 'aria-labelledby': 'providers' },
          h('h2', { id: 'providers' }, t.providers),
          proposed(),
          h('p', null, t.providersNote),
          h(
            'dl',
            { class: 'sheet-list' },
            direct.map((r) => {
              const low = Math.min(...r.cents);
              const high = Math.max(...r.cents);
              const planned = low === high ? fill(t.planned, { amount: money(low) }) : fill(t.plannedRange, { low: money(low), high: money(high) });
              return h('div', null, h('dt', null, r.name ?? r.label), h('dd', null, h('span', { class: 'planned' }, planned), r.note ? h('span', { class: 'note' }, r.note) : null));
            }),
          ),
        )
      : null,
    estimate,
  );
}

function buildLogTables(a, buildLog) {
  const ta = copy.costs.appTools;
  const checkInNote = h('p', { class: 'check-in-note' }, fill(ta.checkInNote, { amount: money(a.checkInCents) }));
  if (!buildLog.length) return [h('p', { class: 'muted-note' }, ta.noBuilds), checkInNote];
  const years = [...new Set(buildLog.map((b) => b.date.slice(0, 4)))].sort().reverse();
  return years.map((year) => {
    const lines = buildLog.filter((b) => b.date.startsWith(year));
    const cents = lines.map((b) => buildLineCents(b.minutes, a.buildRateMillsPerMinute));
    return h(
      'div',
      { class: 'build-log' },
      h('h4', null, fill(ta.logHeading, { year })),
      sheetTable(
        [ta.date, ta.what, ta.minutes, ta.cost],
        lines.map((b, i) => [shortDate(b.date), b.what, String(b.minutes), money(cents[i])]),
        {
          numeric: [2, 3],
          foot: [
            [fill(ta.total, { year }), '', String(sum(lines.map((b) => b.minutes))), money(sum(cents))],
            [ta.checkIn, '', '', money(a.checkInCents)],
          ],
          footClass: ['', 'check-in'],
          label: fill(ta.logHeading, { year }),
        },
      ),
      checkInNote.cloneNode(true),
    );
  });
}

// ---------- Documents ----------
export function showDocuments(id, data, openFile) {
  const t = copy.documents;
  const { documents } = data;
  const items = documents.map((d) => {
    const errorLine = h('p', { class: 'notice', role: 'alert', hidden: true }, ...linked(t.fileError, contactLink()));
    let actions;
    const link = httpsLink(d.url);
    if (link) {
      actions = h('div', { class: 'actions' }, h('a', { class: 'btn btn--secondary', href: link, target: '_blank', rel: 'noopener noreferrer' }, t.view, newTabNote()));
    } else if (d.path && settings.fileStorage) {
      let busy = false;
      const use = (mode) => async () => {
        if (busy) return;
        busy = true;
        errorLine.hidden = true;
        const ok = await openFile(d, mode);
        busy = false;
        if (!ok) errorLine.hidden = false;
      };
      actions = h(
        'div',
        { class: 'actions' },
        h('button', { type: 'button', class: 'btn btn--secondary', onclick: use('view') }, t.view, newTabNote()),
        h('button', { type: 'button', class: 'btn btn--secondary', onclick: use('download') }, t.download),
      );
    } else {
      actions = h('p', { class: 'muted-note' }, ...linked(t.notOnline, contactLink()));
    }
    return h(
      'li',
      { class: 'doc', id: `doc-${d.id}`, tabindex: '-1' },
      h('h2', null, d.title),
      h('p', { class: 'meta' }, `${t.kinds[d.kind] ?? ''}, ${longDate(d.date)}`, ' ', h('span', { class: `status status--${d.status}` }, t.statuses[d.status] ?? '')),
      actions,
      errorLine,
    );
  });
  render(
    heading(copy.sections.documents),
    agreementStrip(id, data, false),
    items.length ? h('ul', { class: 'item-list' }, items) : h('p', { class: 'lede' }, t.empty),
  );
  // Arriving from the agreement link: bring that document into view.
  const target = location.hash.startsWith('#doc-') && document.getElementById(location.hash.slice(1));
  if (target) {
    target.classList.add('is-target');
    target.scrollIntoView({ block: 'center' });
    target.focus({ preventScroll: true });
  }
}

// ---------- Invoices ----------
function portalHref() {
  try {
    const url = new URL(settings.stripePortalUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'billing.stripe.com') return null;
    if (state.user?.email) url.searchParams.set('prefilled_email', state.user.email);
    return url.href;
  } catch {
    return null;
  }
}

export function showInvoices(id, { client, invoices }) {
  const t = copy.invoices;
  const due = invoices.filter((v) => v.status === 'due');
  let fact;
  if (due.length) fact = fill(t.dueStrip, { amount: money(sum(due.map((v) => v.amountCents))) });
  else if (invoices.length) fact = t.nothingDue;
  else fact = client.invoicesEmptyMessage || t.defaultEmpty;
  const portal = settings.stripePortalUrl ? portalHref() : null;
  render(
    heading(copy.sections.invoices),
    strip(fact),
    portal
      ? h('div', { class: 'actions' }, h('a', { class: 'btn btn--primary', href: portal, target: '_blank', rel: 'noopener noreferrer' }, t.portal, newTabNote()))
      : null,
    invoices.length
      ? h(
          'ul',
          { class: 'item-list' },
          invoices.map((v) =>
            h(
              'li',
              { class: 'invoice' },
              h('h2', null, fill(t.number, { number: v.number })),
              h('p', { class: 'meta' }, longDate(v.date), ' ', h('span', { class: `status status--${v.status}` }, t.statuses[v.status] ?? '')),
              h('p', null, v.covers),
              h('p', { class: 'amount' }, h('span', { class: 'vh' }, `${t.amount}: `), money(v.amountCents)),
              httpsLink(v.url)
                ? h(
                    'div',
                    { class: 'actions' },
                    h('a', { class: 'btn btn--secondary', href: httpsLink(v.url), target: '_blank', rel: 'noopener noreferrer' }, v.status === 'due' ? t.viewAndPay : t.view, newTabNote()),
                  )
                : null,
            ),
          ),
        )
      : null,
  );
}
