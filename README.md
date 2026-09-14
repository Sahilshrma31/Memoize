# Memoize

A spaced repetition system for competitive programming problems. Track problems
you've solved, then let the SM-2 algorithm (the same scheduler Anki uses) decide
when you should re-attempt each one — spacing reviews out further every time you
recall it well, and resetting the interval when you blank on it.

MERN stack: Express + MongoDB on the backend, React (Vite) + Tailwind on the
frontend. Multi-user, with Google Sign-In — each account's queue is private to
that user.

To put this online for other people, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## Project layout

```
/server
  /models      User, Problem, ReviewCard, ReviewLog (Mongoose schemas)
  /routes      auth.js, problems.js, reviews.js, stats.js
  /middleware  requireAuth.js — JWT bearer-token gate
  /utils       sm2.js — pure scheduling function; jwt.js; languages.js
  /scripts     claimOrphanedData.js — one-time pre-auth data migration
  /__tests__   sm2.test.js — Jest unit tests
  server.js
/client
  /src/components  AddProblemForm, TodayQueue, ProblemCard, RatingButtons,
                    StatsHeader, RetentionChart, SpacedRepetitionChart,
                    AllProblemsTable, ProtectedRoute, …
  /src/pages       Landing, Login, Home, AllProblems, ProblemDetail
  /src/context     AuthContext, ToastContext
  /src/api         axios client (attaches the bearer token)
```

## Setup

### Prerequisites

- Node.js 18+
- A running MongoDB instance (local `mongod` or a hosted cluster)
- A Google OAuth Client ID — see [DEPLOYMENT.md](DEPLOYMENT.md#1-google-oauth-credentials).
  Sign-in will not work until this is set in both `.env` files.

### Backend

```bash
cd server
npm install
cp .env.example .env   # fill in the values below
npm run dev             # starts on http://localhost:5050
```

`server/.env`:

```
MONGODB_URI=mongodb://127.0.0.1:27017/memoize
PORT=5050
FRONTEND_URL=http://localhost:5173
JWT_SECRET=<a long random string>
GOOGLE_CLIENT_ID=<your-id>.apps.googleusercontent.com
```

Generate a `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server refuses to start if `JWT_SECRET`, `GOOGLE_CLIENT_ID`, or
`MONGODB_URI` is missing — that's deliberate, so a misconfigured deploy fails
loudly instead of running without auth.

Run the test suite:

```bash
npm test
```

### Frontend

```bash
cd client
npm install
cp .env.example .env      # set VITE_GOOGLE_CLIENT_ID
npm run dev               # starts on http://localhost:5173
```

`client/.env`:

```
VITE_GOOGLE_CLIENT_ID=<same id as the server's GOOGLE_CLIENT_ID>
# VITE_API_URL is only needed in production; locally Vite proxies /api
```

The Vite dev server proxies `/api/*` requests to `http://localhost:5050`
(see `client/vite.config.js`), so just open http://localhost:5173 once both
servers are running.

## Accounts and data ownership

Every `Problem`, `ReviewCard`, and `ReviewLog` carries a `userId`, and every API
query is filtered by the authenticated user — so two people using the same
deployment never see each other's problems.

Auth flow: the browser gets a Google ID token, posts it to `/api/auth/google`,
and the server verifies it with Google, upserts a `User`, and returns a 30-day
JWT. The client stores that token and sends it as `Authorization: Bearer <token>`
on every request; a 401 anywhere clears the session and bounces you to `/login`.

### Migrating data created before accounts existed

If you ran Memoize before it had auth, those records have no `userId` and are
invisible to the app. Sign in with Google once, then claim them:

```bash
cd server
node scripts/claimOrphanedData.js you@gmail.com --dry-run   # preview
node scripts/claimOrphanedData.js you@gmail.com             # apply
```

## Solutions

Each problem stores the code you solved it with, alongside the one-line
`intuition`. Two fields on `Problem` back it: `code` (the source, verbatim) and
`language` (one of the ids in `server/utils/languages.js`, which the schema
enforces as an enum).

It's rendered in VS Code's **Default Dark+** palette — control keywords pink,
declarations and types blue, strings orange, comments green, methods yellow —
so a solution reads the way it did in the editor you wrote it in.
`client/src/utils/highlight.js` loads highlight.js and its grammars through a
dynamic `import()`, so none of it lands in the main bundle; until it resolves,
the code renders as plain text rather than not at all.

highlight.js tags every reserved word as `hljs-keyword`, but Dark+ splits them
in two, so declaration keywords (`class`, `public`, `int`) are re-tagged
`hljs-decl` after highlighting and pulled back to blue. Without that, every
`public static void` comes out the wrong colour.

Where it shows up:

- **Add a problem** — a small editor with live highlighting. Tab indents four
  spaces, Shift+Tab dedents, Enter keeps the current indentation, Escape steps
  out of the field. Pasting into an empty editor guesses the language.
- **Review queue** — kept behind a *Show my solution* click. Reading it before
  you've re-solved the problem turns a review into a re-read, so it is never
  revealed by default, and never shown at all during a daily challenge.
- **Problem detail** — shown with a line-number gutter and copy button, folded
  at 22 lines.

The client's language list mirrors the server's; `__tests__/languages.test.js`
fails if the two drift, since a language you can pick but can't save is the
failure mode that would otherwise slip through.

## AI-graded recall (optional)

Spaced repetition is only as good as the rating you give yourself, and people
grade themselves generously — you half-remember an approach, click **Good**,
and the scheduler pushes the problem three weeks out.

Memoize already asks you to type the approach from memory before revealing the
intuition. That text used to be discarded. With an API key set, you can hand it
to Claude instead: it's compared against *your own* saved intuition and
solution, and comes back with a 0-100 recall score, what you got, what you
missed, and a suggested rating — marked with a dot on the rating buttons.

The score comes from the model; the mapping into an SM-2 rating is done in
`server/utils/recallGrader.js`, not asked for, so it stays consistent instead
of drifting with the model's read of what "hard" means:

| Score  | Rating     |
|--------|------------|
| 88-100 | `easy`     |
| 65-87  | `good`     |
| 35-64  | `hard`     |
| 0-34   | `blackout` |

**It is entirely optional, and free to run.** Set one key in `server/.env`:

| Provider | Env var | Cost | Measured |
|----------|---------|------|----------|
| Gemini (`gemini-3.8-flash`) | `GEMINI_API_KEY` — [get one](https://aistudio.google.com/apikey) | Free tier, no billing account | ~10s per check, 5 requests/min |
| Claude (`claude-opus-5`) | `ANTHROPIC_API_KEY` | Paid, ~1¢ per check | — |

Set both and Claude wins, on the assumption a paid key was deliberate;
`RECALL_PROVIDER=gemini` overrides that. Set neither and
`GET /api/recall/status` reports `enabled: false`, the button never renders,
and Memoize behaves exactly as it did. The server does not require any of them
to boot — only `JWT_SECRET`, `GOOGLE_CLIENT_ID` and `MONGODB_URI` are
mandatory, so a deploy can't break because you forgot one.

> `server/.env` is gitignored and never ships. For a deployed instance the key
> has to be set in the host's own environment settings as well, or the live
> site will keep reporting the feature as off.

Implementation notes:

- `server/utils/providers/*.js` each turn `(system, prompt, schema)` into a
  JSON string; everything above that line — the rubric, the schema, the score
  mapping, the route guards, the UI — is shared. Switching provider is config,
  not a rewrite.
- The response is constrained to a JSON schema by both providers, so the result
  is typed data rather than prose to be regex'd out. The schema is kept inside
  the OpenAPI subset Gemini accepts; the Claude provider adds
  `additionalProperties` itself.
- Server-side only. The key never reaches the browser.
- Capped at 40 checks per account per 15 minutes, on top of the global limiter,
  and the attempt and solution are truncated before they're sent.
- Every failure path — no key, a refusal, an unreadable response, a rate limit —
  falls back to rating yourself by hand. The feature can never block a review.
- Gemini runs at `thinking_level: low`. This is a bounded comparison against a
  short reference, and the default (`medium`) measured ~24s against ~10s — too
  slow to sit inside a review loop. The button shows a ticking counter, because
  ten seconds of a static "Grading…" reads as a hung button.
- The free tier allows 5 requests/minute. Going over returns a plain
  "try again in ~Ns" rather than Google's wall of billing text, and the server
  additionally caps each account at 40 checks per 15 minutes.
- A misspelled `RECALL_PROVIDER`, or one naming a provider whose key is absent,
  resolves to "off" rather than silently falling through to the other one.

| Method | Route                     | Description                                  |
|--------|---------------------------|----------------------------------------------|
| GET    | `/api/recall/status`      | Whether grading is configured on this server |
| POST   | `/api/recall/:problemId`  | Grade `{ attempt }` against the saved answer |

## How the scheduling works (SM-2)

Every `Problem` has a 1:1 `ReviewCard` that tracks its scheduling state:

- **`easeFactor`** — how "easy" the problem is for you (starts at 2.5, floor of 1.3).
  Higher means the interval grows faster between reviews.
- **`intervalDays`** — how many days until the next review.
- **`repetitions`** — consecutive successful reviews since the last blackout.
- **`nextReviewAt`** — computed as `now + intervalDays`.

Each time you review a problem, you rate your recall on a 4-point scale, and
`server/utils/sm2.js` recomputes the card:

| Rating      | Effect                                                                 |
|-------------|-------------------------------------------------------------------------|
| **Blackout** | `repetitions → 0`, `intervalDays → 1`, `easeFactor -= 0.2` (min 1.3)   |
| **Hard**     | `repetitions += 1`, `easeFactor -= 0.15` (min 1.3), then interval rule |
| **Good**     | `repetitions += 1`, `easeFactor` unchanged, then interval rule         |
| **Easy**     | `repetitions += 1`, `easeFactor += 0.15`, then interval rule           |

**Interval rule** (applied for hard/good/easy, using the *updated* ease factor):

- 1st repetition → `intervalDays = 1`
- 2nd repetition → `intervalDays = 6`
- 3rd+ repetition → `intervalDays = round(intervalDays * easeFactor)`

A card's **state** reflects how well-retained the problem is:

- `learning` — fewer than 2 successful repetitions
- `review` — actively being spaced out
- `mastered` — `repetitions >= 5` and `intervalDays >= 180` (i.e. you're
  reliably recalling it roughly six months apart)

Every review is also logged to `ReviewLog` (rating + time taken), which powers
the review history and retention curve on a problem's detail page.

### Retention curve

The detail page plots an exponential forgetting curve between a card's last
review and its next scheduled one:

```
R(t) = e^(-t / τ),   τ = intervalDays / ln(1/0.8)
```

`τ` is chosen so that `R(intervalDays) = 0.8` — i.e. the interval SM-2 picked
is exactly how long it takes your recall probability to decay to the 80%
threshold, which is the point re-review is scheduled.

## API

| Method | Route                    | Description                                              |
|--------|---------------------------|------------------------------------------------------------|
| POST   | `/api/problems`           | Create a problem + its ReviewCard (due immediately)        |
| GET    | `/api/problems`           | List problems, filter by `?tag=` / `?company=`              |
| GET    | `/api/problems/:id`       | Problem + its ReviewCard + ReviewLog history                |
| POST   | `/api/reviews/:cardId`    | Submit `{ rating, timeTakenSec }`, runs SM-2, logs review    |
| GET    | `/api/reviews/today`      | Cards due now, populated with Problem                       |
| GET    | `/api/stats`               | Counts by state, total problems, due-today count, streak     |
