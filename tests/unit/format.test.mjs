// Unit tests for the client area's money and date helpers. Run with: npm run test:unit
// Every number here is made up (the Sample Club fixture), never a real client's.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLineCents, estimateTotals, hourlyCents, longDate, maintenanceCents, money, shortDate,
} from '../../src/scripts/clients/format.js';

describe('money', () => {
  it('shows whole dollars without cents and other amounts with cents', () => {
    assert.equal(money(15000), '$150');
    assert.equal(money(510), '$5.10');
    assert.equal(money(134000), '$1,340');
    assert.equal(money(0), '$0');
  });
});

describe('build time', () => {
  it('keeps the rate exact in mills per minute', () => {
    assert.equal(hourlyCents(85), 510); // $5.10 an hour
    assert.equal(hourlyCents(120), 720);
  });
  it('rounds each line to the cent, half up', () => {
    assert.equal(buildLineCents(42, 85), 357); // 3570 mills = $3.57 exactly
    assert.equal(buildLineCents(43, 85), 366); // 3655 mills = 365.5 cents, rounds up
    assert.equal(buildLineCents(37, 85), 315); // 3145 mills = 314.5 cents, rounds up
    assert.equal(buildLineCents(0, 85), 0);
    assert.equal(buildLineCents(60, 85), 510); // one hour
  });
});

describe('maintenance', () => {
  const m = { freeThroughSeason: 2027, ratePerTournamentCents: 2500 };
  it('is free through the free season', () => assert.equal(maintenanceCents(m, { year: 2027, tournaments: 6 }), 0));
  it('multiplies the tournament count by the rate after it', () => assert.equal(maintenanceCents(m, { year: 2028, tournaments: 6 }), 15000));
  it('has no amount while the count is not set', () => assert.equal(maintenanceCents(m, { year: 2029, tournaments: null }), null));
});

describe('estimate totals', () => {
  it('adds each year and the five years', () => {
    const rows = [{ cents: [0, 15000] }, { cents: [3000, 4000] }, { cents: [6000, 4500] }];
    assert.deepEqual(estimateTotals(rows, 2), { byYear: [9000, 23500], all: 32500 });
  });
});

describe('dates', () => {
  it('formats dates without shifting the day', () => {
    assert.equal(longDate('2026-10-05'), 'October 5, 2026');
    assert.equal(longDate('2027-01-01'), 'January 1, 2027');
    assert.equal(shortDate('2027-02-10'), 'Feb 10');
  });
});
