# Publish the game at laanapha.com (Cloudflare Pages)

The website is the full game: home and character select (scene 1), the Trick or Treat run
(scene 2) and the event map with the ending (scene 3), served at the root of the domain.

| What | Value |
|---|---|
| Build command | `npm run build:site` |
| Build output directory | `dist-site` |
| Root directory | (empty: the repo root) |
| Framework preset | None |
| Node.js | 22 (set the environment variable `NODE_VERSION` = `22`) |
| Optional variable | `SITE_URL` (default `https://laanapha.com/`). The link-preview image address uses it, so set it if the game lives on another address, for example `https://www.laanapha.com/` |
| Size | about 4.3 MB, about 220 files (Pages allows 20,000 files and 25 MiB per file) |
| Cost | Pages Free plan: static files have unlimited requests and bandwidth, 500 builds a month. You only pay for the domain |

`dist-site/` holds `index.html` (the game), `assets/` (hashed files), `og.png` (the link-preview
image), the icons, `robots.txt` and `_headers` (Cloudflare caches `assets/` for a year and
revalidates everything else, so a new deploy shows up at once).

## 1. The domain

You need `laanapha.com` in your Cloudflare account, using Cloudflare's nameservers. Cloudflare
Pages can only serve the bare domain (apex) of a zone that is on Cloudflare.

- **Not registered yet:** dashboard -> Domain Registration -> Register Domains -> search
  `laanapha.com`. Cloudflare Registrar sells at cost, and the zone is set up for you.
- **Registered somewhere else** (GoDaddy, Namecheap, a Thai registrar, ...): dashboard -> Add a
  domain (Websites -> Add) -> `laanapha.com` -> Free plan. Cloudflare imports the existing DNS
  records (check that email (MX) records came across if you use email on this domain). It then
  shows 2 nameservers (like `xxx.ns.cloudflare.com`): at your registrar, replace the nameservers
  with those 2. Activation takes minutes to a day. Cloudflare emails you when the domain is active.
- **Can't move the nameservers?** Use a subdomain instead, for example `game.laanapha.com`: at your
  current DNS provider add `CNAME game -> <project>.pages.dev`, and add that subdomain as the custom
  domain in step 3.

## 2. The Pages project

**Option A: connected to GitHub (recommended: every push deploys by itself)**

1. Pick the branch that is the live site. The repo has no `main` branch yet. Either create `main`
   from `claude/gracious-darwin-r6e6fq` (the branch with all three scenes) and use `main`, or use
   `claude/gracious-darwin-r6e6fq` directly.
2. Dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git -> GitHub. Allow the
   Cloudflare Pages app to access `trerapop/Lannapa-Halloween-Fest`, then select the repo.
3. Project name: `laanapha`, which gives the free address `https://laanapha.pages.dev`.
   Production branch: the branch from step 1.
4. Build settings: Framework preset **None**, Build command **`npm run build:site`**, Build output
   directory **`dist-site`**. Under Environment variables add **`NODE_VERSION` = `22`**.
5. Save and Deploy. The first build takes about 1-2 minutes. Open `https://laanapha.pages.dev` on a phone.

Pushes to other branches get their own preview addresses (`<branch>.laanapha.pages.dev`), so
changes can be checked before they go live.

**Option B: upload the built folder (no GitHub link)**

1. On a computer with Node.js 22: `npm ci && npm run build:site`. Or use the `dist-site` zip
   from the session.
2. Dashboard -> Workers & Pages -> Create -> Pages -> Upload assets -> project name `laanapha` ->
   drag in the `dist-site` folder (or the zip) -> Deploy.
3. For each update, build again and upload again: open the project -> Create deployment.

**Option C: from a terminal (Wrangler)**

```
npm ci && npm run build:site
npx wrangler login
npx wrangler pages deploy dist-site --project-name laanapha --branch main
```

## 3. Connect laanapha.com

1. Open the Pages project -> Custom domains -> Set up a custom domain -> `laanapha.com` ->
   Activate. Because the domain is on Cloudflare, the DNS record (a CNAME to
   `laanapha.pages.dev`) is created for you.
2. Do the same for `www.laanapha.com`. To send www to the bare domain: the domain -> Rules ->
   Redirect Rules -> template "Redirect from WWW to root" (301).
3. SSL is automatic, and the certificate is ready within a few minutes. In the domain -> SSL/TLS ->
   Edge Certificates, turn on **Always Use HTTPS**.

## 4. Check it

- Open `https://laanapha.com` on an iPhone (Safari) and an Android phone (Chrome). Play to the
  end, and turn the sound on with the speaker icon.
- Paste the link into a LINE chat and a Facebook post: the preview should show the home screen
  image (`og.png`) and the title. LINE and Facebook keep old previews for a while. Facebook's
  Sharing Debugger (developers.facebook.com/tools/debug) refreshes it.
- For posters, make a QR code that points to `https://laanapha.com`.

## Let Claude deploy for you next time

Create a Cloudflare API token (My Profile -> API Tokens -> Create Token -> Custom: Account ->
**Cloudflare Pages -> Edit**, for your account only). Store it in the Claude cloud environment's
settings, never in a chat: open the environment menu in the session's title bar -> Edit, then add
the environment variables `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (the account ID is on
the dashboard's Workers & Pages overview). Under Network access, allow `api.cloudflare.com`
(https://code.claude.com/docs/en/cloud-environments#network-access). A new session can then run
Option C.

## Updating the site

- Game changes: push to the production branch (Option A) or build and upload again (B, C).
- Title, description and link-preview tags: `vite.site.config.js` (`TITLE`, `DESCRIPTION`, `SITE_URL`).
- Share image and icons: `npm run dev`, then `npm run site:assets` (writes `site/og.png` and the icons
  from the game's own home screen and its mascot).
- Before publishing, run the full playthrough on the site build (see the README, "Website").
