# KornDog Sports — Stremio Addon

GhostKernel-powered Stremio addon for free live sports channels, with a KornDog-branded landing page.

## Current source status

- Pluto TV: connected
- Samsung TV+: planned
- Xumo: planned
- Plex: planned

The site intentionally labels the future providers as planned until their source modules are actually implemented.

## Repo structure

- `index.html` — public KornDog Sports landing/install page
- `netlify/functions/manifest.js` — Stremio manifest
- `netlify/functions/catalog.js` — catalog handler
- `netlify/functions/stream.js` — stream handler
- `lib/pluto.js` — Pluto TV source module
- `lib/sources.js` — source merger
- `index.js` — optional local Node test server
- `netlify.toml` — site publish settings and clean Stremio routes

## Deploy from GitHub to Netlify

1. Create or open the GitHub repo for this project.
2. Upload/push every file in this folder, keeping the directory structure intact.
3. In Netlify choose **Add new site → Import an existing project**.
4. Select the GitHub repo.
5. Netlify should read `netlify.toml` automatically:
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
   - Build command: none
6. Deploy.

Your public pages will be:

```text
https://YOUR-SITE.netlify.app/
https://YOUR-SITE.netlify.app/manifest.json
```

The homepage's **Install in Stremio** button builds the correct `stremio://` install link from the live domain.

## Push an existing local repo

```bash
git add .
git commit -m "Add KornDog Sports landing page"
git push origin main
```

## First-time GitHub push

```bash
git init
git add .
git commit -m "Launch KornDog Sports addon"
git branch -M main
git remote add origin https://github.com/KornDog0804/korndog-sports-addon.git
git push -u origin main
```

## Local backend test

```bash
npm install
npm start
```

Then open:

```text
http://127.0.0.1:7000/manifest.json
```

The static homepage is intended for Netlify deployment. A simple local static server can preview it separately.
