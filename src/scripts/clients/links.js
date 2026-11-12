// Links built from data. Kept apart from the page code so the unit tests can run them.

// An address that can go into a mailto: link as it is: nothing that could add a second
// recipient, headers or a body.
const MAILTO_SAFE = /^[^\s@?&#/:%"<>,;]+@[^\s@?&#/:%"<>,;]+\.[^\s@?&#/:%"<>,;]+$/;

/** A mailto: link with a subject, or null when the address is not a plain one. */
export const mailto = (email, subject) => (MAILTO_SAFE.test(email ?? '') ? `mailto:${email}?subject=${encodeURIComponent(subject ?? '')}` : null);

/**
 * A link that came from the database, only if it is a plain https address (no other scheme,
 * no name or password in it). Otherwise null, and the screen shows no link.
 */
export function httpsLink(value) {
  try {
    const url = new URL(String(value ?? ''));
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
