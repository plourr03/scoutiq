// Starts Firebase for the client area.
// On Firebase Hosting the web config comes from Hosting's own /__/firebase/init.json, so no
// config lives in this repository. Sign-in runs on the address that serves the page
// (scout-iq.com, or a preview address), never on a third-party domain, which keeps Google
// sign-in working in browsers that block third-party storage, such as Safari on iPhone.
// Each such address needs its /__/auth/handler listed as a redirect URI for the Google client.
// On this computer (localhost) it uses a made-up demo project and the Firebase emulators.
import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence, browserPopupRedirectResolver, connectAuthEmulator, indexedDBLocalPersistence, initializeAuth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore/lite';

export const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

export async function startFirebase() {
  let config;
  if (isLocal) {
    config = { apiKey: 'demo-api-key', authDomain: location.host, projectId: 'demo-scoutiq', appId: 'demo-app', storageBucket: 'demo-scoutiq.appspot.com' };
  } else {
    const response = await fetch('/__/firebase/init.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('No Firebase config from Hosting');
    const c = await response.json();
    // Only what sign-in and the database need. Analytics is never started.
    config = { apiKey: c.apiKey, authDomain: location.host, projectId: c.projectId, appId: c.appId, storageBucket: c.storageBucket };
  }
  const app = initializeApp(config);
  const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
  const db = getFirestore(app);
  if (isLocal) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  return { app, auth, db };
}
