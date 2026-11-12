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
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
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
  }
});

test('Client sign in is the last header link (laptop and phone menus) and in the footer, only when switched on', () => {
  const settings = JSON.parse(readFileSync(new URL('src/settings.json', root), 'utf8'));
  const pages = readdirSync(dist).filter((f) => f.endsWith('.html') && f !== 'clients.html' && !f.startsWith('google'));
  const lastLink = (block) => [...(block ?? '').matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].at(-1)?.slice(1);
  for (const page of pages) {
    const html = readFileSync(new URL(page, dist), 'utf8');
    const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';
    const wide = html.match(/<nav class="nav-wide"[\s\S]*?<\/nav>/)?.[0];
    const phone = html.match(/<nav class="menu-panel"[\s\S]*?<\/nav>/)?.[0];
    const everywhere = html.split('href="/clients"').length - 1;
    if (settings.clientSignIn.enabled) {
      assert.equal(everywhere, 3, `${page} links to /clients from both header menus and the footer`);
      assert.deepEqual(lastLink(wide), ['/clients', 'Client sign in'], `${page}: last link of the laptop menu`);
      assert.deepEqual(lastLink(phone), ['/clients', 'Client sign in'], `${page}: last link of the phone menu`);
      assert.match(footer, /<a href="\/clients"[^>]*>Client sign in<\/a>/, `${page} has the link in its footer`);
      assert.ok(!/<a [^>]*class="[^"]*btn[^"]*"[^>]*href="\/clients"|<a href="\/clients"[^>]*class="[^"]*btn/.test(html), `${page}: the link is never a button`);
    } else {
      assert.equal(everywhere, 0, `${page} links to /clients while the switch is off`);
    }
  }
});

test('robots.txt disallows /clients and the sitemap leaves it out', () => {
  assert.match(readFileSync(new URL('robots.txt', dist), 'utf8'), /^Disallow: \/clients$/m);
  const sitemaps = readdirSync(dist).filter((f) => f.startsWith('sitemap') && f.endsWith('.xml'));
  for (const file of sitemaps) assert.ok(!readFileSync(new URL(file, dist), 'utf8').includes('/clients'), file);
});

// ---------- Security headers ----------
const policyOf = (response) => Object.fromEntries(
  (response.headers.get('content-security-policy') ?? '').split(';')
    .map((part) => part.trim().split(/\s+/)).filter((p) => p[0])
    .map(([name, ...values]) => [name, values]),
);
const sha256 = (text) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;

test('every address sends nosniff, a referrer policy, a permissions policy and same-site framing only', async () => {
  const asset = readdirSync(new URL('_astro/', dist)).find((f) => f.endsWith('.js'));
  for (const url of ['/', '/privacy', '/terms', '/clients', '/clients/sample-club/documents', `/_astro/${asset}`, '/robots.txt']) {
    const r = await get(url);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff', url);
    assert.equal(r.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', url);
    assert.match(r.headers.get('permissions-policy') ?? '', /camera=\(\).*microphone=\(\).*geolocation=\(\)/, url);
    assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN', url);
  }
});

test('public and client pages each get their own content policy, allowing every inline script they hold', async () => {
  const pages = {
    '/': 'index.html', '/privacy': 'privacy.html', '/terms': 'terms.html', '/404.html': '404.html',
    '/clients': 'clients.html', '/clients/sample-club/account': 'clients.html',
  };
  for (const [url, file] of Object.entries(pages)) {
    const policy = policyOf(await get(url));
    const client = url.startsWith('/clients');
    assert.ok(policy['script-src'], `${url} has a content policy`);
    assert.ok(!policy['script-src'].some((v) => /unsafe/.test(v)), `${url}: scripts are never unsafe-inline or unsafe-eval`);
    assert.deepEqual(policy['default-src'], ["'self'"], url);
    assert.deepEqual(policy['object-src'], ["'none'"], url);
    assert.deepEqual(policy['base-uri'], ["'self'"], url);
    assert.deepEqual(policy['frame-ancestors'], ["'self'"], url);
    // Only the client page talks to Google and Firebase.
    assert.equal(policy['script-src'].includes('https://apis.google.com'), client, url);
    assert.equal(policy['connect-src'].includes('https://firestore.googleapis.com'), client, url);
    // Every inline script in the built page is allowed by its exact hash. If this fails after a
    // change, update the hash in firebase.json (the message shows which script).
    const html = readFileSync(new URL(file, dist), 'utf8');
    for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/\bsrc=/.test(attrs) || /type="application\/(ld\+)?json"/.test(attrs)) continue;
      assert.ok(policy['script-src'].includes(sha256(body)), `${url}: add ${sha256(body)} for the inline script "${body.slice(0, 50)}"`);
    }
  }
});

test('the emulators get the same hosting setup without the content policies', () => {
  execFileSync(process.execPath, ['scripts/emulator/local-config.mjs'], { cwd: new URL('.', root) });
  const local = JSON.parse(readFileSync(new URL('firebase.local.json', root), 'utf8')).hosting;
  const keys = (h) => h.headers.flatMap((rule) => rule.headers.map((x) => x.key));
  assert.ok(!keys(local).includes('Content-Security-Policy'));
  assert.deepEqual(keys(local), keys(hosting).filter((k) => k !== 'Content-Security-Policy'));
  assert.deepEqual(local.rewrites, hosting.rewrites);
  assert.deepEqual(local.redirects, hosting.redirects);
});
