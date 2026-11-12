// Opens a document file from Cloud Storage. Loaded only when file storage is switched on and a
// file is asked for, so the Storage code is not part of the client area's first load.
// Files are fetched through the SDK, so the member rule applies to every read; no shareable
// download link is ever made.
import { isLocal } from './firebase.js';

let storage;
let api;

async function blobFor(app, path) {
  if (!api) {
    api = await import('firebase/storage');
    storage = api.getStorage(app);
    if (isLocal) api.connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
  return api.getBlob(api.ref(storage, path));
}

/**
 * Shows the file in a new tab ('view') or saves it ('download'). Returns false if it failed.
 * The new tab is opened at once, while the click still counts, then filled when the file arrives.
 */
export async function openFile(app, doc, mode) {
  const tab = mode === 'view' ? window.open('', '_blank') : null;
  try {
    const blob = await blobFor(app, doc.path);
    const url = URL.createObjectURL(blob);
    if (mode === 'view') {
      if (tab) tab.location.href = url;
      else location.assign(url);
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || 'document';
      document.body.append(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch {
    tab?.close();
    return false;
  }
}
