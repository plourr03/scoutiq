// ScoutIQ client area. Loaded only by /clients, never by the public pages.
//
// Addresses:
//   /clients                        sign-in, the "not linked" page, or the chooser
//   /clients/<client>               Overview
//   /clients/<client>/<section>     Costs, Documents, Invoices or Account
// Every number shown comes from the database. Nothing about a client is in this code.
import {
  GoogleAuthProvider, getRedirectResult, isSignInWithEmailLink, onAuthStateChanged, sendSignInLinkToEmail,
  signInWithEmailLink, signInWithPopup, signInWithRedirect, signOut,
} from 'firebase/auth';
import { collection, collectionGroup, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore/lite';
import gMark2x from '../../assets/google/google-g@2x.png?url';
import gMark3x from '../../assets/google/google-g@3x.png?url';
import { showAccount } from './account.js';
import {
  contactLink, copy, fb, heading, linked, main, markScrollers, render, settings, state,
} from './context.js';
import { h, mount } from './dom.js';
import { startFirebase } from './firebase.js';
import { fill } from './format.js';
import { showCosts, showDocuments, showInvoices, showOverview } from './views.js';

const headerName = document.getElementById('client-name');
const adminBadge = document.getElementById('admin-badge');
const signOutButton = document.getElementById('sign-out');
const sectionNav = document.getElementById('sections');
const sectionList = sectionNav.querySelector('ul');

const SECTIONS = ['overview', 'costs', 'documents', 'invoices', 'account'];
const EMAIL_KEY = 'scoutiqSignInEmail';
const RETURN_KEY = 'scoutiqReturnTo';

const store = {
  get: (area, key) => { try { return window[area].getItem(key); } catch { return null; } },
  set: (area, key, value) => { try { window[area].setItem(key, value); } catch { /* storage blocked */ } },
  remove: (area, key) => { try { window[area].removeItem(key); } catch { /* storage blocked */ } },
};

// ---------- Start ----------
start().catch(() => showError());

async function start() {
  Object.assign(fb, await startFirebase());
  adminBadge.textContent = copy.header.adminBadge;

  signOutButton.addEventListener('click', doSignOut);
  document.addEventListener('click', onLinkClick);
  window.addEventListener('popstate', () => route());
  let resizeFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      updateTabFades();
      markScrollers();
    });
  });
  sectionList.addEventListener('scroll', updateTabFades, { passive: true });

  if (settings.emailLinkSignIn && isSignInWithEmailLink(fb.auth, location.href)) {
    await finishEmailLink();
  }
  getRedirectResult(fb.auth).catch(() => {
    state.signInError = true;
    if (!state.user) showSignIn();
  });

  onAuthStateChanged(fb.auth, async (user) => {
    state.user = user;
    state.access = null;
    state.cache.clear();
    state.admin = false;
    if (user) {
      const token = await user.getIdTokenResult();
      state.admin = token.claims.admin === true;
      const back = store.get('sessionStorage', RETURN_KEY);
      if (back) {
        store.remove('sessionStorage', RETURN_KEY);
        if (back !== location.pathname) history.replaceState(null, '', back);
      }
    }
    route();
  });
}

async function doSignOut() {
  await signOut(fb.auth);
  navigate('/clients', true);
}

// ---------- Routing ----------
function parsePath(pathname) {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  return { id: parts[1] ?? null, section: parts[2] ?? 'overview', tooDeep: parts.length > 3 };
}

function navigate(path, replace = false) {
  if (replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
  route();
}

function onLinkClick(event) {
  const link = event.target.closest('a[data-nav]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate(link.getAttribute('href'));
}

async function route() {
  try {
    if (!state.user) return showSignIn();
    const access = await loadAccess();
    const { id, section, tooDeep } = parsePath(location.pathname);

    if (!id) {
      if (state.admin || access.length > 1) return showChooser(access);
      if (access.length === 1) return navigate(`/clients/${access[0].id}`, true);
      return showNotLinked();
    }

    // An address this person may not see looks exactly like a made-up one: the same page,
    // with no request to the database, so nothing hints at which clients exist.
    const allowed = state.admin || access.some((c) => c.id === id);
    if (!allowed) {
      if (access.length === 0) return showNotLinked();
      return navigate('/clients', true);
    }
    if (tooDeep || !SECTIONS.includes(section)) return navigate(`/clients/${id}`, true);

    const data = await loadClient(id);
    if (!data) return navigate('/clients', true);
    frame({ title: copy.sections[section], clientId: id, clientName: data.client.name, section });
    if (section === 'costs') return showCosts(id, data);
    if (section === 'documents') return showDocuments(id, data, openDocument);
    if (section === 'invoices') return showInvoices(id, data);
    if (section === 'account') return await showAccount(id, data);
    return showOverview(id, data);
  } catch {
    showError();
  }
}

async function openDocument(d, mode) {
  const { openFile } = await import('./files.js');
  return openFile(fb.app, d, mode);
}

// ---------- Data ----------
async function loadAccess() {
  if (state.access) return state.access;
  if (state.admin) {
    const snap = await getDocs(collection(fb.db, 'clients'));
    state.access = snap.docs.map((d) => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name));
    return state.access;
  }
  const email = state.user.email?.toLowerCase();
  if (!email || !state.user.emailVerified) return (state.access = []);
  const snap = await getDocs(query(collectionGroup(fb.db, 'members'), where('email', '==', email)));
  const ids = snap.docs.map((d) => d.ref.parent.parent.id);
  const clients = await Promise.all(ids.map(async (id) => {
    const c = await getDoc(doc(fb.db, 'clients', id));
    return c.exists() ? { id, name: c.data().name } : null;
  }));
  state.access = clients.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  return state.access;
}

const newestFirst = (a, b) => (b.date ?? '').localeCompare(a.date ?? '') || (a.title ?? a.number ?? '').localeCompare(b.title ?? b.number ?? '');

async function loadClient(id) {
  if (state.cache.has(id)) return state.cache.get(id);
  const base = ['clients', id];
  const [clientSnap, costsSnap, logSnap, docsSnap, invoiceSnap, accountSnap] = await Promise.all([
    getDoc(doc(fb.db, ...base)),
    getDoc(doc(fb.db, ...base, 'data', 'costs')),
    getDocs(query(collection(fb.db, ...base, 'buildLog'), orderBy('date'))),
    getDocs(collection(fb.db, ...base, 'documents')),
    getDocs(collection(fb.db, ...base, 'invoices')),
    getDoc(doc(fb.db, ...base, 'account', 'details')),
  ]);
  if (!clientSnap.exists()) return null;
  const data = {
    client: clientSnap.data(),
    costs: costsSnap.exists() ? costsSnap.data() : null,
    buildLog: logSnap.docs.map((d) => d.data()),
    documents: docsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(newestFirst),
    invoices: invoiceSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(newestFirst),
    account: accountSnap.exists() ? accountSnap.data() : null,
  };
  state.cache.set(id, data);
  return data;
}

// ---------- Page frame: header, section tabs, title ----------
function frame({ title, clientId = null, clientName = '', section = null, pageHasSignOut = false }) {
  document.title = [title, clientName, copy.titleSuffix].filter(Boolean).join(' | ');
  headerName.textContent = clientName;
  adminBadge.hidden = !(state.admin && clientId);
  signOutButton.hidden = !state.user || pageHasSignOut;
  if (!clientId) {
    sectionNav.hidden = true;
    return;
  }
  sectionNav.hidden = false;
  mount(
    sectionList,
    SECTIONS.map((key) =>
      h('li', null, h('a', { href: key === 'overview' ? `/clients/${clientId}` : `/clients/${clientId}/${key}`, 'data-nav': true, 'aria-current': key === section ? 'page' : null }, copy.sections[key])),
    ),
  );
  // Keep the chosen tab in view when the tabs are wider than the screen.
  const current = sectionList.querySelector('[aria-current="page"]')?.parentElement;
  if (current) {
    const left = current.offsetLeft - (sectionList.clientWidth - current.offsetWidth) / 2;
    sectionList.scrollLeft = Math.max(0, left);
  }
  updateTabFades();
}

function updateTabFades() {
  const ul = sectionList;
  ul.classList.toggle('more-left', ul.scrollLeft > 2);
  ul.classList.toggle('more-right', ul.scrollLeft + ul.clientWidth < ul.scrollWidth - 2);
}

function showError() {
  frame({ title: copy.signIn.title });
  mount(main, h('div', { class: 'page-grid view' }, h('div', { class: 'view-body' }, h('p', { class: 'lede' }, copy.loadError))));
}

// ---------- Sign-in ----------
function inAppBrowser() {
  const ua = navigator.userAgent;
  return /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Twitter|MicroMessenger|Snapchat|Line\/|GSA\//.test(ua)
    || (/iPhone|iPad|iPod/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua))
    || (/Android/.test(ua) && /; wv\)/.test(ua));
}

async function googleSignIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const phone = matchMedia('(pointer: coarse)').matches && matchMedia('(max-width: 48em)').matches;
  if (phone) {
    store.set('sessionStorage', RETURN_KEY, location.pathname);
    return signInWithRedirect(fb.auth, provider);
  }
  try {
    await signInWithPopup(fb.auth, provider);
  } catch (error) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(error.code)) {
      store.set('sessionStorage', RETURN_KEY, location.pathname);
      return signInWithRedirect(fb.auth, provider);
    }
    if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
      state.signInError = true;
      showSignIn();
    }
  }
}

/** The Sign in with Google button, drawn to Google's branding rules (light theme). */
function googleButton(label) {
  return h(
    'button',
    { type: 'button', class: 'gsi-button', onclick: googleSignIn },
    h('img', { class: 'gsi-mark', src: gMark2x, srcset: `${gMark2x} 2x, ${gMark3x} 3x`, width: 20, height: 20, alt: '' }),
    h('span', { class: 'gsi-text' }, label),
  );
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = h('textarea', { readonly: true, class: 'vh' });
    area.value = text;
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

function inAppNotice(t) {
  const link = `${location.origin}${location.pathname}`;
  const shown = h('input', { class: 'copy-fallback', type: 'text', readonly: true, value: link, hidden: true, 'aria-label': t.copyLink });
  const button = h('button', {
    type: 'button',
    class: 'btn btn--secondary',
    onclick: async () => {
      if (await copyText(link)) {
        button.textContent = t.copied;
      } else {
        // The browser would not copy: show the link, selected, to copy by hand.
        shown.hidden = false;
        shown.select();
      }
    },
  }, t.copyLink);
  return h('div', { class: 'notice in-app' }, h('p', null, t.inAppBrowser), h('div', { class: 'actions' }, button), shown);
}

function showSignIn() {
  const t = copy.signIn;
  frame({ title: t.title });
  const parts = [heading(t.heading), h('p', { class: 'lede' }, t.intro)];
  if (state.signInError) parts.push(h('p', { class: 'notice', role: 'alert' }, t.error));
  if (inAppBrowser()) parts.push(inAppNotice(t));
  parts.push(h('div', { class: 'actions' }, googleButton(t.google)));

  if (settings.emailLinkSignIn) {
    const input = h('input', { id: 'signin-email', type: 'email', name: 'email', autocomplete: 'email', required: true, inputmode: 'email' });
    parts.push(h(
      'form',
      {
        class: 'email-form',
        onsubmit: async (event) => {
          event.preventDefault();
          const email = input.value.trim().toLowerCase();
          if (!email) return;
          try {
            await sendSignInLinkToEmail(fb.auth, email, { url: `${location.origin}/clients`, handleCodeInApp: true });
            store.set('localStorage', EMAIL_KEY, email);
            showLinkSent();
          } catch {
            state.signInError = true;
            showSignIn();
          }
        },
      },
      h('label', { for: 'signin-email' }, t.emailLabel),
      input,
      h('button', { type: 'submit', class: 'btn btn--secondary' }, t.emailButton),
    ));
  }
  parts.push(h('p', { class: 'trouble' }, ...linked(t.trouble, contactLink())));
  render(...parts);
}

function showLinkSent() {
  const t = copy.signIn;
  frame({ title: t.sentHeading });
  render(heading(t.sentHeading), h('p', { class: 'lede' }, t.sentBody));
}

async function finishEmailLink() {
  const stored = store.get('localStorage', EMAIL_KEY);
  const complete = async (email) => {
    await signInWithEmailLink(fb.auth, email, location.href);
    store.remove('localStorage', EMAIL_KEY);
    history.replaceState(null, '', '/clients');
  };
  if (stored) return complete(stored).catch(() => (state.signInError = true));

  // Opened on another device: ask for the address once.
  const t = copy.signIn;
  await new Promise((resolve) => {
    const input = h('input', { id: 'confirm-email', type: 'email', autocomplete: 'email', required: true });
    frame({ title: t.title });
    render(
      heading(t.heading),
      h(
        'form',
        {
          class: 'email-form',
          onsubmit: async (event) => {
            event.preventDefault();
            await complete(input.value.trim().toLowerCase()).catch(() => (state.signInError = true));
            resolve();
          },
        },
        h('label', { for: 'confirm-email' }, t.confirmLabel),
        input,
        h('button', { type: 'submit', class: 'btn btn--primary' }, t.confirmButton),
      ),
    );
  });
}

// ---------- Not linked and chooser ----------
function showNotLinked() {
  const t = copy.notLinked;
  frame({ title: t.heading, pageHasSignOut: true });
  render(
    heading(t.heading),
    h('p', { class: 'lede' }, t.body),
    h('p', { class: 'signed-in-as' }, fill(t.signedInAs, { email: state.user.email ?? '' })),
    h(
      'div',
      { class: 'actions' },
      h('a', { class: 'btn btn--primary', href: contactLink() }, t.emailButton),
      h('button', { type: 'button', class: 'btn btn--secondary', onclick: doSignOut }, t.signOut),
    ),
  );
}

function showChooser(access) {
  const t = copy.chooser;
  frame({ title: t.heading });
  render(
    heading(t.heading),
    state.admin ? h('p', { class: 'lede' }, t.adminNote) : null,
    h('ul', { class: 'chooser' }, access.map((c) => h('li', null, h('a', { href: `/clients/${c.id}`, 'data-nav': true }, c.name)))),
  );
}
