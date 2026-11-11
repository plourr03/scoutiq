// Hero demo: sheet tabs (Shop, Bookings, League) and a phone that follows the sheet.
// Without JavaScript only the Shop example shows; the tabs and cell controls stay hidden.

const root = document.querySelector('[data-demo]');
if (root) setUp(root);

function setUp(root) {
  const text = JSON.parse(root.querySelector('[data-demo-text]').textContent);
  const live = root.querySelector('[data-live]');
  const caption = root.querySelector('[data-caption-text]');
  const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)');
  let touched = false;

  const fill = (template, values) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
  const sentence = (first, second) => `${first} ${/[.!?]$/.test(second) ? second : `${second}.`}`;
  const view = (key) => root.querySelector(`[data-view="${key}"]`);
  const sheet = (key) => root.querySelector(`[data-example="${key}"]`);

  function say(message) {
    live.textContent = '';
    window.setTimeout(() => {
      live.textContent = message;
    }, 60);
  }

  function markActive(cell) {
    for (const other of cell.closest('table').querySelectorAll('.is-active')) other.classList.remove('is-active');
    cell.classList.add('is-active');
  }

  // Move list rows to a new order. Rows slide to their new place over 300 ms,
  // or jump there instantly when reduced motion is on.
  function flip(list, nextRows) {
    const animate = motionOk.matches;
    const rows = Array.from(list.children);
    const first = animate ? new Map(rows.map((row) => [row, row.getBoundingClientRect().top])) : null;
    for (const row of rows) {
      row.style.transition = 'none';
      row.style.transform = '';
    }
    for (const row of nextRows) list.appendChild(row);
    if (!animate) {
      for (const row of nextRows) row.style.transition = '';
      return;
    }
    const moving = [];
    for (const row of nextRows) {
      const dy = first.get(row) - row.getBoundingClientRect().top;
      if (Math.abs(dy) > 0.5) {
        row.style.transform = `translateY(${dy}px)`;
        moving.push(row);
      }
    }
    list.getBoundingClientRect();
    for (const row of moving) {
      row.style.transition = 'transform 300ms cubic-bezier(0.2, 0, 0, 1)';
      row.style.transform = '';
      row.addEventListener('transitionend', () => (row.style.transition = ''), { once: true });
    }
  }

  // ---------- Shop ----------
  const shop = (() => {
    const t = text.shop;
    const list = view('shop').querySelector('[data-list]');
    const strip = view('shop').querySelector('[data-strip]');
    let soldCount = 0;
    const items = Array.from(sheet('shop').querySelectorAll('tbody tr'), (tr) => ({
      name: tr.dataset.name,
      tr,
      input: tr.querySelector('[data-toggle]'),
      row: list.querySelector(`[data-row="${tr.dataset.row}"]`),
      soldAt: 0,
    }));

    function apply(item, announce) {
      if (!item.input.checked) item.soldAt = ++soldCount;
      markActive(item.input.closest('td'));
      const inStock = items.filter((i) => i.input.checked);
      // Items in stock first in sheet order; sold out items at the bottom, latest last.
      const soldOut = items.filter((i) => !i.input.checked).sort((a, b) => a.soldAt - b.soldAt);
      for (const i of items) i.row.classList.toggle('is-sold-out', !i.input.checked);
      flip(list, [...inStock, ...soldOut].map((i) => i.row));
      strip.textContent = fill(t.strip, { n: inStock.length, total: items.length });
      if (announce) say(sentence(fill(item.input.checked ? t.nowInStock : t.nowSoldOut, { name: item.name }), strip.textContent));
    }

    sheet('shop').addEventListener('change', (event) => {
      const item = items.find((i) => i.input === event.target);
      if (!item) return;
      touched = true;
      apply(item, true);
    });

    const auto = items.find((i) => i.name === t.autoSoldOut);
    return {
      autoRow: auto && auto.tr,
      list,
      autoSoldOut() {
        if (!auto || !auto.input.checked) return;
        auto.input.checked = false;
        apply(auto, false);
      },
    };
  })();

  // ---------- Bookings ----------
  (() => {
    const t = text.bookings;
    const list = view('bookings').querySelector('[data-list]');
    const strip = view('bookings').querySelector('[data-strip]');
    const slots = Array.from(sheet('bookings').querySelectorAll('tbody tr'), (tr) => {
      const row = list.querySelector(`[data-row="${tr.dataset.row}"]`);
      return { time: tr.dataset.time, input: tr.querySelector('[data-toggle]'), nameCell: tr.querySelector('[data-name]'), row, status: row.querySelector('[data-status]') };
    });

    sheet('bookings').addEventListener('change', (event) => {
      const slot = slots.find((s) => s.input === event.target);
      if (!slot) return;
      touched = true;
      const booked = slot.input.checked;
      slot.nameCell.textContent = booked ? t.newBooking : '';
      slot.row.classList.toggle('is-booked', booked);
      slot.status.textContent = booked ? t.booked : t.open;
      markActive(slot.input.closest('td'));
      const n = slots.filter((s) => !s.input.checked).length;
      strip.textContent = n === 0 ? t.strip.none : fill(n === 1 ? t.strip.one : t.strip.many, { n });
      say(sentence(fill(booked ? t.nowBooked : t.nowOpen, { time: slot.time }), strip.textContent));
    });
  })();

  // ---------- League ----------
  (() => {
    const t = text.league;
    const list = view('league').querySelector('[data-list]');
    const strip = view('league').querySelector('[data-strip]');
    const players = new Map();
    for (const tr of sheet('league').querySelectorAll('tbody tr')) {
      players.set(tr.dataset.row, {
        id: tr.dataset.row,
        name: tr.dataset.name,
        points: Number(tr.dataset.points),
        value: tr.querySelector('[data-value]'),
        cell: tr.querySelector('[data-cell]'),
        minus: tr.querySelector('[data-delta="-1"]'),
        plus: tr.querySelector('[data-delta="1"]'),
        row: list.querySelector(`[data-row="${tr.dataset.row}"]`),
      });
    }
    let order = Array.from(list.children, (li) => li.dataset.row);
    const sync = (p) => {
      p.minus.setAttribute('aria-disabled', String(p.points <= 0));
      p.plus.setAttribute('aria-disabled', String(p.points >= 99));
    };
    players.forEach(sync);

    sheet('league').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-delta]');
      if (!button || button.getAttribute('aria-disabled') === 'true') return;
      touched = true;
      const p = players.get(button.closest('tr').dataset.row);
      const next = Math.min(99, Math.max(0, p.points + Number(button.dataset.delta)));
      if (next === p.points) return;
      p.points = next;
      p.value.textContent = String(next);
      p.row.querySelector('[data-points]').textContent = String(next);
      sync(p);
      markActive(p.cell);

      // Highest first. Array.prototype.sort is stable, so ties keep their previous order.
      const nextOrder = [...order].sort((a, b) => players.get(b).points - players.get(a).points);
      const [lead, second] = nextOrder.map((id) => players.get(id));
      strip.textContent = lead.points === second.points ? t.strip.tied : fill(t.strip.leads, { name: lead.name, margin: lead.points - second.points });
      if (nextOrder.every((id, index) => id === order[index])) return;
      const before = order.indexOf(p.id);
      const after = nextOrder.indexOf(p.id);
      nextOrder.forEach((id, index) => {
        players.get(id).row.querySelector('[data-pos]').textContent = String(index + 1);
      });
      flip(list, nextOrder.map((id) => players.get(id).row));
      order = nextOrder;
      if (after !== before) say(fill(after < before ? t.movesUp : t.movesDown, { name: p.name, place: t.places[after] || String(after + 1) }));
    });
  })();

  // ---------- Sheet tabs ----------
  const tablist = root.querySelector('[role="tablist"]');
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  function select(tab, moveFocus) {
    for (const each of tabs) {
      const on = each === tab;
      each.setAttribute('aria-selected', String(on));
      each.tabIndex = on ? 0 : -1;
      for (const id of each.getAttribute('aria-controls').split(' ')) document.getElementById(id).hidden = !on;
    }
    caption.textContent = tab.dataset.caption;
    if (moveFocus) tab.focus();
  }
  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tab, false);
  });
  tablist.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(document.activeElement);
    const keys = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (index < 0 || !(event.key in keys)) return;
    event.preventDefault();
    select(tabs[keys[event.key]], true);
  });

  // ---------- The one automatic move ----------
  // Once both the Travel mug row in the sheet and the last row on the phone are fully in the
  // window, wait about a second, then mark Travel mug as sold out. Only when motion is allowed
  // and the Shop tab is showing; no focus change, no announcement, never repeated.
  if (motionOk.matches && 'IntersectionObserver' in window && shop.autoRow) {
    const targets = [shop.autoRow, shop.list.lastElementChild];
    const inView = new Map();
    let timer = 0;
    const allInView = () => targets.every((el) => inView.get(el));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) inView.set(entry.target, entry.intersectionRatio > 0.99);
        if (allInView() && !timer) {
          timer = window.setTimeout(() => {
            timer = 0;
            if (!allInView()) return;
            observer.disconnect();
            if (!touched && motionOk.matches && !view('shop').hidden) shop.autoSoldOut();
          }, 1000);
        }
      },
      { threshold: [0, 1] },
    );
    for (const el of targets) observer.observe(el);
  }
}
