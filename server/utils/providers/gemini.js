/**
 * Gemini backend for the recall grader.
 *
 * Chosen as the default because its free tier needs no billing account and,
 * unlike a local model, it works from a deployed server — the live site can
 * grade, not just a laptop.
 */
const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-3.8-flash';

let client = null;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/**
 * The raw quota error is a wall of text about billing plans. Grading is
 * optional, so the honest message is "wait a moment", not a link to pricing.
 */
function friendlyError(err) {
  const message = String(err?.message || '');
  const status = err?.status;

  if (status === 429) {
    const retry = message.match(/retry in ([\d.]+)s/i)?.[1];
    const wait = retry ? ` Try again in ~${Math.ceil(Number(retry))}s.` : ' Try again in a minute.';
    const friendly = new Error(`Gemini's free tier is rate-limited.${wait}`);
    friendly.status = 429;
    return friendly;
  }

  if (status === 401 || status === 403) {
    const friendly = new Error('Gemini rejected the API key — check GEMINI_API_KEY.');
    friendly.status = 502;
    return friendly;
  }

  return err;
}

async function complete({ system, prompt, schema }) {
  try {
    const interaction = await getClient().interactions.create({
      model: MODEL,
      input: prompt,
      system_instruction: system,
      response_format: { type: 'text', mime_type: 'application/json', schema },
      // This is a bounded comparison against a short reference, and it runs
      // inline in the review loop. "low" is the floor for this model (thinking
      // can't be switched off) and roughly halves the wait.
      generation_config: { thinking_level: 'low' },
    });

    return interaction.output_text;
  } catch (err) {
    throw friendlyError(err);
  }
}

module.exports = {
  id: 'gemini',
  label: `Gemini (${MODEL})`,
  envVar: 'GEMINI_API_KEY',
  isConfigured: () => Boolean(process.env.GEMINI_API_KEY),
  complete,
};
