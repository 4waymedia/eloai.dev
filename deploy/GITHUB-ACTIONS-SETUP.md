# Auto-Deploy Setup: GitHub Actions → SSH → eloai.dev

This makes every `git push` to `master` automatically run the test suite and deploy
`website/` to the server. Workflow file: `.github/workflows/deploy.yml`.

**Flow:** push → GitHub Actions runs tests → on success, rsyncs `website/` to
`wayto5@4waytours.com:~/eloai.dev/` over SSH (port 2222).

You only do this setup **once**. After that, deploys are hands-off.

---

## Part 1 — Create a deploy SSH key

This is a dedicated key used *only* by GitHub Actions. Generate it on your machine
(it never gets committed to the repo):

```bash
ssh-keygen -t ed25519 -C "github-actions-eloai-deploy" -f eloai_deploy_key -N ""
```

This creates two files in the current folder:

- `eloai_deploy_key`      ← **private** key (goes into a GitHub secret, then delete it)
- `eloai_deploy_key.pub`  ← **public** key (goes onto the server)

---

## Part 2 — Authorize the key on the server

Add the **public** key to the server's authorized keys so Actions can log in:

```bash
ssh -p 2222 wayto5@4waytours.com "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" < eloai_deploy_key.pub
```

(You'll be prompted for your normal server password this one time.)

Confirm the deploy folder exists and note its path:

```bash
ssh -p 2222 wayto5@4waytours.com "ls -ld ~/eloai.dev && echo HOME=\$HOME"
```

If `~/eloai.dev` is the document root for eloai.dev, you're set. If the docroot is
elsewhere (e.g. `public_html/eloai.dev`), note that path for `DEPLOY_PATH` below.

---

## Part 3 — Capture the server host key

This lets Actions trust the server without an interactive prompt:

```bash
ssh-keyscan -p 2222 4waytours.com
```

Copy the **entire** output (all lines). You'll paste it into the `SSH_KNOWN_HOSTS`
secret in Part 4.

---

## Part 4 — Add secrets and variables to GitHub

Go to your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**.

### Secrets (tab: "Secrets") — sensitive, encrypted

| Name              | Value                                                        |
|-------------------|-------------------------------------------------------------|
| `SSH_PRIVATE_KEY` | Full contents of `eloai_deploy_key` (include the BEGIN/END lines) |
| `SSH_KNOWN_HOSTS` | Full output from the `ssh-keyscan` command in Part 3        |

### Variables (tab: "Variables") — non-sensitive config

| Name          | Value             |
|---------------|-------------------|
| `SSH_HOST`    | `4waytours.com`   |
| `SSH_USER`    | `wayto5`          |
| `SSH_PORT`    | `2222`            |
| `DEPLOY_PATH` | `eloai.dev/`      |

> `DEPLOY_PATH` is relative to the SSH home dir, so `eloai.dev/` resolves to
> `~/eloai.dev/`. Use a trailing slash. If your docroot is elsewhere, set the
> path accordingly (e.g. `public_html/eloai.dev/`).

---

## Part 5 — Clean up

Delete the local private key once it's stored in the GitHub secret — Actions has it now:

```bash
rm eloai_deploy_key eloai_deploy_key.pub
```

---

## Part 6 — Test it

1. Trigger manually first: repo → **Actions** tab → **Deploy eloai.dev** → **Run workflow**.
2. Watch the run. The `test` job runs the persona suite; `deploy` rsyncs the site.
3. Or just push a change to anything under `website/` and watch it deploy automatically.

---

## Notes

- **`--delete` is on.** The server's deploy folder becomes an exact mirror of `website/`.
  Anything in `~/eloai.dev/` that isn't in the repo gets removed (except `.git` and
  `.well-known`, which are excluded). Keep all served files in the repo.
- **Only `website/` deploys.** Docs, data, research, and tests stay in the repo and
  never reach the server.
- **Branch is `master`.** The workflow triggers on pushes to `master`. If you rename
  the default branch, update `deploy.yml`.
- **Rollback:** revert the commit and push, or re-run an older successful run from the
  Actions tab.
