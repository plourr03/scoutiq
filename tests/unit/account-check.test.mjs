// Unit tests for what makes an account complete (src/scripts/clients/account-check.js).
// Made-up data only (the fixture clubs). Run with: npm run test:unit
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isComplete, missing, problemWith } from '../../src/scripts/clients/account-check.js';
import { checkClient } from '../../scripts/lib/client-data.mjs';

const fixture = JSON.parse(readFileSync(new URL('../../fixtures/sample-clients.json', import.meta.url), 'utf8'));
const club = (id) => structuredClone(fixture.clients.find((c) => c.id === id));
const keys = (acc) => missing(acc).map((m) => m.key);

describe('account check', () => {
  it('takes a filled-in account as complete, and a blank one as not', () => {
    assert.equal(isComplete(club('sample-club').account), true);
    assert.equal(isComplete(club('other-club').account), false);
    assert.deepEqual(keys(club('other-club').account), ['phone', 'line1', 'city', 'state', 'postalCode']);
    assert.equal(isComplete(null), false);
  });

  it('lets the import create an account with blanks, since that is how a client starts', () => {
    assert.deepEqual(checkClient(club('other-club')), []);
  });

  it('needs every invoicing field except the second address line', () => {
    const acc = club('sample-club').account;
    acc.mailingAddress.line2 = '';
    assert.equal(isComplete(acc), true);
    for (const key of ['billingName', 'contactName', 'email', 'phone']) {
      const a = club('sample-club').account;
      a[key] = '  ';
      assert.deepEqual(keys(a), [key]);
    }
    for (const key of ['line1', 'city', 'state', 'postalCode']) {
      const a = club('sample-club').account;
      a.mailingAddress[key] = '';
      assert.deepEqual(keys(a), [key]);
    }
  });

  it('needs both choices, and a note with "Other"', () => {
    const a = club('sample-club').account;
    a.preferences.payBy = '';
    assert.deepEqual(missing(a), [{ key: 'payBy', problem: 'choose' }]);
    a.preferences.payBy = 'other';
    assert.deepEqual(missing(a), [{ key: 'payNote', problem: 'noteNeeded' }]);
    a.preferences.payNote = 'Bank transfer';
    assert.equal(isComplete(a), true);
  });

  it('checks phone, ZIP code, email and card numbers the way the rules do', () => {
    assert.equal(problemWith('phone', '555-0199'), 'phoneDigits');
    assert.equal(problemWith('phone', '(920) 555-0199'), '');
    assert.equal(problemWith('phone', 'call me'), 'phoneFormat');
    assert.equal(problemWith('phone', '1234567890123456'), 'phoneFormat');
    assert.equal(problemWith('postalCode', '54901'), '');
    assert.equal(problemWith('postalCode', '54901-1234'), '');
    assert.equal(problemWith('postalCode', '5490'), 'zipFormat');
    assert.equal(problemWith('email', 'not an email'), 'emailFormat');
    assert.equal(problemWith('city', '4242 4242 4242 4242'), 'noCardNumbers');
    assert.equal(problemWith('line2', ''), '');
    assert.equal(problemWith('line2', '', true), 'required');
  });
});
