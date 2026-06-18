# FastAPI-behind-PHP-Proxy on cPanel — Troubleshooting Runbook

> Field manual for FastAPI apps running on InMotion shared cPanel/CloudLinux
> (no root, no systemd), fronted by an `index.php` reverse proxy, nginx, and
> Cloudflare. Written from a live incident on `api.myshortcasts.com`. The same
> stack and gotchas apply to `mst.eloai.dev`.
>
> Standalone doc — keep it next to the MST handoff, not in the eloai.dev repo.

---

## The environment (why this is weird)

`ecngx303` is InMotion **shared cPanel + CloudLinux**:

- **No `sudo`, no systemd** — `systemctl --user` fails ("Failed to connect to bus").
  Long-running processes can't be services; they're launched by a script + `nohup`
  and kept alive by **cron**.
- **Multiple layers in front of the app:**
  `browser → Cloudflare → nginx (reverse-proxy cache) → Apache/LSPHP (OPcache) → index.php → uvicorn (FastAPI)`
- **ModSecurity** blocks bare `curl` (returns `406 Not Acceptable`). Add
  `-A "Mozilla/5.0"` to any curl that hits the public/origin hostname.
- The API is a **uvicorn process on `127.0.0.1:<port>`**, reverse-proxied by an
  `index.php` in the subdomain docroot. Each app needs a **unique port**
  (myshortcasts = 8000, mst = 8001).

---

## 1. "The API isn't working" — the process isn't running

**Signal:** endpoints time out / 502-ish; nothing answers on the port.

```bash
ps aux | grep "uvicorn main:app" | grep -v grep      # is it running?
tail -30 ~/<app>_api.log                              # why did it stop?
```
A clean `INFO: Shutting down` in the log = it was **terminated** (host reaped it),
not a crash. No systemd = nothing restarts it.

**Fix — start it (background, with PID):**
```bash
nohup ~/start_<app>_api.sh > ~/<app>_api.log 2>&1 &
echo $! > ~/<app>_api.pid
sleep 2; ps aux | grep "uvicorn main:app" | grep -v grep
```

**Prevent — cron keepalive** (start only if not running), so a reap auto-recovers:
```cron
*/3 * * * * pgrep -f "uvicorn main:app --host 127.0.0.1 --port 8000" >/dev/null 2>&1 || /home/wayto5/start_myshortcasts_api.sh >> /home/wayto5/myshortcasts_api.log 2>&1
```

---

## 2. `Access denied (1045)` — DB password mismatch

**Signal (in the API log):**
```
❌ Database: FAILED - 1045 (28000): Access denied for user 'wayto5_xxx'@'localhost' (using password: YES)
```
The app still boots (routes register) but every DB endpoint fails.

**Root cause:** the password the app loads (here: `config/api_config.json`, *not*
`.env`) no longer matches the MySQL user.

**Diagnose — test the credential directly:**
```bash
mysql -u wayto5_xxx -p -e "SELECT 1;"     # type the password from the config file
```
`ERROR 1045` = stale password. `1` = creds fine, look elsewhere (wrong DB name / grants).

**Fix — set both sides to one known value:**
1. cPanel → **MySQL® Databases** → Current Users → the user → **Set Password**
   (avoid `" \ $` to keep JSON/shell simple).
2. Put that exact value into the active config (`config/api_config.json` → `"password"`).
3. Same page: confirm the user is attached to the DB with **ALL PRIVILEGES**.
4. Restart the API (section 1). Log should show `✅ Database: Connected`.

> Tip: find where creds actually live with
> `grep -rn "wayto5_xxx" . | grep -v /.venv/` — it's often a JSON/py config, not `.env`.

---

## 3. `[Errno 98] address already in use` — duplicate instances

**Signal:** `ERROR: [Errno 98] error while attempting to bind on address ('127.0.0.1', 8000): address already in use`, then the new instance shuts down. Repeated `nohup` launches stack up.

**Fix — collapse to exactly one:**
```bash
ps aux | grep "uvicorn main:app" | grep -v grep     # see them all
pkill -f "uvicorn main:app"; sleep 2
nohup ~/start_<app>_api.sh > ~/<app>_api.log 2>&1 &
echo $! > ~/<app>_api.pid
```

---

## 4. Frontend calls fail but the API works directly — CORS, doubled header

**Signal (browser console):**
```
Access to fetch ... blocked by CORS policy: The 'Access-Control-Allow-Origin'
header contains multiple values 'https://site, https://site', but only one is allowed.
```
Typing the API URL in the address bar **works** (browsers don't enforce CORS on
direct navigation); only the frontend `fetch()` is blocked. Often shows
`net::ERR_FAILED 200` — data is there, the browser just won't release it.

**Diagnose — locate the duplicate (use `-A` to dodge ModSecurity):**
```bash
# public (through everything)
curl -s -i -A "Mozilla/5.0" -H "Origin: https://site" "https://api.site/endpoint" | grep -i access-control-allow-origin
# backend direct (bypass proxy + caches)
curl -s -i -H "Origin: https://site" "http://127.0.0.1:8000/endpoint" | grep -i access-control-allow-origin
```
- Backend-direct returns **one** header but public returns **two** → the duplicate is
  added by the **proxy/caches**, not FastAPI.
- Tell which header is doubled: on a plain GET, FastAPI's `CORSMiddleware` emits only
  `Allow-Origin` and `Allow-Credentials` (not `Allow-Headers`/`Allow-Methods`). If
  exactly those two are doubled, the **`index.php` proxy is relaying FastAPI's copy on
  top of its own.**

**Root cause:** `index.php` sets its own CORS headers AND its header-relay loop
forwards FastAPI's with `header($headerLine, false)` (add, don't replace) → two copies.

**Fix — stop the proxy relaying upstream CORS headers.** In the relay loop's skip list:
```php
// before:
if (in_array($headerName, ['content-length','connection','transfer-encoding','content-encoding'], true)) { continue; }
// after — add the CORS headers so the proxy's own single set is authoritative:
if (in_array($headerName, ['content-length','connection','transfer-encoding','content-encoding',
    'access-control-allow-origin','access-control-allow-credentials',
    'access-control-allow-headers','access-control-allow-methods','vary'], true)) { continue; }
```
(Alternative: remove `CORSMiddleware` from FastAPI so there's nothing to relay.)

---

## 5. The fix "did nothing" — layered caches served the old response

**Signal:** you edited `index.php` correctly, but the public response is **unchanged**.
This was the biggest time-sink. The code on disk is right; a cache upstream is serving
a copy captured *before* the edit.

**Walk the cache layers, outermost in:**
```bash
curl -s -D - -o /dev/null -A "Mozilla/5.0" -H "Origin: https://site" \
  "https://api.site/endpoint" | grep -iE "^HTTP|access-control|cf-cache-status|^age:|x-proxy-cache|x-cache|server:"
```
- **`cf-cache-status: DYNAMIC`** → Cloudflare is *not* caching it. Rule it out.
- **`server: nginx`** → there's a cPanel/nginx reverse-proxy cache in front of PHP.
- **OPcache** (PHP bytecode): `opcache_reset()` — but note a script that just `echo`s
  "reset ok" proves nothing; the reset can silently no-op.

**The actual culprit here:** the **cPanel/nginx reverse-proxy cache**.

**Fix:** cPanel → (domain) → **Purge full cache** (nginx cache manager). The edit + the
purge were **both** required — code fix alone did nothing until the cached response was
cleared.

**Prevent (do this — an API should never be cached):**
- Send `Cache-Control: no-store` from the app/proxy so no layer caches API responses:
  ```php
  header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
  ```
- Exclude the API subdomain from the nginx cache in cPanel's cache manager.
- Optionally set the API subdomain to **Bypass cache** in Cloudflare (Rules → Cache Rules).

---

## Quick reference — order of attack

1. Is the **process** up? (`ps`, `tail` the log) → restart + keepalive cron.
2. Does the log show **`✅ Database: Connected`**? If `1045`, fix the password in the config file (not `.env`).
3. Only **one** uvicorn? (`pkill` extras, port 8001 for MST.)
4. CORS doubled? Backend-direct curl to localize → fix the `index.php` relay.
5. Fix not showing? **Purge the cPanel/nginx cache**, then add `Cache-Control: no-store`.

Golden rule on this box: **after any origin change, the cache will lie to you.**
Purge it (or cache-bust with a unique `?query=`) before concluding a fix didn't work.
