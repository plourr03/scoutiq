// Tests for the import and admin scripts against the emulators. Run with: npm run test:import
// Made-up data only (the Sample Club fixture).
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { applyPlan, describePlan, hasChanges, planImport } from '../../scripts/lib/import-plan.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixture = JSON.parse(readFileSync(path.join(root, 'fixtures/sample-clients.json'), 'utf8'));
const sample = () => structuredClone(fixture.clients.find((c) => c.id === 'sample-club'));
const PROJECT = 'demo-scoutiq';
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

let app;
let db;
let bucket;
let work;

before(() => {
  app = initializeApp({ projectId: PROJECT, storageBucket: `${PROJECT}.appspot.com` }, 'import-tests');
  db = getFirestore(app);
  bucket = getStorage(app).bucket();
  // A throwaway copy of the client file and its document, like a private folder would hold.
  work = mkdtempSync(path.join(tmpdir(), 'scoutiq-import-'));
  mkdirSync(path.join(work, 'files/sample-club'), { recursive: true });
  copyFileSync(path.join(root, 'fixtures/files/sample-club/club-colors.pdf'), path.join(work, 'files/sample-club/club-colors.pdf'));
});
after(async () => {
  rmSync(work, { recursive: true, force: true });
  await deleteApp(app);
});
beforeEach(async () => {
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  const [files] = await bucket.getFiles();
  await Promise.all(files.map((f) => f.delete()));
});

const plan = (entry) => planImport({ db, bucket, entry, baseDir: work });

describe('import plan', () => {
  it('adds everything the first time, then has nothing to do', async () => {
    const first = await plan(sample());
    assert.ok(first.ops.every((o) => o.kind === 'create'));
    assert.deepEqual(first.files.map((f) => f.kind), ['upload']);
    await applyPlan({ db, bucket, plan: first });
    const second = await plan(sample());
    assert.equal(hasChanges(second), false);
    assert.ok(second.ops.some((o) => o.kind === 'keep' && o.path.endsWith('/account/details')));
  });

  it('lists field changes and removals, and says who loses access', async () => {
    await applyPlan({ db, bucket, plan: await plan(sample()) });
    const entry = sample();
    entry.client.statusLine = 'Registration is open.';
    entry.members = entry.members.filter((m) => m !== 'coach@sample-club.test');
    entry.buildLog.pop();
    const next = await plan(entry);
    const lines = describePlan(next).join('\n');
    assert.match(lines, /change {2}clients\/sample-club\n.*statusLine: "Design is done and the pages are going up\. Registration is next\." -> "Registration is open\."/);
    assert.match(lines, /remove {2}clients\/sample-club\/clientMembers\/coach@sample-club\.test {3}\(this person loses access\)/);
    assert.match(lines, /remove {2}clients\/sample-club\/buildLog\/b3/);
    await applyPlan({ db, bucket, plan: next });
    assert.equal((await db.doc('clients/sample-club/clientMembers/coach@sample-club.test').get()).exists, false);
  });

  it('moves member entries from the old "members" collection to clientMembers', async () => {
    await applyPlan({ db, bucket, plan: await plan(sample()) });
    // An entry left in the old place, as written before the rename.
    await db.doc('clients/sample-club/members/member@sample-club.test').set({ email: 'member@sample-club.test' });
    const next = await plan(sample());
    const lines = describePlan(next).join('\n');
    assert.match(lines, /remove {2}clients\/sample-club\/members\/member@sample-club\.test {3}\(old place; the entry now lives in clientMembers\)/);
    await applyPlan({ db, bucket, plan: next });
    assert.equal((await db.collection('clients/sample-club/members').get()).size, 0);
    assert.equal((await db.doc('clients/sample-club/clientMembers/member@sample-club.test').get()).exists, true);
  });

  it('never overwrites account details the client has changed', async () => {
    await applyPlan({ db, bucket, plan: await plan(sample()) });
    await db.doc('clients/sample-club/account/details').update({ phone: '555-0199' });
    const entry = sample();
    entry.account.phone = '555-0100';
    await applyPlan({ db, bucket, plan: await plan(entry) });
    assert.equal((await db.doc('clients/sample-club/account/details').get()).data().phone, '555-0199');
  });

  it('uploads a document again only when the file changes, and removes files no longer listed', async () => {
    await applyPlan({ db, bucket, plan: await plan(sample()) });
    assert.deepEqual((await plan(sample())).files.map((f) => f.kind), ['same']);
    writeFileSync(path.join(work, 'files/sample-club/club-colors.pdf'), '%PDF-1.4 changed');
    assert.deepEqual((await plan(sample())).files.map((f) => f.kind), ['upload']);
    const entry = sample();
    entry.documents = entry.documents.filter((d) => !d.file);
    entry.client.agreement.documentId = 'website-agreement';
    const next = await plan(entry);
    assert.deepEqual(next.files.map((f) => `${f.kind} ${f.remote}`), ['remove clients/sample-club/docs/club-colors.pdf']);
  });
});

describe('download links', () => {
  it('every import clears download links, so a saved link stops working', async () => {
    await applyPlan({ db, bucket, plan: await plan(sample()) });
    const file = bucket.file('clients/sample-club/docs/club-colors.pdf');
    await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: 'made-up-token' } });
    const url = `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media&token=made-up-token`;
    assert.equal((await fetch(url)).status, 200);
    const entry = sample();
    entry.members = entry.members.filter((m) => m !== 'coach@sample-club.test');
    const next = await plan(entry);
    assert.match(describePlan(next).join(' | '), /clear {3}any download links/);
    await applyPlan({ db, bucket, plan: next });
    assert.doesNotMatch(String((await file.getMetadata())[0].metadata?.firebaseStorageDownloadTokens), /made-up-token/);
    assert.notEqual((await fetch(url)).status, 200);
    assert.equal((await file.download())[0].subarray(0, 5).toString(), '%PDF-');
  });
});

describe('import script', () => {
  const run = (args, input, env = {}) => spawnSync(process.execPath, ['scripts/import-client.mjs', ...args], {
    cwd: root, input, encoding: 'utf8', env: { ...process.env, ...env },
  });

  it('writes nothing unless you type yes', async () => {
    const file = path.join(work, 'sample.json');
    writeFileSync(file, JSON.stringify(sample()));
    const no = run([file], 'no\n');
    assert.equal(no.status, 1);
    assert.match(no.stdout, /Stopped\. Nothing was written\./);
    assert.equal((await db.doc('clients/sample-club').get()).exists, false);
    const yes = run([file], 'yes\n');
    assert.equal(yes.status, 0, yes.stderr);
    assert.match(yes.stdout, /Target: the local emulators/);
    assert.equal((await db.doc('clients/sample-club').get()).data().name, 'Sample Club');
  });

  it('refuses a file with problems before connecting to anything', () => {
    const file = path.join(work, 'bad.json');
    const entry = sample();
    entry.members.push('Not An Email');
    writeFileSync(file, JSON.stringify(entry));
    const result = run([file], '');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /is not an email address/);
  });

  it('will not go live without a key, and will not send files while file storage is off', () => {
    // The switch itself is tested both ways in the unit tests (filesBlocked). Here the script must
    // refuse either way, for whichever reason applies to the switch as it is set now.
    const { fileStorage } = JSON.parse(readFileSync(path.join(root, 'src/settings.json'), 'utf8')).clientArea;
    const file = path.join(work, 'sample.json');
    writeFileSync(file, JSON.stringify(sample()));
    const withFiles = run([file, '--live'], '', { GOOGLE_APPLICATION_CREDENTIALS: '' });
    assert.equal(withFiles.status, 1);
    assert.match(withFiles.stderr, fileStorage ? /Set GOOGLE_APPLICATION_CREDENTIALS/ : /file storage is off/);
    const entry = sample();
    entry.documents = entry.documents.filter((d) => !d.file);
    writeFileSync(file, JSON.stringify(entry));
    const noKey = run([file, '--live'], '', { GOOGLE_APPLICATION_CREDENTIALS: '' });
    assert.equal(noKey.status, 1);
    assert.match(noKey.stderr, /Set GOOGLE_APPLICATION_CREDENTIALS/);
  });
});

describe('admin script', () => {
  const run = (args, input) => spawnSync(process.execPath, ['scripts/set-admin.mjs', ...args], { cwd: root, input, encoding: 'utf8' });

  it('sets and removes the admin claim on an account that exists', async () => {
    const auth = getAuth(app);
    await auth.deleteUser('made-up-admin').catch(() => {});
    await auth.createUser({ uid: 'made-up-admin', email: 'owner@scoutiq.test', emailVerified: true });
    assert.match(run(['nobody@scoutiq.test'], '').stderr, /No account for nobody@scoutiq\.test/);
    assert.equal(run(['Owner@ScoutIQ.test'], 'yes\n').status, 0);
    assert.equal((await auth.getUser('made-up-admin')).customClaims?.admin, true);
    assert.match(run(['owner@scoutiq.test'], '').stdout, /Nothing to change/);
    assert.equal(run(['owner@scoutiq.test', '--remove'], 'yes\n').status, 0);
    assert.equal((await auth.getUser('made-up-admin')).customClaims?.admin, undefined);
  });
});
