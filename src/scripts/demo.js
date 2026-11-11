// Hero demo: sheet tabs (Shop, Bookings, League) and a phone that follows the sheet.
// Without JavaScript only the Shop example shows; the tabs and cell buttons stay hidden.

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

  function say(message) {
    live.textContent = '';
    window.setTimeout(() => {
      live.textContent = message;
    }, 60);
  }

  function markActive(cell) {
    const table = cell.closest('table');
    for (const other of table.querySelectorAll('.is-active')) other.classList.remove('is-active');
    cell.classList.add('is-active');
  }

  // Move list rows to a new order. Rows that stay slide to their new place over 300 ms
  // (instantly with reduced motion). Rows that leave or arrive do so without animation.
  function flip(list, nextRows) {
    const animate = motionOk.matches;
    const current = Array.from(list.children);
    const first = animate ? new Map(current.map((row) => [row, row.getBoundingClientRect().top])) : null;
    for (const row of current) {
      row.style.transition = 'none';
      row.style.transform = '';
      if (!nextRows.includes(row)) row.remove();
    }
    for (const row of nextRows) list.appendChild(row);
    if (!animate) {
      for (const row of nextRows) row.style.transition = '';
      return;
    }
    const moving = [];
    for (const row of nextRows) {
      if (!first.has(row)) continue;
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
      row.addEventListener(
        'transitionend',
        () => {
          row.style.transition = '';
        },
        { once: true },
      );
    }
  }

  const view = (key) => root.querySelector(`[data-view="${key}"]`);
  const sheet = (key) => root.querySelector(`[data-example="${key}"]`);

  // ---------- Shop ----------
  const shop = (() => {
    const t = text.shop;
    const list = view('shop').querySelector('[data-list]');
    const strip = view('shop').querySelector('[data-strip]');
    let soldCount = 0;
    const items = Array.from(sheet('shop').querySelectorAll('tbody tr'), (tr) => ({
      name: tr.dataset.name,
      inStock: true,
      soldAt: 0,
      button: tr.querySelector('[data-toggle]'),
      row: list.querySelector(`[data-row="${tr.dataset.row}"]`),
    }));

    function render() {
      const inStock = items.filter((item) => item.inStock);
      // Sold out items go to the bottom, most recently sold out last.
      const soldOut = items.filter((item) => !item.inStock).sort((a, b) => a.soldAt - b.soldAt);
      for (const item of items) {
        item.row.classList.toggle('is-sold-out', !item.inStock);
        item.button.textContent = item.inStock ? t.yes : t.no;
        item.button.setAttribute('aria-label', fill(item.inStock ? t.markSoldOut : t.markInStock, { name: item.name }));
      }
      flip(list, [...inStock, ...soldOut].map((item) => item.row));
      strip.textContent = fill(t.strip, { n: inStock.length, total: items.length });
      return strip.textContent;
    }

    function toggle(item, announce) {
      item.inStock = !item.inStock;
      if (!item.inStock) item.soldAt = ++soldCount;
      markActive(item.button.closest('td'));
      const status = render();
      if (announce) say(sentence(fill(item.inStock ? t.nowInStock : t.nowSoldOut, { name: item.name }), status));
    }

    sheet('shop').addEventListener('click', (event) => {
      const button = event.target.closest('[data-toggle]');
      if (!button) return;
      touched = true;
      toggle(items.find((item) => item.button === button), true);
    });

    return {
      autoSoldOut() {
        const item = items.find((i) => i.name === t.autoSoldOut);
        if (item && item.inStock) toggle(item, false);
      },
    };
  })();

  // ---------- Bookings ----------
  (() => {
    const t = text.bookings;
    const list = view('bookings').querySelector('[data-list]');
    const strip = view('bookings').querySelector('[data-strip]');
    const slots = Array.from(sheet('bookings').querySelectorAll('tbody tr'), (tr) => ({
      time: tr.dataset.time,
      booked: tr.dataset.booked === 'true',
      nameCell: tr.querySelector('[data-name]'),
      button: tr.querySelector('[data-toggle]'),
      row: list.querySelector(`[data-row="${tr.dataset.row}"]`),
    }));
    // Booked times are not on the phone. Keep their rows ready for when a time opens up.
    for (const slot of slots) {
      if (slot.row.hidden) slot.row.remove();
      slot.row.hidden = false;
    }

    function render() {
      const open = slots.filter((slot) => !slot.booked);
      for (const slot of slots) {
        slot.button.textContent = slot.booked ? t.booked : t.open;
        slot.button.setAttribute('aria-label', fill(slot.booked ? t.markOpen : t.markBooked, { time: slot.time }));
      }
      flip(list, open.map((slot) => slot.row));
      const n = open.length;
      strip.textContent = n === 0 ? t.strip.none : fill(n === 1 ? t.strip.one : t.strip.many, { n });
      return strip.textContent;
    }

    sheet('bookings').addEventListener('click', (event) => {
      const button = event.target.closest('[data-toggle]');
      if (!button) return;
      touched = true;
      const slot = slots.find((s) => s.button === button);
      slot.booked = !slot.booked;
      slot.nameCell.textContent = slot.booked ? t.newBooking : '';
      markActive(button.closest('td'));
      const status = render();
      say(sentence(fill(slot.booked ? t.nowBooked : t.nowOpen, { time: slot.time }), status));
    });
  })();

  // ---------- League ----------
  (() => {
    const t = text.league;
    const list = view('league').querySelector('[data-list]');
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
      if (nextOrder.every((id, index) => id === order[index])) return;
      const before = order.indexOf(p.id);
      const after = nextOrder.indexOf(p.id);
      nextOrder.forEach((id, index) => {
        const { row } = players.get(id);
        row.querySelector('[data-pos]').textContent = String(index + 1);
        row.classList.toggle('is-leader', index === 0);
      });
      flip(list, nextOrder.map((id) => players.get(id).row));
      order = nextOrder;
      if (after !== before) {
        say(fill(after < before ? t.movesUp : t.movesDown, { name: p.name, place: t.places[after] || String(after + 1) }));
      }
    });
  })();

  // ---------- Sheet tabs ----------
  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  function select(tab, moveFocus) {
    for (const each of tabs) {
      const on = each === tab;
      each.setAttribute('aria-selected', String(on));
      each.tabIndex = on ? 0 : -1;
      for (const id of each.getAttribute('aria-controls').split(' ')) {
        document.getElementById(id).hidden = !on;
      }
    }
    caption.textContent = tab.dataset.caption;
    if (moveFocus) tab.focus();
  }
  root.querySelector('[role="tablist"]').addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tab, false);
  });
  root.querySelector('[role="tablist"]').addEventListener('keydown', (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const keys = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    select(tabs[keys[event.key]], true);
  });

  // ---------- The one automatic move ----------
  // Once, about a second after the demo comes into view, mark Travel mug as sold out.
  // Only when motion is allowed and the Shop tab is showing; no focus change, no announcement.
  if (motionOk.matches && 'IntersectionObserver' in window) {
    const phone = root.querySelector('[data-phone]');
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        window.setTimeout(() => {
          const shopShowing = !view('shop').hidden;
          if (!touched && shopShowing && motionOk.matches) shop.autoSoldOut();
        }, 1000);
      },
      { threshold: 0.6 },
    );
    observer.observe(phone);
  }
}
