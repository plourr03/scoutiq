// Imports a client file into the client area database.
//
//   npm run import:client -- <client file>            to the local emulators (the default)
//   npm run import:client -- <client file> --live     to the live ScoutIQ project
//
// The file is checked first, then every change is listed, and nothing is written until you
// confirm. Document files listed in it are uploaded from the file's own folder.
// Account details are written only the first time; after that the client owns them.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { checkClient, filesBlocked } from './lib/client-data.mjs';
import { applyPlan, describePlan, hasChanges, planImport, readClientFile } from './lib/import-plan.mjs';
import { confirm, connect, LIVE_PROJECT } from './lib/connect.mjs';

const args = process.argv.slice(2);
const live = args.includes('--live');
const file = args.find((a) => !a.startsWith('--'));
const unknown = args.filter((a) => a.startsWith('--') && a !== '--live');
if (!file || unknown.length) {
  console.log('Usage: npm run import:client -- <client file> [--live]');
  process.exit(1);
}

try {
  const entries = readClientFile(file);
  const problems = entries.flatMap(checkClient);
  if (problems.length) {
    console.error(`The file has ${problems.length} problem${problems.length === 1 ? '' : 's'}. Nothing was written.`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  const settings = JSON.parse(readFileSync(new URL('../src/settings.json', import.meta.url), 'utf8'));
  if (filesBlocked({ entries, live, fileStorage: settings.clientArea.fileStorage })) {
    console.error('This file lists document files, but file storage is off (clientArea.fileStorage in src/settings.json).');
    console.error('Use outside links (url) for documents, or turn file storage on after upgrading the plan. Nothing was written.');
    process.exit(1);
  }

  const ctx = await connect({ live });
  const db = getFirestore(ctx.app);
  // Storage is touched only when it can exist: always on the emulators, on the live project
  // only once file storage is switched on.
  const bucket = !live || settings.clientArea.fileStorage ? getStorage(ctx.app).bucket() : null;
  const baseDir = path.dirname(path.resolve(file));

  console.log(`Target: ${ctx.target}`);
  const plans = [];
  for (const entry of entries) {
    const plan = await planImport({ db, bucket, entry, baseDir });
    plans.push(plan);
    console.log(`\n${entry.client.name} (${entry.id})`);
    const lines = describePlan(plan);
    console.log(lines.length ? lines.join('\n') : '  (nothing here yet)');
    if (!(entry.members ?? []).length) console.log('  Note: no members are listed, so only the admin can see this client.');
  }
  if (!plans.some(hasChanges)) {
    console.log('\nEverything is already up to date. Nothing to write.');
    process.exit(0);
  }

  const ok = live
    ? await confirm(`\nThis writes to the LIVE project. Type ${LIVE_PROJECT} to go ahead, anything else to stop:`, LIVE_PROJECT)
    : await confirm('\nWrite these changes to the emulators? Type yes to go ahead:', 'yes');
  if (!ok) {
    console.log('Stopped. Nothing was written.');
    process.exit(1);
  }
  for (const plan of plans) await applyPlan({ db, bucket, plan });
  console.log('Done.');
  process.exit(0);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
