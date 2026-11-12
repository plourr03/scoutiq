// Writes firebase.local.json for the local emulators. Deploys always read firebase.json; this
// file is ignored by git and never deployed.
//
//   node scripts/emulator/local-config.mjs                the Content-Security-Policy headers
//                                                         left out (the live policy allows only
//                                                         the live Google and Firebase addresses,
//                                                         so it would block the emulators)
//   node scripts/emulator/local-config.mjs --with-policy  the live policies kept, with only the
//                                                         emulator addresses on 127.0.0.1 added,
//                                                         to try the policy locally
//
// Everything else (rewrites, redirects, the other headers, the rules) is the same.
import { readFileSync, writeFileSync } from 'node:fs';

const EMULATORS = 'http://127.0.0.1:9099 http://127.0.0.1:8080 http://127.0.0.1:9199';
const withPolicy = process.argv.includes('--with-policy');

const forEmulators = (policy) => policy
  .replace(/connect-src ([^;]*)/, `connect-src $1 ${EMULATORS}`)
  .replace(/frame-src ([^;]*)/, 'frame-src $1 http://127.0.0.1:9099');

const config = JSON.parse(readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'));
config.hosting.headers = config.hosting.headers
  .map((rule) => ({
    ...rule,
    headers: withPolicy
      ? rule.headers.map((h) => (h.key === 'Content-Security-Policy' ? { ...h, value: forEmulators(h.value) } : h))
      : rule.headers.filter((h) => h.key !== 'Content-Security-Policy'),
  }))
  .filter((rule) => rule.headers.length > 0);
writeFileSync(new URL('../../firebase.local.json', import.meta.url), `${JSON.stringify(config, null, 2)}\n`);
