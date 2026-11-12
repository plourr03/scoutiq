// Unit tests for the client file checks. Run with: npm run test:unit
// Made-up data only (the Sample Club fixture).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  checkClient, clientWrites, fileUploads, filesBlocked, normalAccount,
} from '../../scripts/lib/client-data.mjs';

const fixture = JSON.parse(readFileSync(new URL('../../fixtures/sample-clients.json', import.meta.url), 'utf8'));
const sample = () => structuredClone(fixture.clients.find((c) => c.id === 'sample-club'));
const problems = (change) => {
  const entry = sample();
  change(entry);
  return checkClient(entry).join('\n');
};

describe('client file checks', () => {
  it('accepts the made-up fixtures', () => {
    for (const entry of fixture.clients) assert.deepEqual(checkClient(entry), []);
  });
  it('wants member addresses in lowercase, once each', () => {
    assert.match(problems((e) => e.members.push('Someone@Sample-Club.test')), /lowercase/);
    assert.match(problems((e) => e.members.push(e.members[0])), /listed twice/);
  });
  it('wants each document to be a link or a file, not both or neither', () => {
    assert.match(problems((e) => { e.documents[0].file = 'files/x.pdf'; }), /not both/);
    assert.match(problems((e) => { delete e.documents[0].url; }), /not both and not neither/);
    assert.match(problems((e) => { e.documents[0].url = 'http://example.com/x.pdf'; }), /https/);
    assert.match(problems((e) => { e.documents[2].file = '../outside.pdf'; }), /plain path/);
  });
  it('knows the document kinds and statuses', () => {
    assert.match(problems((e) => { e.documents[0].kind = 'Invoice'; }), /kind must be/);
    assert.match(problems((e) => { e.documents[0].status = 'Final'; }), /status must be/);
  });
  it('checks invoices', () => {
    assert.match(problems((e) => { e.invoices[0].amountCents = 11.65; }), /whole number/);
    assert.match(problems((e) => { e.invoices[0].status = 'overdue'; }), /status must be/);
    assert.match(problems((e) => { e.invoices[0].url = ''; }), /https/);
  });
  it('points the agreement at a listed document', () => {
    assert.match(problems((e) => { e.client.agreement.documentId = 'nope'; }), /not in documents/);
  });
  it('cross-checks the estimate totals when given', () => {
    assert.match(problems((e) => { e.costs.estimate.expectedTotalsCents = [1, 2, 3, 4, 5]; }), /add up to/);
    assert.equal(problems((e) => { e.costs.estimate.expectedTotalsCents = [14000, 28500, 29500, 30500, 31500]; }), '');
  });
  it('keeps account values inside the limits the rules allow', () => {
    assert.match(problems((e) => { e.account.phone = 'x'.repeat(41); }), /account.phone/);
    assert.match(problems((e) => { e.account.preferences.payBy = 'cash'; }), /payBy/);
    assert.equal(problems((e) => { e.account.preferences.payBy = ''; }), '');
    assert.match(problems((e) => { e.account.phone = 'call me'; }), /account.phone/);
    assert.match(problems((e) => { e.account.preferences.payNote = 'card 4242 4242 4242 4242'; }), /card and bank numbers/);
    assert.match(problems((e) => { e.account.email = 'not an email'; }), /account.email/);
  });
});

describe('client writes', () => {
  it('stores files by their Storage path and links by url', () => {
    const writes = new Map(clientWrites(sample(), new Date(0)));
    assert.deepEqual(writes.get('clients/sample-club/documents/club-colors').path, 'clients/sample-club/docs/club-colors.pdf');
    assert.equal(writes.get('clients/sample-club/documents/club-colors').url, undefined);
    assert.equal(writes.get('clients/sample-club/documents/cost-estimate').url, 'https://example.com/sample-club/cost-estimate.pdf');
    assert.deepEqual(fileUploads(sample()).map((f) => f.remote), ['clients/sample-club/docs/club-colors.pdf']);
  });
  it('leaves out notes and fills every account field', () => {
    const entry = sample();
    entry.client._note = 'for the editor only';
    const writes = new Map(clientWrites(entry, new Date(0)));
    assert.equal(writes.get('clients/sample-club')._note, undefined);
    assert.deepEqual(Object.keys(normalAccount({})).sort(), ['billingName', 'contactName', 'email', 'mailingAddress', 'phone', 'preferences']);
  });
});

describe('file storage switch', () => {
  const withFiles = [sample()];
  const linksOnly = [sample()];
  linksOnly[0].documents = linksOnly[0].documents.filter((d) => !d.file);

  it('stops a live import with document files while file storage is off', () => {
    assert.equal(filesBlocked({ entries: withFiles, live: true, fileStorage: false }), true);
  });

  it('lets it through once file storage is on, on the emulators, or with links only', () => {
    assert.equal(filesBlocked({ entries: withFiles, live: true, fileStorage: true }), false);
    assert.equal(filesBlocked({ entries: withFiles, live: false, fileStorage: false }), false);
    assert.equal(filesBlocked({ entries: linksOnly, live: true, fileStorage: false }), false);
  });
});
