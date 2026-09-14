# Deploying Memoize

Getting Memoize online for other people takes four services:

| Piece | Service | Cost |
|---|---|---|
| Sign-in | Google OAuth | Free |
| Database | MongoDB Atlas | Free tier (M0) |
| API (Express) | Render | Free tier |
| Frontend (React) | Vercel | Free tier |

Do them in this order — later steps need values from earlier ones.

---

## 1. Google OAuth credentials

**Do this first — sign-in cannot work without it, locally or in production.**
If you see `Error 401: invalid_client` / "The OAuth client was not found",
it means this step hasn't been done (or the ID was copied wrong).

1. Go to <https://console.cloud.google.com/> and create a project (name it
   anything, e.g. "Memoize").
2. **APIs & Services → OAuth consent screen**
   - User type: **External** → Create
   - App name: `Memoize`, and pick your email for both support and developer
     contact fields.
   - Scopes: leave the defaults. Memoize only needs `email`, `profile`,
     `openid` — these are "non-sensitive", so **no Google verification review
     is required**.
   - Save through to the end.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Memoize Web`
   - **Authorized JavaScript origins** — add both:
     ```
     http://localhost:5173
     https://your-app.vercel.app
     ```
   - **Authorized redirect URIs** — add the same two:
     ```
     http://localhost:5173
     https://your-app.vercel.app
     ```
   - Create. Copy the **Client ID** (ends in `.apps.googleusercontent.com`).

   > No trailing slashes. `http://localhost:5173/` will be rejected.
   > You can come back and add the Vercel URL after step 4 — just remember to.

4. Put that same Client ID in **both** env files:

   `server/.env`
   ```
   GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
   ```

   `client/.env`
   ```
   VITE_GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
   ```

5. **Restart both dev servers.** Vite only reads `.env` at startup, so a running
   dev server will keep using the old value.

### Letting your friends in

While the consent screen is in **Testing** mode, only accounts you list can sign
in — everyone else gets "Access blocked".

- **OAuth consent screen → Test users → Add users** lets you add up to 100
  accounts individually. Good for a handful of friends.
- **OAuth consent screen → Publish app** opens it to anyone with a Google
  account. Because Memoize only uses basic profile scopes, publishing does *not*
  require going through Google's verification review.

---

## 2. MongoDB Atlas (database)

1. Create a free account at <https://www.mongodb.com/cloud/atlas>.
2. Create a free **M0** cluster (pick a region near you).
3. **Database Access → Add New Database User** — username + password auth. Save
   the password somewhere; you need it in the connection string.
4. **Network Access → Add IP Address → Allow access from anywhere**
   (`0.0.0.0/0`). Render's outbound IPs aren't static on the free tier, so
   restricting by IP won't work there.
5. **Database → Connect → Drivers** and copy the connection string. It looks
   like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<password>` with the real password, and insert the database name
   `memoize` before the `?`:
   ```
   mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/memoize?retryWrites=true&w=majority
   ```
   Without that database name, Mongo writes to `test` instead.

---

## 3. Render (API)

1. Push this repo to GitHub.
2. At <https://render.com> → **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free
4. **Environment → add these variables:**

   | Key | Value |
   |---|---|
   | `MONGODB_URI` | the Atlas string from step 2 |
   | `JWT_SECRET` | a long random string (see below) |
   | `GOOGLE_CLIENT_ID` | from step 1 |
   | `FRONTEND_URL` | `https://your-app.vercel.app` (fill in after step 4) |
   | `GEMINI_API_KEY` | *optional* — enables AI-graded recall ([free key](https://aistudio.google.com/apikey)) |

   The server refuses to boot without `MONGODB_URI`, `JWT_SECRET` or
   `GOOGLE_CLIENT_ID`. `FRONTEND_URL` isn't enforced — it falls back to
   `http://localhost:5173` — but leave it unset in production and CORS will
   reject every request from your real frontend, which looks like the API
   being down rather than a misconfiguration.

   `GEMINI_API_KEY` is deliberately **not** required. Leave it out and the
   recall grader reports itself disabled, the button never renders, and
   everything else works — a deploy can't break because you forgot it. Set it
   here and nowhere else: a key in your local `.env` never reaches the
   deployed server, which is the usual reason the feature works on localhost
   and looks broken in production. (`ANTHROPIC_API_KEY` is the paid
   alternative; set `RECALL_PROVIDER` only if you set both.)

   Generate a secret locally with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   > Do **not** reuse the `JWT_SECRET` from your local `.env`. Anyone holding it
   > can mint tokens for any account.

5. Deploy, then confirm it's alive:
   ```bash
   curl https://your-api.onrender.com/api/health   # → {"ok":true}
   ```

> **Free tier caveat:** Render spins the service down after ~15 minutes idle, so
> the first request after a quiet spell takes ~30s. The app handles this
> gracefully — a banner appears explaining the wait with a live counter, instead
> of the UI just hanging — but the delay itself is inherent to the free tier.
> Paying for the lowest paid instance is the only real fix.
>
> Resist the temptation to "solve" this with a cron job pinging `/api/health`
> every few minutes. Free instance-hours are capped per month, and keeping the
> service awake around the clock burns through them — you'd trade a slow first
> request for the service dying partway through the month.

---

## 4. Vercel (frontend)

1. At <https://vercel.com> → **Add New → Project** → import the same repo.
2. Settings:
   - **Root Directory:** `client`
   - Framework preset: **Vite** (auto-detected)
3. **Environment Variables:**

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://your-api.onrender.com/api` |
   | `VITE_GOOGLE_CLIENT_ID` | from step 1 |

   > `VITE_API_URL` must include the trailing `/api`.

4. Deploy. Note the assigned URL (e.g. `https://memoize-xyz.vercel.app`).

`client/vercel.json` already rewrites all routes to `index.html`, so deep links
like `/problems/abc123` won't 404 on refresh.

---

## 5. Close the loop

Three values reference each other, so go back and fill in the real URLs:

1. **Render → `FRONTEND_URL`** = your Vercel URL. CORS rejects every other
   origin, so sign-in fails until this matches exactly.
2. **Google Console → Authorized JavaScript origins + redirect URIs** = add your
   Vercel URL.
3. Redeploy the Render service so it picks up the new `FRONTEND_URL`.

Then open your Vercel URL and sign in.

---

## 6. Backups

Atlas M0 has **no automated backups**. Once friends are relying on this, that's
the biggest real risk — not storage limits. `server/scripts/backup.sh` writes a
compressed archive of the whole database:

```bash
cd server
./scripts/backup.sh                          # → server/backups/memoize-<timestamp>.gz
BACKUP_DIR=~/Dropbox/memoize ./scripts/backup.sh
RETENTION_DAYS=30 ./scripts/backup.sh        # default keeps 14 days
```

It reads `MONGODB_URI` from the environment or `server/.env`, so pointing it at
Atlas needs no changes — just make sure `.env` holds the Atlas string, or export
it inline:

```bash
MONGODB_URI="mongodb+srv://..." ./scripts/backup.sh
```

Requires `mongodump` (`brew install mongodb-database-tools`).

**Restore** — this is the part worth testing *before* you need it:

```bash
# Into a scratch database first, to confirm the archive is good
mongorestore --uri="mongodb://127.0.0.1:27017" --gzip \
  --archive=server/backups/memoize-20260809-004102.gz \
  --nsFrom='memoize.*' --nsTo='memoize_check.*' --drop

# Over the real database, once you trust it
mongorestore --uri="$MONGODB_URI" --gzip --archive=<file>.gz --drop
```

`--drop` replaces existing collections, so restoring an old archive discards
anything newer. Take a fresh backup before restoring an old one.

Schedule it weekly with cron (`crontab -e`) — note cron gets a bare environment,
so use absolute paths:

```
0 3 * * 0 cd /Users/you/Desktop/memoize/server && ./scripts/backup.sh >> /tmp/memoize-backup.log 2>&1
```

Backups only run when your machine is on. If that's a problem, a cheap scheduled
job on the API host is the more reliable home for this.

`backups/` is gitignored — the archives contain every user's data, so don't
commit them.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Error 401: invalid_client` | Client ID is a placeholder, wrong, or the dev server wasn't restarted after editing `.env`. |
| "Access blocked" for a friend | They're not in **Test users**, and the app isn't published. |
| Sign-in works, then every request 401s | `GOOGLE_CLIENT_ID` differs between client and server, or `JWT_SECRET` changed after tokens were issued (invalidates existing sessions). |
| CORS error in console | `FRONTEND_URL` on Render doesn't exactly match the site's origin — check for a trailing slash or `http` vs `https`. |
| Frontend loads, API calls fail | `VITE_API_URL` missing the trailing `/api`, or the Render service is asleep — retry once. |
| Deep link 404s on refresh | `vercel.json` missing, or Root Directory isn't set to `client`. |
| Server exits immediately on boot | A required env var is missing — the logs name it. This is intentional. |
| First load shows "Waking the server" | Expected on Render's free tier after idle. Resolves in ~30s. |
| `backup.sh: mongodump not found` | `brew install mongodb-database-tools` |

## Free-tier limits worth knowing

These are the ones that actually bite, roughly in the order you'll hit them:

| Limit | Reality |
|---|---|
| Render sleeps when idle | ~30s cold start. Handled with a banner, not eliminated. |
| Atlas M0 has no backups | Solved by `scripts/backup.sh` above — but only if you run it. |
| Atlas pauses idle clusters | After a long quiet period. Resumable, nothing deleted. |
| Atlas M0 storage | 512 MB. A reviewed problem costs ~2 KB, so this is a non-issue — tens of thousands of problems before it matters. |
| Atlas M0 shared CPU | Fine at friend-group scale. |

Verify current numbers against the providers' pricing pages before relying on
them; free-tier terms change over time.

## Security notes

Already handled in the code:

- `helmet` for security headers; CORS restricted to `FRONTEND_URL` only.
- Rate limiting at 300 requests / 15 min per IP.
- Every query scoped by `userId`, so accounts can't read each other's data.
- Google ID tokens verified server-side against Google's public keys — a forged
  token from a client won't pass.
- The server refuses to boot if `JWT_SECRET`, `GOOGLE_CLIENT_ID`, or
  `MONGODB_URI` is absent.

Worth knowing:

- `.env` is gitignored — keep it that way. If a secret ever lands in a commit,
  rotate it rather than just deleting the line.
- Sessions are 30-day JWTs in `localStorage`. There's no server-side revocation;
  rotating `JWT_SECRET` signs everyone out at once.
