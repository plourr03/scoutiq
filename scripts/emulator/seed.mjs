// Loads the made-up clients (fixtures/sample-clients.json) into the local emulators and
// creates made-up Google accounts to sign in with. Never touches a real project.
//
//   node scripts/emulator/seed.mjs          seed once
//   node scripts/emulator/seed.mjs --stay   seed, then keep running until Ctrl+C
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { checkClient, clientWrites, fileUploads } from '../lib/client-data.mjs';

const PROJECT = 'demo-scoutiq';
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';
if (!PROJECT.startsWith('demo-')) throw new Error('The seed only runs against a demo project.');

const fixture = JSON.parse(readFileSync(new URL('../../fixtures/sample-clients.json', import.meta.url), 'utf8'));
const problems = fixture.clients.flatMap(checkClient);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

initializeApp({ projectId: PROJECT, storageBucket: `${PROJECT}.appspot.com` });
const db = getFirestore();
const auth = getAuth();
const bucket = getStorage().bucket();

// Start clean.
await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });

const batch = db.batch();
for (const entry of fixture.clients) {
  for (const [path, data] of clientWrites(entry, new Date())) batch.set(db.doc(path), data);
}
await batch.commit();

// The made-up document files, uploaded the same way the import script does it.
const fixturesDir = fileURLToPath(new URL('../../fixtures/', import.meta.url));
for (const entry of fixture.clients) {
  for (const f of fileUploads(entry)) {
    await bucket.upload(`${fixturesDir}${f.local}`, { destination: f.remote, contentType: f.contentType });
  }
}

// Made-up people to sign in as through the emulator's Google screen.
const people = [
  { email: 'member@sample-club.test', name: 'Jamie Rivera (Sample Club member)' },
  { email: 'both@clubs.test', name: 'Pat Morgan (member of two clubs)' },
  { email: 'member@other-club.test', name: 'Sam Lee (Other Club member)' },
  { email: 'stranger@example.test', name: 'Alex Stone (on no list)' },
  { email: 'admin@scoutiq.test', name: 'ScoutIQ admin', admin: true },
];
const result = await auth.importUsers(
  people.map((p, i) => ({
    uid: `sample-user-${i + 1}`,
    email: p.email,
    emailVerified: true,
    displayName: p.name,
    providerData: [{ providerId: 'google.com', uid: `google-sample-${i + 1}`, email: p.email, displayName: p.name }],
    customClaims: p.admin ? { admin: true } : undefined,
  })),
);
if (result.failureCount) {
  console.error(result.errors);
  process.exit(1);
}

console.log(`Seeded ${fixture.clients.length} made-up clients and ${people.length} made-up accounts into ${PROJECT}.`);
console.log('Open http://127.0.0.1:5050/clients and choose an account on the emulator\'s Google screen.');

if (process.argv.includes('--stay')) {
  console.log('Emulators are running. Press Ctrl+C to stop.');
  setInterval(() => {}, 1 << 30);
}
