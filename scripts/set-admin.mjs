// Gives a signed-in account the admin claim, or takes it away.
//
//   npm run set-admin -- you@example.com              on the local emulators (the default)
//   npm run set-admin -- you@example.com --live       on the live ScoutIQ project
//   npm run set-admin -- you@example.com --remove     take admin away
//
// The account must have signed in to the client area once. After a change, sign out of the
// client area and sign in again so the browser picks it up.
import { getAuth } from 'firebase-admin/auth';
import { confirm, connect, LIVE_PROJECT } from './lib/connect.mjs';

const args = process.argv.slice(2);
const live = args.includes('--live');
const remove = args.includes('--remove');
const email = args.find((a) => !a.startsWith('--'))?.trim().toLowerCase();
const unknown = args.filter((a) => a.startsWith('--') && !['--live', '--remove'].includes(a));
if (!email || unknown.length) {
  console.log('Usage: npm run set-admin -- <email> [--remove] [--live]');
  process.exit(1);
}

try {
  const ctx = await connect({ live });
  const auth = getAuth(ctx.app);
  const user = await auth.getUserByEmail(email).catch(() => null);
  if (!user) {
    console.error(`No account for ${email} on ${ctx.target} yet. Sign in to the client area once with it, then run this again.`);
    process.exit(1);
  }
  const claims = { ...(user.customClaims ?? {}) };
  const isAdmin = claims.admin === true;
  console.log(`Target: ${ctx.target}`);
  console.log(`Account: ${user.email}${user.emailVerified ? '' : ' (email NOT verified, so it cannot see any client)'}`);
  console.log(`Admin now: ${isAdmin ? 'yes' : 'no'}`);
  if (isAdmin !== remove) {
    console.log('Nothing to change.');
    process.exit(0);
  }
  console.log(remove ? 'This takes admin away.' : 'This makes the account admin: it can see every client, read only.');
  const ok = live
    ? await confirm(`Type ${LIVE_PROJECT} to go ahead, anything else to stop:`, LIVE_PROJECT)
    : await confirm('Type yes to go ahead:', 'yes');
  if (!ok) {
    console.log('Stopped. Nothing was changed.');
    process.exit(1);
  }
  if (remove) delete claims.admin;
  else claims.admin = true;
  await auth.setCustomUserClaims(user.uid, Object.keys(claims).length ? claims : null);
  console.log('Done. Sign out of the client area and sign in again to see the change.');
  process.exit(0);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
