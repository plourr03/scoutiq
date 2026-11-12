// Security rules tests for the client area. Run with: npm run test:rules
// They run against the emulators with made-up clients only (fixtures/sample-clients.json).
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp,
  setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { getBytes, listAll, ref, uploadString } from 'firebase/storage';
import { clientWrites } from '../../scripts/lib/client-data.mjs';

const fixture = JSON.parse(readFileSync(new URL('../../fixtures/sample-clients.json', import.meta.url), 'utf8'));
let env;

const people = {
  member: { email: 'member@sample-club.test', email_verified: true },
  memberUpper: { email: 'Member@Sample-Club.TEST', email_verified: true },
  unverified: { email: 'member@sample-club.test', email_verified: false },
  otherMember: { email: 'member@other-club.test', email_verified: true },
  stranger: { email: 'stranger@example.test', email_verified: true },
  admin: { email: 'admin@scoutiq.test', email_verified: true, admin: true },
};
const as = (who) => env.authenticatedContext(`uid-${who}`, people[who]).firestore();
const asStorage = (who) => env.authenticatedContext(`uid-${who}`, people[who]).storage();
const signedOut = () => env.unauthenticatedContext().firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-scoutiq',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});
after(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const entry of fixture.clients) {
      for (const [path, data] of clientWrites(entry, new Date('2026-11-01T00:00:00Z'))) {
        await setDoc(doc(db, path), data);
      }
    }
    await setDoc(doc(db, 'clients/other-club/accountChanges/c0'), { by: 'member@other-club.test', at: new Date(), changes: { phone: { from: '', to: '1' } } });
    const storage = ctx.storage();
    await uploadString(ref(storage, 'clients/sample-club/docs/estimate.txt'), 'made-up file');
    await uploadString(ref(storage, 'clients/other-club/docs/estimate.txt'), 'made-up file');
  });
});

// A valid account save: the details and the change record, in one write.
function accountSave(db, clientId, by, changes, extra = {}) {
  const batch = writeBatch(db);
  const changeRef = doc(collection(db, `clients/${clientId}/accountChanges`));
  batch.update(doc(db, `clients/${clientId}/account/details`), {
    ...extra, updatedBy: by, updatedAt: serverTimestamp(), lastChangeId: changeRef.id,
  });
  batch.set(changeRef, { by, at: serverTimestamp(), changes });
  return batch.commit();
}

describe('signed-out visitor', () => {
  it('reads nothing', async () => {
    const db = signedOut();
    await assertFails(getDoc(doc(db, 'clients/sample-club')));
    await assertFails(getDoc(doc(db, 'clients/sample-club/data/costs')));
    await assertFails(getDocs(collection(db, 'clients/sample-club/buildLog')));
    await assertFails(getDocs(collection(db, 'clients')));
    await assertFails(getDocs(query(collectionGroup(db, 'clientMembers'), where('email', '==', 'member@sample-club.test'))));
  });
});

describe('signed-in stranger', () => {
  it('reads nothing', async () => {
    const db = as('stranger');
    await assertFails(getDoc(doc(db, 'clients/sample-club')));
    await assertFails(getDoc(doc(db, 'clients/sample-club/data/costs')));
    await assertFails(getDoc(doc(db, 'clients/sample-club/account/details')));
    await assertFails(getDocs(collection(db, 'clients')));
    await assertFails(getDoc(doc(db, 'clients/sample-club/clientMembers/member@sample-club.test')));
  });

  it('finds no clients for their own address', async () => {
    const snap = await assertSucceeds(getDocs(query(collectionGroup(as('stranger'), 'clientMembers'), where('email', '==', 'stranger@example.test'))));
    assert.equal(snap.size, 0);
  });

  it('cannot ask about someone else\'s address', async () => {
    await assertFails(getDocs(query(collectionGroup(as('stranger'), 'clientMembers'), where('email', '==', 'member@sample-club.test'))));
  });

  it('gets the same answer for a real client and a made-up one', async () => {
    const db = as('stranger');
    const real = await getDoc(doc(db, 'clients/sample-club')).catch((e) => e.code);
    const fake = await getDoc(doc(db, 'clients/no-such-club')).catch((e) => e.code);
    assert.equal(real, 'permission-denied');
    assert.equal(fake, real);
  });

  it('cannot add itself to a client', async () => {
    await assertFails(setDoc(doc(as('stranger'), 'clients/sample-club/clientMembers/stranger@example.test'), { email: 'stranger@example.test' }));
  });

  it('cannot use the member lookup to read a "members" collection that belongs to anything else', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'teams/t1/members/abc'), { email: 'stranger@example.test', phone: '555-0000' });
      await setDoc(doc(ctx.firestore(), 'members/xyz'), { email: 'stranger@example.test' });
      await setDoc(doc(ctx.firestore(), 'clients/sample-club/members/stranger@example.test'), { email: 'stranger@example.test' });
    });
    const db = as('stranger');
    await assertFails(getDocs(query(collectionGroup(db, 'members'), where('email', '==', 'stranger@example.test'))));
    await assertFails(getDoc(doc(db, 'teams/t1/members/abc')));
    // An entry left in the old place gives no access either.
    await assertFails(getDoc(doc(db, 'clients/sample-club')));
  });
});

describe('member', () => {
  it('reads their own client', async () => {
    const db = as('member');
    await assertSucceeds(getDoc(doc(db, 'clients/sample-club')));
    await assertSucceeds(getDoc(doc(db, 'clients/sample-club/data/costs')));
    await assertSucceeds(getDocs(collection(db, 'clients/sample-club/buildLog')));
    await assertSucceeds(getDoc(doc(db, 'clients/sample-club/account/details')));
    await assertSucceeds(getDocs(collection(db, 'clients/sample-club/documents')));
    await assertSucceeds(getDocs(collection(db, 'clients/sample-club/invoices')));
  });

  it('finds only their own clients in the chooser', async () => {
    const snap = await assertSucceeds(getDocs(query(collectionGroup(as('member'), 'clientMembers'), where('email', '==', 'member@sample-club.test'))));
    assert.deepEqual(snap.docs.map((d) => d.ref.parent.parent.id), ['sample-club']);
  });

  it('matches their address in lowercase, whatever case the sign-in gives', async () => {
    const db = as('memberUpper');
    await assertSucceeds(getDoc(doc(db, 'clients/sample-club')));
    const snap = await assertSucceeds(getDocs(query(collectionGroup(db, 'clientMembers'), where('email', '==', 'member@sample-club.test'))));
    assert.equal(snap.size, 1);
  });

  it('needs a verified email', async () => {
    await assertFails(getDoc(doc(as('unverified'), 'clients/sample-club')));
  });

  it('cannot read another client', async () => {
    const db = as('member');
    await assertFails(getDoc(doc(db, 'clients/other-club')));
    await assertFails(getDoc(doc(db, 'clients/other-club/data/costs')));
    await assertFails(getDocs(collection(db, 'clients/other-club/buildLog')));
    await assertFails(getDoc(doc(db, 'clients/other-club/account/details')));
    await assertFails(getDocs(collection(db, 'clients/other-club/documents')));
    await assertFails(getDocs(collection(db, 'clients/other-club/invoices')));
    await assertFails(getDocs(collection(db, 'clients')));
    await assertFails(getDocs(collection(db, 'clients/sample-club/clientMembers')));
  });

  it('cannot change client or cost data', async () => {
    const db = as('member');
    await assertFails(updateDoc(doc(db, 'clients/sample-club'), { statusLine: 'changed' }));
    await assertFails(setDoc(doc(db, 'clients/sample-club/data/costs'), { estimate: {} }));
    await assertFails(updateDoc(doc(db, 'clients/sample-club/data/costs'), { 'appTools.checkInCents': 1 }));
    await assertFails(setDoc(doc(db, 'clients/sample-club/buildLog/new'), { date: '2027-01-01', what: 'x', minutes: 1 }));
    await assertFails(deleteDoc(doc(db, 'clients/sample-club/buildLog/b1')));
    await assertFails(setDoc(doc(db, 'clients/sample-club/invoices/i1'), { amountCents: 0 }));
    await assertFails(setDoc(doc(db, 'clients/sample-club/documents/d1'), { title: 'x' }));
    await assertFails(setDoc(doc(db, 'clients/other-club/clientMembers/member@sample-club.test'), { email: 'member@sample-club.test' }));
  });

  it('can change their own account fields, with a change record', async () => {
    await assertSucceeds(accountSave(as('member'), 'sample-club', 'member@sample-club.test',
      { phone: { from: '(920) 555-0142', to: '(920) 555-0199' } }, { phone: '(920) 555-0199' }));
    await assertSucceeds(accountSave(as('member'), 'sample-club', 'member@sample-club.test',
      {
        appToolsInvoice: { from: 'after-season', to: 'other' },
        appToolsNote: { from: '', to: 'Send it in March' },
        payBy: { from: 'online', to: 'check' },
      },
      { preferences: { appToolsInvoice: 'other', appToolsNote: 'Send it in March', payBy: 'check', payNote: '' } }));
  });

  it('must keep a truthful change record: exactly the changed fields, with their real values', async () => {
    const db = as('member');
    const me = 'member@sample-club.test';
    // Says billingName changed, but the save changed the phone.
    await assertFails(accountSave(db, 'sample-club', me, { billingName: { from: 'Sample Club', to: 'x' } }, { phone: '(920) 555-0199' }));
    // Leaves out a field the save changed.
    await assertFails(accountSave(db, 'sample-club', me, { phone: { from: '(920) 555-0142', to: '(920) 555-0199' } }, { phone: '(920) 555-0199', contactName: 'Someone Else' }));
    // Wrong old value.
    await assertFails(accountSave(db, 'sample-club', me, { phone: { from: '000', to: '(920) 555-0199' } }, { phone: '(920) 555-0199' }));
    // Card or bank details smuggled into the record.
    await assertFails(accountSave(db, 'sample-club', me, { phone: { from: '(920) 555-0142', to: '(920) 555-0199' }, cardNumber: { from: '', to: '4242424242424242' } }, { phone: '(920) 555-0199' }));
    await assertFails(accountSave(db, 'sample-club', me, { phone: { from: '(920) 555-0142', to: '(920) 555-0199', bank: '011000015' } }, { phone: '(920) 555-0199' }));
    await assertFails(accountSave(db, 'sample-club', me, { phone: null }, { phone: '(920) 555-0199' }));
    // A save that changes nothing makes no record.
    await assertFails(accountSave(db, 'sample-club', me, { phone: { from: '(920) 555-0142', to: '(920) 555-0142' } }, { phone: '(920) 555-0142' }));
  });

  it('cannot add a change record on its own, even for a record id the account points to', async () => {
    const db = as('member');
    await assertSucceeds(accountSave(db, 'sample-club', 'member@sample-club.test', { phone: { from: '(920) 555-0142', to: '(920) 555-0199' } }, { phone: '(920) 555-0199' }));
    const { lastChangeId } = (await getDoc(doc(db, 'clients/sample-club/account/details'))).data();
    await env.withSecurityRulesDisabled((ctx) => deleteDoc(doc(ctx.firestore(), `clients/sample-club/accountChanges/${lastChangeId}`)));
    await assertFails(setDoc(doc(db, `clients/sample-club/accountChanges/${lastChangeId}`),
      { by: 'member@sample-club.test', at: serverTimestamp(), changes: { phone: { from: '(920) 555-0142', to: '(920) 555-0199' } } }));
  });

  it('keeps card and bank numbers and odd values out of the account', async () => {
    const db = as('member');
    const me = 'member@sample-club.test';
    const prefs = (payNote) => ({ preferences: { appToolsInvoice: 'after-season', appToolsNote: '', payBy: 'online', payNote } });
    const noteChange = (to) => ({ payNote: { from: '', to } });
    await assertFails(accountSave(db, 'sample-club', me, noteChange('Card 4242 4242 4242 4242 exp 12/29'), prefs('Card 4242 4242 4242 4242 exp 12/29')));
    await assertFails(accountSave(db, 'sample-club', me, noteChange('acct 0001234567891'), prefs('acct 0001234567891')));
    await assertSucceeds(accountSave(db, 'sample-club', me, noteChange('Invoice 2027-01 by check, ZIP 54901'), prefs('Invoice 2027-01 by check, ZIP 54901')));
    await assertFails(accountSave(db, 'sample-club', me, { phone: { from: '(920) 555-0142', to: '4242424242424242' } }, { phone: '4242424242424242' }));
    await assertFails(accountSave(db, 'sample-club', me, { phone: { from: '(920) 555-0142', to: 'call me' } }, { phone: 'call me' }));
    await assertSucceeds(accountSave(db, 'sample-club', me, { phone: { from: '(920) 555-0142', to: '+1 (920) 555-0142' } }, { phone: '+1 (920) 555-0142' }));
    await assertFails(accountSave(db, 'sample-club', me, { email: { from: 'member@sample-club.test', to: 'not an email' } }, { email: 'not an email' }));
  });

  it('cannot hide a card number behind a line break, other separators or other digits', async () => {
    const db = as('member');
    const me = 'member@sample-club.test';
    const note = (text) => accountSave(db, 'sample-club', me, { payNote: { from: '', to: text } },
      { preferences: { appToolsInvoice: 'after-season', appToolsNote: '', payBy: 'online', payNote: text } });
    for (const text of [
      'x\n4242 4242 4242 4242', // the line-break trick
      'a\nb\n4242424242424242', // more than one line
      '4242424242424242\n',
      '4242/4242/4242/4242', // other separators
      '4242_4242_4242_4242',
      '4242  4242  4242  4242', // two spaces
      '\uFF14\uFF12'.repeat(6) + '\uFF14', // full-width digits
    ]) {
      await assertFails(note(text), JSON.stringify(text));
    }
    await assertFails(accountSave(db, 'sample-club', me, { email: { from: 'member@sample-club.test', to: '4242424242424242@exp1229.test' } },
      { email: '4242424242424242@exp1229.test' }));
  });

  it('keeps every account field to one line of visible text', async () => {
    const db = as('member');
    const me = 'member@sample-club.test';
    const save = (key, from, to) => accountSave(db, 'sample-club', me, { [key]: { from, to } }, { [key]: to });
    await assertFails(save('billingName', 'Sample Club', 'Sample\nClub'));
    await assertFails(save('billingName', 'Sample Club', 'Sample\tClub'));
    await assertFails(save('contactName', 'Jamie Rivera', 'Jamie \u202ERivera')); // right-to-left override
    await assertFails(save('contactName', 'Jamie Rivera', 'Jamie\u0000Rivera'));
    await assertFails(save('email', 'member@sample-club.test', 'member@sample-club.test\n'));
    await assertSucceeds(save('contactName', 'Jamie Rivera', 'Jamie Rivera-Lee'));
  });

  it('must keep both preferences chosen, and cannot invent one', async () => {
    const db = as('member');
    const me = 'member@sample-club.test';
    await assertFails(accountSave(db, 'sample-club', me,
      { appToolsInvoice: { from: 'after-season', to: '' }, payBy: { from: 'online', to: '' } },
      { preferences: { appToolsInvoice: '', appToolsNote: '', payBy: '', payNote: '' } }));
    await assertFails(accountSave(db, 'sample-club', me, { payBy: { from: 'online', to: '' } },
      { preferences: { appToolsInvoice: 'after-season', appToolsNote: '', payBy: '', payNote: '' } }));
    await assertFails(accountSave(db, 'sample-club', me, { payBy: { from: 'online', to: 'barter' } },
      { preferences: { appToolsInvoice: 'after-season', appToolsNote: '', payBy: 'barter', payNote: '' } }));
  });

  // The fields invoicing needs. The import may leave them blank; a member's save may not.
  describe('every save leaves the account complete', () => {
    const me = 'member@sample-club.test';
    const address = { line1: '100 Example Street', line2: '', city: 'Sampletown', state: 'WI', postalCode: '00000' };
    const prefs = { appToolsInvoice: 'after-season', appToolsNote: '', payBy: 'online', payNote: '' };
    const saveText = (key, from, to) => accountSave(as('member'), 'sample-club', me, { [key]: { from, to } }, { [key]: to });
    const saveAddress = (key, to) => accountSave(as('member'), 'sample-club', me,
      { [key]: { from: address[key], to } }, { mailingAddress: { ...address, [key]: to } });
    const savePrefs = (changes, over) => accountSave(as('member'), 'sample-club', me, changes, { preferences: { ...prefs, ...over } });

    it('cannot blank a name, the email or the phone, even with spaces', async () => {
      await assertFails(saveText('billingName', 'Sample Club', ''));
      await assertFails(saveText('billingName', 'Sample Club', '   '));
      await assertFails(saveText('contactName', 'Jamie Rivera', ''));
      await assertFails(saveText('email', 'member@sample-club.test', ''));
      await assertFails(saveText('phone', '(920) 555-0142', ''));
    });

    it('wants a whole phone number, with the area code', async () => {
      await assertFails(saveText('phone', '(920) 555-0142', '555-0199'));
      await assertSucceeds(saveText('phone', '(920) 555-0142', '920.555.0199'));
    });

    it('cannot blank the street, city, state or ZIP code, but may leave the second line empty', async () => {
      await assertFails(saveAddress('line1', ''));
      await assertFails(saveAddress('city', ' '));
      await assertFails(saveAddress('state', ''));
      await assertFails(saveAddress('postalCode', ''));
      await assertSucceeds(saveAddress('line2', 'Suite 2'));
    });

    it('wants a ZIP code of 5 digits, or ZIP+4', async () => {
      await assertFails(saveAddress('postalCode', '5490'));
      await assertFails(saveAddress('postalCode', 'ABCDE'));
      await assertFails(saveAddress('postalCode', '54901-12'));
      await assertSucceeds(saveAddress('postalCode', '54901-1234'));
    });

    it('wants a few words with "Other"', async () => {
      await assertFails(savePrefs({ payBy: { from: 'online', to: 'other' } }, { payBy: 'other' }));
      await assertFails(savePrefs({ payBy: { from: 'online', to: 'other' }, payNote: { from: '', to: '  ' } }, { payBy: 'other', payNote: '  ' }));
      await assertSucceeds(savePrefs({ payBy: { from: 'online', to: 'other' }, payNote: { from: '', to: 'Bank transfer' } }, { payBy: 'other', payNote: 'Bank transfer' }));
    });

    it('lets a member finish a blank account in one save, with a true change record, but not in part', async () => {
      const db = as('otherMember');
      const who = 'member@other-club.test';
      const done = {
        billingName: 'Other Club', contactName: 'Sam Lee', email: who, phone: '(920) 555-0177',
        mailingAddress: { line1: '1 Made Up Road', line2: '', city: 'Sampletown', state: 'WI', postalCode: '00000' },
        preferences: { appToolsInvoice: 'with-maintenance', appToolsNote: '', payBy: 'check', payNote: '' },
      };
      const changes = {
        phone: { from: '', to: '(920) 555-0177' }, line1: { from: '', to: '1 Made Up Road' }, city: { from: '', to: 'Sampletown' },
        state: { from: '', to: 'WI' }, postalCode: { from: '', to: '00000' },
      };
      // The made-up Other Club starts with names, email and choices but no phone or address.
      await assertFails(accountSave(db, 'other-club', who, { phone: changes.phone }, { phone: done.phone }));
      await assertSucceeds(accountSave(db, 'other-club', who, changes, { phone: done.phone, mailingAddress: done.mailingAddress }));
      await env.withSecurityRulesDisabled(async (ctx) => {
        const saved = (await getDoc(doc(ctx.firestore(), 'clients/other-club/account/details'))).data();
        assert.equal(saved.phone, done.phone);
        const record = (await getDoc(doc(ctx.firestore(), `clients/other-club/accountChanges/${saved.lastChangeId}`))).data();
        assert.deepEqual(Object.keys(record.changes).sort(), Object.keys(changes).sort());
      });
    });
  });

  it('cannot save account changes without a change record', async () => {
    await assertFails(updateDoc(doc(as('member'), 'clients/sample-club/account/details'), {
      phone: '(920) 555-0199', updatedBy: 'member@sample-club.test', updatedAt: serverTimestamp(), lastChangeId: 'none',
    }));
  });

  it('cannot sign a change as someone else', async () => {
    await assertFails(accountSave(as('member'), 'sample-club', 'coach@sample-club.test', { phone: { from: 'a', to: 'b' } }, { phone: 'b' }));
  });

  it('cannot add fields or use values outside the list', async () => {
    const db = as('member');
    await assertFails(accountSave(db, 'sample-club', 'member@sample-club.test', { x: { from: '', to: '1' } }, { creditCard: '4242' }));
    await assertFails(accountSave(db, 'sample-club', 'member@sample-club.test', { payBy: { from: 'online', to: 'cash' } },
      { preferences: { appToolsInvoice: 'after-season', appToolsNote: '', payBy: 'cash', payNote: '' } }));
  });

  it('cannot change another client\'s account, delete theirs, or read the change record', async () => {
    const db = as('member');
    await assertFails(accountSave(db, 'other-club', 'member@sample-club.test', { phone: { from: '', to: '1' } }, { phone: '1' }));
    await assertFails(deleteDoc(doc(db, 'clients/sample-club/account/details')));
    await assertFails(setDoc(doc(db, 'clients/sample-club/account/second'), { phone: '1' }));
    await assertFails(getDocs(collection(db, 'clients/sample-club/accountChanges')));
  });
});

describe('admin', () => {
  it('reads everything', async () => {
    const db = as('admin');
    await assertSucceeds(getDocs(collection(db, 'clients')));
    await assertSucceeds(getDoc(doc(db, 'clients/sample-club/data/costs')));
    await assertSucceeds(getDoc(doc(db, 'clients/other-club/data/costs')));
    await assertSucceeds(getDocs(collection(db, 'clients/sample-club/clientMembers')));
    await assertSucceeds(getDocs(collection(db, 'clients/other-club/accountChanges')));
    await assertSucceeds(getDoc(doc(db, 'clients/other-club/account/details')));
  });

  it('needs a verified email as well as the claim', async () => {
    const db = env.authenticatedContext('uid-admin-unverified', { email: 'admin@scoutiq.test', email_verified: false, admin: true }).firestore();
    await assertFails(getDocs(collection(db, 'clients')));
    await assertFails(getDoc(doc(db, 'clients/sample-club')));
  });

  it('cannot change data from a browser (only the import script writes)', async () => {
    const db = as('admin');
    await assertFails(updateDoc(doc(db, 'clients/sample-club'), { statusLine: 'changed' }));
    await assertFails(setDoc(doc(db, 'clients/sample-club/clientMembers/x@y.test'), { email: 'x@y.test' }));
  });
});

describe('anything the rules do not mention', () => {
  // The database may hold other collections the client area knows nothing about. The rules
  // only open what they name, so anything else stays closed to every browser.
  const unmentioned = ['unmentioned/one', 'unmentioned/one/inner/two', 'clients/sample-club/unmentioned/one'];

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      for (const path of unmentioned) await setDoc(doc(ctx.firestore(), path), { note: 'made up' });
    });
  });

  const everyone = {
    'signed-out visitor': signedOut,
    'signed-in stranger': () => as('stranger'),
    member: () => as('member'),
    admin: () => as('admin'),
  };
  for (const [who, open] of Object.entries(everyone)) {
    it(`is closed to ${who === 'admin' ? 'an' : 'a'} ${who}: no reading, listing, adding, changing or deleting`, async () => {
      const db = open();
      for (const path of unmentioned) {
        await assertFails(getDoc(doc(db, path)));
        await assertFails(getDocs(collection(db, path.slice(0, path.lastIndexOf('/')))));
        await assertFails(setDoc(doc(db, `${path}-new`), { note: 'made up' }));
        await assertFails(updateDoc(doc(db, path), { note: 'changed' }));
        await assertFails(deleteDoc(doc(db, path)));
      }
      await assertFails(getDocs(collectionGroup(db, 'unmentioned')));
    });
  }
});

describe('files', () => {
  it('a member reads their client\'s files and nobody else\'s', async () => {
    await assertSucceeds(getBytes(ref(asStorage('member'), 'clients/sample-club/docs/estimate.txt')));
    await assertFails(getBytes(ref(asStorage('member'), 'clients/other-club/docs/estimate.txt')));
  });

  it('a stranger reads no files and nobody uploads from a browser', async () => {
    await assertFails(getBytes(ref(asStorage('stranger'), 'clients/sample-club/docs/estimate.txt')));
    await assertFails(uploadString(ref(asStorage('member'), 'clients/sample-club/docs/new.txt'), 'x'));
    await assertFails(uploadString(ref(asStorage('admin'), 'clients/sample-club/docs/new.txt'), 'x'));
  });

  it('the admin reads any client\'s files', async () => {
    await assertSucceeds(getBytes(ref(asStorage('admin'), 'clients/other-club/docs/estimate.txt')));
  });

  it('nobody steps into another client\'s folder with "..", or lists folders', async () => {
    const storage = asStorage('member');
    for (const path of [
      'clients/sample-club/../other-club/docs/estimate.txt',
      'clients/sample-club/docs/../../other-club/docs/estimate.txt',
      'clients/sample-club/./../other-club/docs/estimate.txt',
    ]) {
      await assertFails(getBytes(ref(storage, path)));
    }
    await assertFails(listAll(ref(storage, 'clients/sample-club/docs')));
    await assertFails(listAll(ref(asStorage('admin'), 'clients')));
  });

  it('only reads files under a plain client id, even for the admin', async () => {
    // A folder whose id would be read as a pattern (a dot, brackets, a capital) is never served.
    await env.withSecurityRulesDisabled(async (ctx) => {
      for (const id of ['sample.club', 'sample[a-z]club', 'Sample-Club']) {
        await uploadString(ref(ctx.storage(), `clients/${id}/docs/estimate.txt`), 'made-up file');
      }
    });
    for (const id of ['sample.club', 'sample[a-z]club', 'Sample-Club']) {
      await assertFails(getBytes(ref(asStorage('admin'), `clients/${id}/docs/estimate.txt`)));
    }
    await assertSucceeds(getBytes(ref(asStorage('admin'), 'clients/sample-club/docs/estimate.txt')));
  });

  it('wants a plain verified address for files too', async () => {
    for (const email of [' member@sample-club.test', 'member@sample-club.test ', 'x/../member@sample-club.test']) {
      const storage = env.authenticatedContext(`uid-odd-${email.length}`, { email, email_verified: true }).storage();
      await assertFails(getBytes(ref(storage, 'clients/sample-club/docs/estimate.txt')));
    }
  });
});
