// Connects the admin scripts to the local emulators (the default) or, with --live, to the live
// ScoutIQ project. The live project is fixed here so no other project can ever be written to.
// The key file is never opened, copied or printed by this code; firebase-admin reads the path
// in GOOGLE_APPLICATION_CREDENTIALS itself.
import { createInterface } from 'node:readline/promises';
import { applicationDefault, initializeApp } from 'firebase-admin/app';

export const LIVE_PROJECT = 'scoutiq-94b8e';
export const LIVE_BUCKET = 'scoutiq-94b8e.firebasestorage.app';
export const DEMO_PROJECT = 'demo-scoutiq';
export const DEMO_BUCKET = 'demo-scoutiq.appspot.com';

const EMULATOR_VARS = ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'STORAGE_EMULATOR_HOST'];

export async function connect({ live }) {
  if (live) {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account key first.');
    }
    for (const name of EMULATOR_VARS) delete process.env[name];
    const app = initializeApp({ credential: applicationDefault(), projectId: LIVE_PROJECT, storageBucket: LIVE_BUCKET });
    return { app, live: true, target: `the LIVE project ${LIVE_PROJECT}` };
  }
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';
  try {
    await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/`);
  } catch {
    throw new Error('The emulators are not running. Start them in another window with: npm run emulators');
  }
  const app = initializeApp({ projectId: DEMO_PROJECT, storageBucket: DEMO_BUCKET });
  return { app, live: false, target: `the local emulators (${DEMO_PROJECT})` };
}

/** Asks a question and returns true only if the answer is exactly `expected`. */
export async function confirm(question, expected) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${question} `);
    return answer.trim() === expected;
  } finally {
    rl.close();
  }
}
