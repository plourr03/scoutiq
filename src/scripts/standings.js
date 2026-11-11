// Hero demo: the spreadsheet drives the phone's standings.
// Without JavaScript the table and standings are simply shown (the +/- buttons stay hidden).

const root = document.querySelector('[data-standings-demo]');
if (root) setUp(root);

function setUp(root) {
  const list = root.querySelector('[data-standings]');
  const live = root.querySelector('[data-live]');
  const places = JSON.parse(root.dataset.places || '[]');
  const movesUp = root.dataset.movesUp || '';
  const movesDown = root.dataset.movesDown || '';
  const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)');

  const players = new Map();
  for (const row of root.querySelectorAll('tr[data-player]')) {
    const id = row.dataset.player;
    players.set(id, {
      id,
      name: row.dataset.name,
      points: Number(row.dataset.points),
      value: row.querySelector('[data-value]'),
      cell: row.querySelector('[data-cell]'),
      minus: row.querySelector('[data-delta="-1"]'),
      plus: row.querySelector('[data-delta="1"]'),
      item: list.querySelector(`[data-player="${id}"]`),
    });
  }

  let order = Array.from(list.children, (li) => li.dataset.player);
  let touched = false;
  players.forEach(syncButtons);

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-delta]');
    if (!button || !root.contains(button)) return;
    if (button.getAttribute('aria-disabled') === 'true') return;
    touched = true;
    const id = button.closest('tr[data-player]').dataset.player;
    change(id, Number(button.dataset.delta), true);
  });

  // Once, about a second after the standings first come into view, add two points
  // to the third player so the visitor sees them move. Only when motion is allowed;
  // no focus change and no announcement.
  if (motionOk.matches && 'IntersectionObserver' in window) {
    const third = Array.from(players.keys())[2];
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        window.setTimeout(() => {
          if (!touched && motionOk.matches && third) change(third, 2, false);
        }, 1000);
      },
      { threshold: 0.6 },
    );
    observer.observe(list);
  }

  function change(id, delta, announce) {
    const player = players.get(id);
    const next = Math.min(99, Math.max(0, player.points + delta));
    if (next === player.points) return;

    player.points = next;
    player.value.textContent = String(next);
    player.item.querySelector('[data-points]').textContent = String(next);
    syncButtons(player);
    markActive(player);

    // Highest first. Array.prototype.sort is stable, so ties keep their previous order.
    const nextOrder = [...order].sort((a, b) => players.get(b).points - players.get(a).points);
    if (nextOrder.every((value, index) => value === order[index])) return;

    const before = order.indexOf(id);
    const after = nextOrder.indexOf(id);
    reorder(nextOrder);
    order = nextOrder;

    if (announce && after !== before) {
      const template = after < before ? movesUp : movesDown;
      say(template.replace('{name}', player.name).replace('{place}', places[after] || String(after + 1)));
    }
  }

  function reorder(nextOrder) {
    const animate = motionOk.matches;
    const items = nextOrder.map((id) => players.get(id).item);
    const first = animate ? new Map(items.map((item) => [item, item.getBoundingClientRect().top])) : null;

    for (const item of items) {
      item.style.transition = 'none';
      item.style.transform = '';
    }
    items.forEach((item, index) => {
      list.appendChild(item);
      item.querySelector('[data-pos]').textContent = String(index + 1);
      item.classList.toggle('is-leader', index === 0);
    });
    if (!animate) {
      for (const item of items) item.style.transition = '';
      return;
    }

    // FLIP: start each row where it was, then let it travel to its new place.
    const moving = [];
    for (const item of items) {
      const dy = first.get(item) - item.getBoundingClientRect().top;
      if (Math.abs(dy) > 0.5) {
        item.style.transform = `translateY(${dy}px)`;
        moving.push(item);
      }
    }
    list.getBoundingClientRect();
    for (const item of moving) {
      item.style.transition = 'transform 300ms cubic-bezier(0.2, 0, 0, 1)';
      item.style.transform = '';
      item.addEventListener(
        'transitionend',
        () => {
          item.style.transition = '';
        },
        { once: true },
      );
    }
  }

  function syncButtons(player) {
    player.minus.setAttribute('aria-disabled', String(player.points <= 0));
    player.plus.setAttribute('aria-disabled', String(player.points >= 99));
  }

  function markActive(player) {
    for (const p of players.values()) p.cell.classList.toggle('is-active', p === player);
  }

  function say(message) {
    live.textContent = '';
    window.setTimeout(() => {
      live.textContent = message;
    }, 60);
  }
}
