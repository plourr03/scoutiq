// Checks the redirects, rewrites and headers in firebase.json against the built site (dist),
// using the same server library the Hosting emulator uses. Run `npm run build` first.
//
// On Windows that library turns "/clients/**" into "\clients\**", so no glob redirect or header
// ever matches in the local emulator. Live Hosting runs on Linux and is not affected. This test
// applies the Linux slash rule so the checks mean the same thing on any computer.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = new URL('../../', import.meta.url);
const dist = new URL('dist/', root);
if (!existsSync(new URL('index.html', dist))) throw new Error('Build the site first: npm run build');

const firebaseTools = path.dirname(require.resolve('firebase-tools/package.json'));
const superstaticDir = path.dirname(require.resolve('superstatic/package.json', { paths: [firebaseTools] }));
const fromSuperstatic = createRequire(path.join(superstaticDir, 'package.json'));
const globSlash = fromSuperstatic(fromSuperstatic.resolve('glob-slash', { paths: [fromSuperstatic.resolve('glob-slasher')] }));
globSlash.normalize = (value) => path.posix.normalize(path.posix.join('/', value));
const { server } = fromSuperstatic('superstatic');

const hosting = JSON.parse(readFileSync(new URL('firebase.json', root), 'utf8')).hosting;
let listener;
let base;

before(async () => {
  const app = server({ port: 0, hostname: '127.0.0.1', config: structuredClone(hosting), cwd: root.pathname.replace(/^\/(\w:)/, '$1'), stack: 'strict' });
  await new Promise((resolve) => { listener = app.listen(resolve); });
  base = `http://127.0.0.1:${listener.address().port}`;
});
after(() => listener?.close());

const get = (url) => fetch(base + url, { redirect: 'manual' });

test('every client address serves the client page with noindex and no-cache', async () => {
  for (const url of ['/clients', '/clients/sample-club', '/clients/sample-club/costs', '/clients/anything/at/all']) {
    const r = await get(url);
    assert.equal(r.status, 200, url);
    assert.equal(r.headers.get('x-robots-tag'), 'noindex', url);
    assert.equal(r.headers.get('cache-control'), 'no-cache', url);
    const html = await r.text();
    assert.match(html, /<meta name="robots" content="noindex, nofollow"/, url);
  }
});

test('/clients.html redirects to /clients', async () => {
  const r = await get('/clients.html');
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), '/clients');
});

test('public pages keep their redirects and get no client headers', async () => {
  for (const [from, to] of [['/index.html', '/'], ['/privacy.html', '/privacy'], ['/terms.html', '/terms'], ['/privacy/', '/privacy'], ['/terms/', '/terms']]) {
    const r = await get(from);
    assert.equal(r.status, 301, from);
    assert.equal(r.headers.get('location'), to, from);
  }
  for (const url of ['/', '/privacy', '/terms']) {
    const r = await get(url);
    assert.equal(r.status, 200, url);
    assert.equal(r.headers.get('x-robots-tag'), null, url);
    assert.equal(r.headers.get('cache-control'), null, url);
  }
  const missing = await get('/clientsx');
  assert.equal(missing.status, 404);
});

test('no public page loads the client script or mentions Firebase', () => {
  const pages = readdirSync(dist).filter((f) => f.endsWith('.html') && f !== 'clients.html' && !f.startsWith('google'));
  assert.ok(pages.includes('index.html') && pages.includes('privacy.html') && pages.includes('terms.html'));
  const clientHtml = readFileSync(new URL('clients.html', dist), 'utf8');
  const clientScripts = [...clientHtml.matchAll(/src="(\/_astro\/[^"]+\.js)"/g)].map((m) => m[1]);
  assert.ok(clientScripts.length > 0, 'client page has a script');
  for (const page of pages) {
    const html = readFileSync(new URL(page, dist), 'utf8');
    for (const script of clientScripts) assert.ok(!html.includes(script), `${page} loads ${script}`);
    assert.ok(!/firebase/i.test(html), `${page} mentions firebase`);
    assert.ok(!html.includes('/clients'), `${page} links to /clients`);
  }
});

test('robots.txt disallows /clients and the sitemap leaves it out', () => {
  assert.match(readFileSync(new URL('robots.txt', dist), 'utf8'), /^Disallow: \/clients$/m);
  const sitemaps = readdirSync(dist).filter((f) => f.startsWith('sitemap') && f.endsWith('.xml'));
  for (const file of sitemaps) assert.ok(!readFileSync(new URL(file, dist), 'utf8').includes('/clients'), file);
});
