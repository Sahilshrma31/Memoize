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

Each problem stores the code you solved it with alongside its one-line
`intuition`, rendered in VS Code's Dark+ palette so it reads the way it did in
your editor. highlight.js is loaded on demand and never reaches the main
bundle. During a review the solution stays behind a *Show my solution* click —
reading it before you've re-solved the problem turns a review into a re-read —
and it's never shown in a daily challenge.

## AI-graded recall (optional)

Spaced repetition is only as good as the rating you give yourself, and people
grade themselves generously. Memoize asks you to type the approach from memory
before revealing it; with a key set, that attempt is graded against your own
saved intuition and solution, and comes back with a 0-100 score, what you got
and what you missed, and a suggested rating.

The model returns only the score. Turning it into an SM-2 rating happens in
`server/utils/recallGrader.js`, so scheduling can't drift with the model's idea
of what "hard" means:

| Score  | Rating     |
|--------|------------|
| 88-100 | `easy`     |
| 65-87  | `good`     |
| 35-64  | `hard`     |
| 0-34   | `blackout` |

To turn it on, set `GEMINI_API_KEY` (free — [get a key](https://aistudio.google.com/apikey))
or `ANTHROPIC_API_KEY` in `server/.env`. With neither, the feature switches
itself off and the server still boots. Every failure path — a rate limit, a
refusal, an unreadable response — falls back to rating by hand, so it can
never block a review. Deploying it is covered in [DEPLOYMENT.md](DEPLOYMENT.md).

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
| GET    | `/api/recall/status`       | Whether AI-graded recall is configured on this server        |
| POST   | `/api/recall/:problemId`   | Grade `{ attempt }` against the saved intuition and solution |
