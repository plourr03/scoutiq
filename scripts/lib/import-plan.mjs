// Works out what an import will change, prints it in plain words, then applies it.
// Used by scripts/import-client.mjs (and its tests). Works with firebase-admin.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { clientWrites, fileUploads } from './client-data.mjs';

// Everything under a client that the import owns. Account details and the account change
// record belong to the client and are never overwritten or removed here.
// Member entries used to live in "members"; any left there are removed, so running the import
// moves them to "clientMembers".
const OLD_MEMBERS = 'members';
const OWNED = ['clientMembers', OLD_MEMBERS, 'data', 'buildLog', 'documents', 'invoices'];

/**
 * Compares a client entry with what is in the database (and in Storage, when a bucket is given).
 * Returns { ops, files } where each op is create, update, same, delete or keep.
 */
export async function planImport({ db, bucket, entry, baseDir, now = new Date() }) {
  const base = `clients/${entry.id}`;
  const writes = clientWrites(entry, now);
  const wanted = new Set(writes.map(([p]) => p));
  const ops = [];

  for (const [p, data] of writes) {
    const snap = await db.doc(p).get();
    if (p === `${base}/account/details` && snap.exists) {
      ops.push({ kind: 'keep', path: p, why: 'the client edits these, so they stay as they are' });
    } else if (!snap.exists) {
      ops.push({ kind: 'create', path: p, data });
    } else {
      const diff = diffData(snap.data(), data);
      ops.push(diff.length ? { kind: 'update', path: p, data, diff } : { kind: 'same', path: p });
    }
  }
  for (const sub of OWNED) {
    const snap = await db.collection(`${base}/${sub}`).get();
    for (const d of snap.docs) {
      const p = `${base}/${sub}/${d.id}`;
      if (!wanted.has(p)) ops.push({ kind: 'delete', path: p });
    }
  }

  const files = [];
  const uploads = fileUploads(entry);
  if (uploads.length && !bucket) throw new Error('This client has document files, but no file storage is available.');
  for (const f of uploads) {
    const localPath = path.resolve(baseDir, f.local);
    let bytes;
    try {
      bytes = readFileSync(localPath);
    } catch {
      throw new Error(`Document file not found: ${f.local} (looked in ${baseDir})`);
    }
    const md5 = createHash('md5').update(bytes).digest('base64');
    const [exists] = await bucket.file(f.remote).exists();
    const same = exists && (await bucket.file(f.remote).getMetadata())[0].md5Hash === md5;
    files.push({ ...f, localPath, size: bytes.length, kind: same ? 'same' : 'upload' });
  }
  if (bucket) {
    const [stored] = await bucket.getFiles({ prefix: `${base}/` });
    const keep = new Set(uploads.map((u) => u.remote));
    for (const file of stored) if (!keep.has(file.name)) files.push({ remote: file.name, kind: 'remove' });
  }
  return { ops, files, prefix: `${base}/`, clearsLinks: Boolean(bucket) };
}

/** The plan in plain words, one line per change. */
export function describePlan(plan) {
  const lines = [];
  const count = (k) => plan.ops.filter((o) => o.kind === k).length;
  for (const op of plan.ops) {
    if (op.kind === 'create') lines.push(`  + add     ${op.path}`);
    if (op.kind === 'update') {
      lines.push(`  ~ change  ${op.path}`);
      for (const d of op.diff) lines.push(`              ${d.field}: ${show(d.from)} -> ${show(d.to)}`);
    }
    if (op.kind === 'delete') {
      let why = '';
      if (op.path.includes(`/${OLD_MEMBERS}/`)) why = '   (old place; the entry now lives in clientMembers)';
      else if (op.path.includes('/clientMembers/')) why = '   (this person loses access)';
      lines.push(`  - remove  ${op.path}${why}`);
    }
    if (op.kind === 'keep') lines.push(`  = keep    ${op.path} (${op.why})`);
  }
  for (const f of plan.files) {
    if (f.kind === 'upload') lines.push(`  + upload  ${f.remote}  (${f.local}, ${Math.ceil(f.size / 1024)} KB)`);
    if (f.kind === 'remove') lines.push(`  - remove  file ${f.remote}`);
  }
  if (plan.clearsLinks) lines.push('  ~ clear   any download links made for this client\'s files');
  const unchanged = count('same') + plan.files.filter((f) => f.kind === 'same').length;
  if (unchanged) lines.push(`  (${unchanged} already up to date)`);
  return lines;
}

export const hasChanges = (plan) =>
  plan.ops.some((o) => ['create', 'update', 'delete'].includes(o.kind)) || plan.files.some((f) => f.kind !== 'same');

/** Writes the plan: database changes in batches, then file uploads and removals. */
export async function applyPlan({ db, bucket, plan }) {
  const writes = plan.ops.filter((o) => ['create', 'update', 'delete'].includes(o.kind));
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    for (const op of writes.slice(i, i + 400)) {
      if (op.kind === 'delete') batch.delete(db.doc(op.path));
      else batch.set(db.doc(op.path), op.data);
    }
    await batch.commit();
  }
  for (const f of plan.files) {
    if (f.kind === 'upload') await upload(bucket, f);
    if (f.kind === 'remove') await bucket.file(f.remote).delete();
  }
  if (plan.clearsLinks) await clearDownloadLinks(bucket, plan);
}

/**
 * Anyone who can read a file could also ask Storage for a download link, and such a link keeps
 * working for whoever holds it. The app never makes one, but to be safe every import uploads
 * any file that has such a link again, as a fresh copy with no links, so a link saved by someone
 * since removed stops working. (Fresh uploads and removed files need nothing more.)
 */
export async function clearDownloadLinks(bucket, plan) {
  for (const f of plan.files.filter((x) => x.kind === 'same')) {
    const [meta] = await bucket.file(f.remote).getMetadata();
    if (meta.metadata?.firebaseStorageDownloadTokens) await upload(bucket, f);
  }
}

const upload = (bucket, f) =>
  bucket.upload(f.localPath, { destination: f.remote, contentType: f.contentType, metadata: { cacheControl: 'private, no-store' } });

function show(value) {
  if (value === undefined) return '(none)';
  const text = JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

/** Field by field differences between what is stored and what the file says. */
export function diffData(stored, wanted) {
  const a = flatten(stored);
  const b = flatten(wanted);
  const fields = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  return fields
    .filter((f) => JSON.stringify(a[f]) !== JSON.stringify(b[f]))
    .map((f) => ({ field: f, from: a[f], to: b[f] }));
}

function flatten(obj, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(obj ?? {})) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && typeof value.toDate !== 'function') {
      if (Object.keys(value).length === 0) out[name] = {};
      else flatten(value, name, out);
    } else {
      out[name] = typeof value?.toDate === 'function' ? value.toDate().toISOString() : value instanceof Date ? value.toISOString() : value;
    }
  }
  return out;
}

/** Reads a client file: one client, or { clients: [...] } like the fixtures. */
export function readClientFile(file) {
  const parsed = JSON.parse(readFileSync(file, 'utf8'));
  return Array.isArray(parsed.clients) ? parsed.clients : [parsed];
}
