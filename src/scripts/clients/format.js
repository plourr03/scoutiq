// Money and date helpers for the client area. Pure functions, unit tested in tests/unit.
// Money is stored as whole cents. The build rate is stored as whole mills (tenths of a cent)
// per minute, so $5.10 an hour is exactly 85, and each build log line is rounded to the cent.

/** "$150" for whole dollars, "$5.10" otherwise. */
export function money(cents) {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}

/** Cost of one build log line in whole cents, rounded half up. */
export function buildLineCents(minutes, millsPerMinute) {
  const mills = minutes * millsPerMinute;
  return Math.floor((mills + 5) / 10);
}

/** Hourly rate in whole cents from mills per minute (85 becomes 510). */
export function hourlyCents(millsPerMinute) {
  return (millsPerMinute * 60) / 10;
}

/** What maintenance costs in a season, or null when the tournament count is not set. */
export function maintenanceCents(maintenance, season) {
  if (season.year <= maintenance.freeThroughSeason) return 0;
  if (season.tournaments == null) return null;
  return season.tournaments * maintenance.ratePerTournamentCents;
}

/** Column totals for the estimate rows, plus the five-year sum at the end. */
export function estimateTotals(rows, yearCount) {
  const totals = Array.from({ length: yearCount }, (_, i) => rows.reduce((sum, r) => sum + r.cents[i], 0));
  return { byYear: totals, all: totals.reduce((a, b) => a + b, 0) };
}

export const sum = (values) => values.reduce((a, b) => a + b, 0);

/** "October 5, 2026" from "2026-10-05", without time zone surprises. */
export function longDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** "Feb 10" style short dates for tables. */
export function shortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Fills {name} placeholders. */
export function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}
