# Deploying eloai.dev

## Local Development

```bash
# Install dependencies
npm install

# Start dev server on http://localhost:3000
npm start
```

Opens the `website/` folder as a static site. No build step needed — Babel transpiles JSX in the browser.

---

## Deploy to Production (Cloudflare Pages)

**eloai.dev** is a fully static site, so it deploys instantly to any static host. **Cloudflare Pages** is recommended:

### Setup

1. **Push to GitHub** (if not already):
   ```bash
   git push origin main
   ```

2. **In Cloudflare Dashboard:**
   - Go to **Pages**
   - Click **Create a project** → **Connect to Git**
   - Select your repo (`eloai-dev` or whatever you named it)
   - **Build settings:**
     - Framework: *(none)* — this is a static site
     - Build command: *(leave blank)*
     - Build output directory: `website`
   - Click **Save and Deploy**

3. **Add custom domain:**
   - In the Pages project settings, add `eloai.dev` as your custom domain
   - Cloudflare will verify DNS ownership (if you're using Cloudflare for `eloai.dev` DNS)

### Result

- ✅ Site live at `https://eloai.dev`
- ✅ Auto-deploys on every `git push` to main
- ✅ HTTPS, CDN, & zero-downtime updates handled by Cloudflare
- ✅ Subdomains (`app.eloai.dev`, `blog.eloai.dev`, etc.) can each get their own Pages project

---

## Subdomain Projects

Each sub-project on a subdomain can be a separate repo deployed to its own Cloudflare Pages project:

```
- eloai.dev (main lab site — this repo)
- app.eloai.dev (production agents)
- research.eloai.dev (open notebooks)
- agents.eloai.dev (live deployments)
- etc.
```

Each points to its own GitHub repo → Cloudflare Pages project.

---

## Uptime & Monitoring

Cloudflare Pages automatically handles:
- **99.9%+ uptime** (Cloudflare's global infrastructure)
- **HTTPS** for all domains
- **DDoS protection**
- **Global CDN caching**
- **Automatic deployments** on every push

No servers to manage, no uptime monitoring needed. Once you push, it's live.
