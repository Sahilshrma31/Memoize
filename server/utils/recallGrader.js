/**
 * AI-graded free recall.
 *
 * The review flow already asks you to type the approach from memory before
 * revealing the intuition, but that text was thrown away. This grades it
 * against your own saved intuition and solution, which turns it into the one
 * thing SM-2 can't get on its own: an outside opinion on whether you actually
 * remembered, rather than your own generous self-assessment.
 *
 * The whole feature is optional. Without ANTHROPIC_API_KEY the route reports
 * itself disabled and the UI hides it — Memoize keeps working exactly as it
 * did, with manual self-rating.
 *
 * Everything except the network call is pure and unit-tested; the prompt, the
 * rating mapping and the response normalisation are the parts that decide
 * whether a grade is trustworthy, so they aren't buried inside the API call.
 *
 * Which model answers is a config choice, not a code one: the provider modules
 * in ./providers each turn (system, prompt, schema) into a JSON string, and
 * everything above that line is shared. Set GEMINI_API_KEY (free tier) or
 * ANTHROPIC_API_KEY; RECALL_PROVIDER picks when both are present.
 */

const claude = require('./providers/claude');
const gemini = require('./providers/gemini');

// Order is the fallback preference when RECALL_PROVIDER isn't set: a paid key
// present in the environment was almost certainly put there on purpose.
const PROVIDERS = [claude, gemini];

// Bounds on what gets sent, so one enormous paste can't run up a bill.
const MAX_ATTEMPT_CHARS = 4000;
const MAX_CODE_CHARS = 8000;

const SYSTEM_PROMPT = `You grade a competitive-programming learner's from-memory recall of a problem they have solved before.

You get the problem title, the learner's own saved notes on the approach (the reference intuition), optionally their accepted solution, and what they just recalled from memory (the attempt).

Score 0-100 for how completely the attempt reproduces the approach, judged only against the reference:
- 90-100: names the key insight and the mechanism that makes it work; nothing important missing
- 70-89: key insight is there, but a supporting detail is missing or vague
- 40-69: right family of idea, but the decisive step is missing or wrong
- 10-39: only vague or generic recall ("use DP", "two pointers") with no mechanism
- 0-9: blank, unrelated, or restates the problem without any approach

Rules:
- Judge meaning, not wording, length, grammar or spelling. A terse correct answer scores high.
- A genuinely correct approach that differs from the reference scores high. Say so in the verdict.
- Restating the problem is not recall. Score it low.
- Naming a technique without the mechanism that makes it work is not recall.
- Every entry in matched and missed must be specific to this problem, never generic study advice. At most 12 words each.
- verdict is one sentence addressed to the learner, at most 20 words.
- If the reference is thin, grade against what it does say. Never invent requirements it doesn't state.`;

const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    verdict: { type: 'string' },
    matched: { type: 'array', items: { type: 'string' } },
    missed: { type: 'array', items: { type: 'string' } },
  },
  required: ['score', 'verdict', 'matched', 'missed'],
};

/**
 * The provider that will answer, or null when none is configured.
 * An explicit RECALL_PROVIDER that has no key resolves to null rather than
 * silently falling through to the other one — a typo should be visible.
 */
function resolveProvider() {
  const explicit = process.env.RECALL_PROVIDER?.trim().toLowerCase();
  if (explicit) {
    const chosen = PROVIDERS.find((p) => p.id === explicit);
    return chosen?.isConfigured() ? chosen : null;
  }
  return PROVIDERS.find((p) => p.isConfigured()) || null;
}

/** The feature is off unless a key is present — never a hard startup requirement. */
function isConfigured() {
  return resolveProvider() !== null;
}

function clip(text, max) {
  const value = (text || '').trim();
  return value.length > max ? `${value.slice(0, max)}\n… (truncated)` : value;
}

function buildUserPrompt({ title, intuition, code, language, attempt }) {
  const sections = [`# Problem\n${title || 'Untitled'}`];

  if (intuition?.trim()) {
    sections.push(`# Reference intuition (the learner's own notes)\n${intuition.trim()}`);
  }
  if (code?.trim()) {
    sections.push(
      `# Reference solution (${language || 'unknown'})\n\`\`\`\n${clip(code, MAX_CODE_CHARS)}\n\`\`\``
    );
  }

  sections.push(`# Attempt (recalled from memory just now)\n${clip(attempt, MAX_ATTEMPT_CHARS)}`);
  return sections.join('\n\n');
}

/**
 * The model scores; the rating is derived here rather than asked for, so the
 * mapping into SM-2 stays consistent and testable instead of drifting with the
 * model's read of what "hard" means. 65 is the pass mark because that is where
 * a recall stops being a partial one — below it the decisive step was missing.
 */
function suggestedRatingFor(score) {
  if (score >= 88) return 'easy';
  if (score >= 65) return 'good';
  if (score >= 35) return 'hard';
  return 'blackout';
}

function toShortList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim())
    .slice(0, 3);
}

/** Never trust the shape blindly — clamp it into what the UI can render. */
function normalizeGrade(raw) {
  const parsed = Number.parseInt(raw?.score, 10);
  const score = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;

  return {
    score,
    verdict: typeof raw?.verdict === 'string' ? raw.verdict.trim() : '',
    matched: toShortList(raw?.matched),
    missed: toShortList(raw?.missed),
    suggestedRating: suggestedRatingFor(score),
  };
}

function failure(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function gradeRecall({ problem, attempt }) {
  const provider = resolveProvider();
  if (!provider) throw failure('Recall grading is not configured on this server.', 503);

  const prompt = buildUserPrompt({
    title: problem.title,
    intuition: problem.intuition,
    code: problem.code,
    language: problem.language,
    attempt,
  });

  let raw;
  try {
    raw = await provider.complete({ system: SYSTEM_PROMPT, prompt, schema: GRADE_SCHEMA });
  } catch (err) {
    // A refusal already carries its own status; anything else is the upstream
    // being unreachable or unhappy, which is a 502 from our side.
    if (err.status) throw err;
    throw failure(`${provider.label} could not grade that: ${err.message}`, 502);
  }

  try {
    return normalizeGrade(JSON.parse(raw));
  } catch {
    throw failure('The grader returned something unreadable — rate it yourself.', 502);
  }
}

module.exports = {
  gradeRecall,
  isConfigured,
  resolveProvider,
  buildUserPrompt,
  normalizeGrade,
  suggestedRatingFor,
  MAX_ATTEMPT_CHARS,
  GRADE_SCHEMA,
};
