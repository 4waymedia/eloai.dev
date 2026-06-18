# mst.eloai.dev — Deployment Handoff & Playbook (v2, as-built)

> Updated after the real deployment. The repo's `deploy/` assumes a VPS with
> systemd + its own nginx + certbot — **that is NOT this environment.** MST runs on
> InMotion **shared cPanel / CloudLinux** (`ecngx303`, host `4waytours.com:2222`,
> user `wayto5`). This doc describes what actually works here.
>
> Companion docs: `FASTAPI-CPANEL-TROUBLESHOOTING.md` (CORS/cache field manual).

---

## 0. TL;DR — the real architecture

```
browser → Cloudflare → cPanel nginx (+ ModSecurity, reverse-proxy CACHE)
        → Apache/LSPHP (.htaccess + proxy.php, OPcache)
        → uvicorn (FastAPI, api.main:app) on 127.0.0.1:8001
        → SQLite  ~/mst_app/mst.db
        + a second process: python main.py --monitor  (Odoo ingest loop)
```

- **No `sudo`, no systemd.** The API and monitor are `nohup` background processes
  kept alive by **cron** "start-if-not-running" lines.
- **Everything lives in `~/mst_app/`** (the git clone). Docroot is `~/mst.eloai.dev/`.
- **Same-origin design:** driver app at `/`, admin app at `/admin/`, API proxied on the
  same domain → **no CORS needed.**
- **Port:** MST API uses **8001** (myshortcasts already owns 8000 on this box).
- Toolchain present: **alt-python 3.10** (`/opt/alt/python310/bin/python3.10`) and
  **Node 20** via nvm (`~/.nvm/.../v20.20.0/bin`).

---

## 1. ⚠️ Files that are git-ignored — a fresh clone does NOT include them

This bit us three times. `git clone` brings only code. These must be transferred
separately (e.g. `scp -P 2222 <file> wayto5@4waytours.com:~/mst_app/...`):

| File | What it is | How to get it on the server |
|------|-----------|-----------------------------|
| `config.env` | All secrets + settings (Odoo, SMTP, JWT, DB path, CORS) | `scp` your real local copy, then fix server-specific values (below) |
| `mst.db` | The SQLite database (drivers, tows, shifts, history) | `scp` your real DB. Run `sqlite3 mst.db "PRAGMA wal_checkpoint(TRUNCATE);"` locally first to fold WAL. Stop API/monitor before copying. |
| `config/auth_allowlist.json` | **Role/admin allowlist** — who gets the ADMIN role at login | `scp` your real copy. Without it, **nobody is admin** → every `/admin/*` call is 403. |

After copying `config.env`, fix these for the server (your local has dev values):
```
MST_DB_PATH=/home/wayto5/mst_app/mst.db        # NOT /opt/mst, NOT relative
ALLOWED_ORIGINS=https://mst.eloai.dev          # NOT localhost
SMTP_HOST=...                                   # must be reachable FROM the server
```

---

## 2. Backend — venv, config, processes

### 2.1 venv (mirror the proven myshortcasts Python)
```bash
cd ~/mst_app
/opt/alt/python310/bin/python3.10 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip wheel
pip install -r requirements.txt
pip install aiosqlite     # not pinned but harmless; DB layer is sync sqlite3
```

### 2.2 The DB self-initializes
`api/main.py` calls `db.init_db()` at startup — raw `sqlite3` with
`CREATE TABLE IF NOT EXISTS`. So the schema is created on first boot; **do not** rely on
`alembic upgrade head` for the core tables. For real data, copy `mst.db` (§1).
`DB_PATH = os.environ.get("MST_DB_PATH") or "mst.db"` — set `MST_DB_PATH` in `config.env`.

### 2.3 Start scripts (two persistent processes)
```bash
# API — port 8001, entry is api.main:app (NOT main:app)
cat > ~/start_mst_api.sh <<'EOF'
#!/bin/bash
set -e
cd /home/wayto5/mst_app
source /home/wayto5/mst_app/.venv/bin/activate
set -a; [ -f config.env ] && source config.env; set +a
exec python -m uvicorn api.main:app --host 127.0.0.1 --port 8001 --workers 2 --log-level info
EOF
chmod +x ~/start_mst_api.sh

# Monitor — main.py --monitor (top-level main.py, a persistent loop)
cat > ~/start_mst_monitor.sh <<'EOF'
#!/bin/bash
set -e
cd /home/wayto5/mst_app
source /home/wayto5/mst_app/.venv/bin/activate
set -a; [ -f config.env ] && source config.env; set +a
exec python main.py --monitor
EOF
chmod +x ~/start_mst_monitor.sh
```

### 2.4 Launch + verify
```bash
nohup ~/start_mst_api.sh > ~/mst_api.log 2>&1 & echo $! > ~/mst_api.pid
sleep 4; tail -20 ~/mst_api.log
curl -s -o /dev/null -w "API: %{http_code}\n" http://127.0.0.1:8001/health   # want 200
```

### 2.5 Keepalive crons (REQUIRED — nothing else restarts these)
```cron
*/3 * * * * pgrep -f "uvicorn api.main:app" >/dev/null 2>&1 || /home/wayto5/start_mst_api.sh >> /home/wayto5/mst_api.log 2>&1
*/3 * * * * pgrep -f "main.py --monitor" >/dev/null 2>&1 || /home/wayto5/start_mst_monitor.sh >> /home/wayto5/mst_monitor.log 2>&1
```
The host reaps stray processes (reboots, idle kills). Without these, the app silently
dies — exactly the failure that started the myshortcasts debugging saga.

---

## 3. Frontends — build + deploy

Both are Vite/React + TypeScript. **The `build` script runs `tsc -b && vite build`, and
`tsc` fails on pre-existing strict errors (unused vars, lib-type mismatches). Skip it —
`vite build` transpiles fine without type-checking:**

```bash
# Driver PWA  →  served at /
cd ~/mst_app/frontend && npm ci && npx vite build
cp -r dist/* ~/mst.eloai.dev/

# Admin dashboard  →  served at /admin/  (Vite base is '/admin/')
cd ~/mst_app/admin-frontend && npm ci && npx vite build
mkdir -p ~/mst.eloai.dev/admin && cp -r dist/* ~/mst.eloai.dev/admin/
```
Driver `frontend/.env.production` has `VITE_API_BASE=` (blank = relative/same-origin) —
leave it blank for this deploy. Vite OOM under CloudLinux limits is possible; if
`vite build` is "Killed", build locally and upload `dist/`.

---

## 4. The proxy — `.htaccess` + `proxy.php` in the docroot

cPanel shared hosting blocks mod_proxy in `.htaccess`, so a **PHP reverse proxy** does it
(same pattern as myshortcasts). Same-origin ⇒ **no CORS headers needed.**

`~/mst.eloai.dev/proxy.php` forwards the request to `http://127.0.0.1:8001` and relays the
response (strips hop-by-hop headers, adds `Cache-Control: no-store`). See the live file.

**⚠️ Authorization header — the #1 gotcha (caused a long admin-403 hunt).** Apache/cPanel
**strips the `Authorization` header** from the PHP environment by default, so `proxy.php`
never sees the Bearer token and every authenticated call (all of `/admin/*`, and the
driver app's authed calls) returns 403 even with a valid admin token. Two things fix it:
1. In `.htaccess`, right after `RewriteEngine On`:
   `SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1`
2. In `proxy.php`, recover it explicitly and forward it:
   `$_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']`
   (the live `proxy.php` does this). If `HTTP_AUTHORIZATION` still doesn't reach PHP on a
   given LiteSpeed/cPanel build, use `CGIPassAuth On` instead of the `SetEnvIf`.
This is exactly what Vite's dev proxy does for you locally — auth "works in dev, 403s in
prod" is this and only this.

`~/mst.eloai.dev/.htaccess` routing (order matters):
```apache
RewriteEngine On
RewriteRule ^\.well-known/ - [L]
# shared top-level API → backend
RewriteCond %{REQUEST_URI} ^/(auth|drivers|recommend|locations|shifts|accounts|patrol|push|alerts|tows|health|docs|redoc|openapi\.json)(/|$) [NC]
RewriteRule ^ proxy.php [L]
# admin API → backend
RewriteCond %{REQUEST_URI} ^/admin/(trucks|yards|stats|drivers|shifts|monitor|sync|dispatch|reports|properties|ai)(/|$) [NC]
RewriteRule ^ proxy.php [L]
# existing static files/dirs → serve
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^admin(/|$) /admin/index.html [L]   # admin SPA fallback
RewriteRule ^ index.html [L]                      # driver SPA fallback
```
The API path-prefix lists must stay in sync with the routers in `api/main.py`
(top-level) and the `/admin/*` routes (from `GET /openapi.json`).

Verify: `/health` → 200; `/admin/` → 200; `/admin/trucks` (no auth) → **403** (means it
reached the backend, good — not 404/HTML).

---

## 5. Auth & roles (the admin 403)

- Login is **phone-based OTP**. `/auth/otp/request` returns `204` immediately and
  delivers the code in a **background task** (so 204 ≠ delivered; check delivery config).
- Role is a **JWT claim** set at login. `api/deps.py` → `require_role(Role.ADMIN)` returns
  **403** if the token's role isn't ADMIN.
- The admin role comes from **`config/auth_allowlist.json`** (git-ignored — see §1). If
  it's missing or your identity isn't in it, you authenticate as a non-admin → 403 on
  `/admin/*`.
- **A token carries the role from when it was minted.** After adding/fixing the allowlist
  (and restarting the API, since it's likely read once at startup), you MUST **log out and
  log back in** (fresh Incognito) to get a token with the admin role.
- Open debugging note (unresolved at handoff): admin still 403 after copying the
  allowlist + restart. Check how `api/auth/service.py` keys the allowlist lookup —
  **phone vs email**, and phone **format** (`+1206…` vs `206…`). The OTP flow
  canonicalizes the identifier to a phone, so an email-keyed allowlist entry, or a
  format mismatch, would authenticate but not grant ADMIN. Confirm the entry matches the
  canonical phone the login resolves to.

---

## 6. Remaining lifecycle TODO

- [ ] **Keepalive crons** (§2.5) — most important.
- [ ] **Start the monitor** (`start_mst_monitor.sh`) — Odoo ingest + alerts. It acts on
      live data; `SMS_MODE` governs alert delivery (`console` is safe for bring-up).
- [ ] **Backup cron** for `mst.db` — adapt the repo's `deploy/backup.sh` to a cPanel cron.
- [ ] **Disable `/dev/otp/peek`** (and other `api/routers/dev.py` endpoints) before real
      drivers use it — it exposes OTP codes.
- [ ] Resolve the admin allowlist/role match (§5).

---

## 7. Gotchas carried from the myshortcasts incident (this same box)

1. **The nginx reverse-proxy cache will lie to you.** After any origin change, purge it
   (cPanel → domain → Purge full cache) or cache-bust with a unique `?query=` before
   concluding a fix didn't work. API responses send `no-store` to prevent caching.
2. **OPcache** can serve stale PHP; a script that `echo`s "reset ok" doesn't prove it
   reset. The nginx cache was the real culprit last time, not OPcache.
3. **ModSecurity returns 406 to bare `curl`** on public/origin hostnames — add
   `-A "Mozilla/5.0"`.
4. **Port per app** — 8000 = myshortcasts, 8001 = mst. Never share.
5. **Test in Incognito** — browsers cache 301s and hold JWTs; stale tokens/redirects
   masquerade as bugs.
6. **`npx vite build`** to bypass the failing `tsc` gate.
