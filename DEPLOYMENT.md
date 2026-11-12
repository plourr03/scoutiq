# Deploying scout-iq.com

The site is hosted on Firebase Hosting:

- **Project:** `scoutiq-94b8e`
- **Hosting site:** `scoutiq-94b8e`
- **Custom domain:** scout-iq.com

Deploys are done by hand from a computer with the Firebase CLI. There is no CI.

## One-time setup

1. Install Node.js 22.23.4 or newer, then run `npm install` in this folder.
2. Install the Firebase CLI (`npm install -g firebase-tools`).
3. Run `firebase login` with the Google account that owns the project.

The project ID is already set in `.firebaserc`. No keys or config files are needed to deploy, and none belong in this repository.

## Check a change on a preview link first

```
firebase hosting:channel:deploy preview --expires 7d
```

This builds the site and publishes it to a private preview address of the form `https://scoutiq-94b8e--preview-xxxx.web.app`. The CLI prints the exact link.

- The live site is not touched.
- Preview links tell search engines not to index them, so Lighthouse shows a lower SEO score there. That is expected.

## Publish to the live site

```
firebase deploy --only hosting
```

`npm run build` runs automatically first, so what goes live is always a fresh build of the current files.

## What the hosting settings do

`firebase.json` tells Firebase Hosting to:

- **What it serves:** the `dist/` folder.
- **Legal pages:** `/privacy` and `/terms` are served without `.html`. The `.html` addresses and the trailing-slash addresses redirect to them.
- **Unknown addresses:** they show the "That page is not here." page with a real 404 status. There is no catch-all rewrite.
- **Caching:** files in `/_astro/` (fonts, scripts, images, all with a hash in their names) are cached for a year. The old Flutter service worker is never cached, so browsers always get the cleanup version.
- **Search Console file:** `google9273129ebdea3e62.html` is served at its exact address.

## After a live deploy, check

- https://scout-iq.com loads the new version (try a private window).
- https://scout-iq.com/privacy and https://scout-iq.com/terms load.
- A made-up address, such as https://scout-iq.com/nothing-here, shows the not-found page with a 404.
- https://scout-iq.com/robots.txt and https://scout-iq.com/sitemap.xml load.
- https://scout-iq.com/google9273129ebdea3e62.html loads.
- Lighthouse on a phone profile scores 95 or better for Performance and 100 for Accessibility, Best Practices and SEO.

## Roll back

In the Firebase console, open Hosting and find the release history. Choose the previous release and select **Roll back**. This takes effect in seconds and needs no rebuild.

To go back to a specific version of the code instead, check out that commit and run `firebase deploy --only hosting`. The last Flutter version is under the tag `flutter-site-final`, but it needs the Flutter SDK to build.

## The www address

`www.scout-iq.com` is not connected yet. To fix it:

1. In the Firebase console, open Hosting and choose **Add custom domain**.
2. Enter `www.scout-iq.com` and choose to redirect it to `scout-iq.com`.
3. Add the DNS records Firebase shows at the domain registrar (Namecheap, Advanced DNS).
4. Wait until the domain shows as connected.

## Search Console

The sitemap to submit is https://scout-iq.com/sitemap.xml.

The verification file stays in `public/`. Do not remove it, or the property loses its verification.
