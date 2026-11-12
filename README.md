# scout-iq.com

The website of ScoutIQ LLC, a small studio in Oshkosh, Wisconsin.

It is a static site built with [Astro](https://astro.build) and served by Firebase Hosting at https://scout-iq.com. It has no backend, no database, no analytics and no requests to other sites.

## What it uses

- **Astro 7**, static output. Every page is plain HTML at build time.
- **Plain CSS** with custom properties. There is no UI framework and no CSS framework.
- **Vanilla JavaScript**, used only for the hero demo (the spreadsheet and the phone) and for the Copy address button. The pages read and work with JavaScript off.
- **Fonts:** League Gothic and Libre Franklin, self-hosted as Latin-subset woff2 files under the SIL Open Font License. The licence files are in `src/fonts/`.

## Run it on your computer

You need Node.js 22.23.4 or newer.

```
npm install
npm run dev        # http://localhost:4321, reloads as you edit
npm run build      # writes the finished site to dist/
npm run preview    # serves dist/ the way it will be served live
```

## Where things live

```
src/
  copy/              every word on the site
    site.json        page title, description, navigation, footer, not-found page
    home.json        the home page: hero, demo examples, sections, contact
    legal/           privacy.md and terms.md
  settings.json      contact address, email subject, legal "Last Updated" date,
                     the Client sign in switch
  styles/global.css  colors, fonts, type scale, spacing, the 12 column grid, buttons
  components/        one file per part of the page (Header, Hero, Demo, Footer, ...)
  layouts/           the page shell (Base) and the legal page layout
  pages/             index, privacy, terms, 404, sitemap.xml
  scripts/demo.js    the hero demo
  assets/            logos and the two product screenshots (optimized at build time)
  fonts/             woff2 files and their licences
public/              copied as is: icons, robots.txt, the web manifest, the social
                     preview image, the Search Console file, flutter_service_worker.js
```

## Common edits

- **Change any wording:** edit the JSON or Markdown in `src/copy/`. Nothing on the site is written inside a component.
- **Change the contact address or the email subject:** edit `src/settings.json`. Every mail link and the address shown on the page update together.
- **Update the legal pages:** edit `src/copy/legal/privacy.md` or `terms.md`, then set `legalLastUpdated` in `src/settings.json` to the day the change goes live.
- **Turn on the Client sign in link:** set `clientSignIn.enabled` to `true` in `src/settings.json`. It points at `/clients`, which does not exist yet.
- **Swap a product screenshot:** replace the PNG in `src/assets/products/` with a phone screenshot of the same shape (about 9 by 19.5). Astro makes the AVIF and WebP versions.

After any change, check it with `npm run dev`, then publish as described in [DEPLOYMENT.md](DEPLOYMENT.md).

## Design rules in short

- **Colors:** six named tokens in `src/styles/global.css`: Charcoal, Lime, Chalk, Cell, Line and Moss. White is only for the phone screens. One muted grey is used only for unavailable rows inside the sample phones.
- **Type:** League Gothic for headlines and big numbers, never under 28 px. Libre Franklin for everything else.
- **Type scale:** 16, 18, 21, 24, 36, 48, 72, 96. The hero headline sits outside it, at 72 or 96 px or sized to fit on one line.
- **Layout:** left aligned on a 12 column grid, 1200 px wide at most.
- **Motion:** one moment only, the demo's rows moving. Reduced motion is respected.

## The old Flutter site

Until November 2026 the site was a Flutter web app. Its last version is kept in git history under the tag `flutter-site-final`.

One file from it is still served on purpose: `public/flutter_service_worker.js`. It is the Flutter app's self-unregistering service worker. Any browser that still has the old worker installed fetches this one, removes itself and reloads the page.

## Secrets

This repository is public. Never commit keys, service account files or `.env` files. `.gitignore` blocks the usual names, but check `git status` before every commit.

Copyright 2026 ScoutIQ LLC.
