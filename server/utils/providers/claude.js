/**
 * Claude backend for the recall grader.
 *
 * Kept alongside Gemini so adding ANTHROPIC_API_KEY later is a config change
 * rather than a rewrite. If both keys are set this one wins, on the assumption
 * that a paid key was set deliberately; RECALL_PROVIDER overrides that.
 */
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5';

let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

async function complete({ system, prompt, schema }) {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    // A policy decline would otherwise just stop the request; this re-runs it
    // on a fallback model inside the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    thinking: { type: 'adaptive' },
    output_config: {
      // Runs inline in the review loop, so responsiveness beats exhaustive
      // reasoning. Raise it if the grades read as shallow.
      effort: 'medium',
      // Claude's strict schemas want the closed-world flag; Gemini's OpenAPI
      // subset doesn't accept it, which is why it's added here and not shared.
      format: { type: 'json_schema', schema: { ...schema, additionalProperties: false } },
    },
    messages: [{ role: 'user', content: prompt }],
  });

  // Always check this before reading content — a refused turn still returns 200.
  if (response.stop_reason === 'refusal') {
    const err = new Error('The grader declined to score this attempt — rate it yourself.');
    err.status = 422;
    throw err;
  }

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

module.exports = {
  id: 'claude',
  label: `Claude (${MODEL})`,
  envVar: 'ANTHROPIC_API_KEY',
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY),
  complete,
};
