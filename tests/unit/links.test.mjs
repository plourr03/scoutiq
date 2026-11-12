// Unit tests for links built from data (src/scripts/clients/links.js). Run with: npm run test:unit
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { httpsLink, mailto } from '../../src/scripts/clients/links.js';

describe('links from data', () => {
  it('keeps plain https links', () => {
    assert.equal(httpsLink('https://example.com/a.pdf'), 'https://example.com/a.pdf');
    assert.equal(httpsLink('https://invoice.stripe.com/i/abc?x=1'), 'https://invoice.stripe.com/i/abc?x=1');
  });

  it('drops anything else, so no link is shown', () => {
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'http://example.com/', '//example.com/',
      '/clients/other', 'https://user:pass@example.com/', 'vbscript:x', '', null, undefined, 42]) {
      assert.equal(httpsLink(bad), null, String(bad));
    }
  });

  it('builds a mail link only for a plain address', () => {
    assert.equal(mailto('hello@scoutiq.test', 'A project & more'), 'mailto:hello@scoutiq.test?subject=A%20project%20%26%20more');
    for (const bad of ['a@b.test?cc=x@y.test', 'a@b.test&bcc=x@y.test', 'a@b.test,x@y.test', 'a b@c.test', 'javascript:x@y.test', '', null]) {
      assert.equal(mailto(bad, 's'), null, String(bad));
    }
  });
});
