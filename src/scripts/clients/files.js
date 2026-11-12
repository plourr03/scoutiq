// Opens a document file from Cloud Storage. Loaded only when file storage is switched on and a
// file is asked for, so the Storage code is not part of the client area's first load.
// Files are fetched through the SDK, so the member rule applies to every read; no shareable
// download link is ever made.
import { isLocal } from './firebase.js';

// How long to wait for a file. The SDK would otherwise retry a failed read for two minutes,
// which looks like nothing happening.
const LIMIT_MS = 15_000;

// The only kinds of file shown in a tab. The type is set here from the file name, never taken
// from Storage, so no file can ever open as a web page on this site. Anything else downloads.
const VIEWABLE = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

let storage;
let api;

async function blobFor(app, path) {
  if (!api) {
    api = await import('firebase/storage');
    storage = api.getStorage(app);
    storage.maxOperationRetryTime = LIMIT_MS;
    if (isLocal) api.connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
  return api.getBlob(api.ref(storage, path));
}

function withinLimit(promise) {
  let timer;
  const late = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('The file took too long.')), LIMIT_MS + 5_000);
  });
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

/**
 * Shows the file in the tab the click already opened ('view') or saves it ('download').
 * Returns false if it failed, after closing that tab, so no blank window is ever left behind.
 */
export async function openFile(app, doc, mode, tab, downloadedNote) {
  try {
    const fetched = await withinLimit(blobFor(app, doc.path));
    const ext = String(doc.fileName ?? doc.path ?? '').split('.').pop().toLowerCase();
    const viewable = VIEWABLE[ext];
    const blob = new Blob([fetched], { type: viewable ?? 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    if (mode === 'view' && !viewable && tab && !tab.closed) tab.close();
    if (mode === 'view' && viewable) {
      if (tab && !tab.closed) {
        tab.location.replace(url);
        // Some browsers (phones without a PDF viewer, for one) save the file instead of showing
        // it, and the tab stays as it was. Say so, rather than "Opening" forever.
        setTimeout(() => {
          try {
            if (!tab.closed && tab.location.href === 'about:blank') tab.document.body.textContent = downloadedNote;
          } catch {
            // The tab moved on to the document; nothing to say.
          }
        }, 4_000);
      } else location.assign(url);
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
    if (tab && !tab.closed) tab.close();
    return false;
  }
}
