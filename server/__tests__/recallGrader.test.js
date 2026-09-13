const {
  buildUserPrompt,
  normalizeGrade,
  suggestedRatingFor,
  isConfigured,
  resolveProvider,
} = require('../utils/recallGrader');

const KEYS = ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'RECALL_PROVIDER'];

describe('provider resolution', () => {
  const original = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

  beforeEach(() => KEYS.forEach((k) => delete process.env[k]));
  afterEach(() => {
    for (const k of KEYS) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  });

  test('off with no key at all, so the server still boots and the UI hides it', () => {
    expect(isConfigured()).toBe(false);
    expect(resolveProvider()).toBeNull();
  });

  test('a Gemini key alone selects Gemini', () => {
    process.env.GEMINI_API_KEY = 'test';
    expect(isConfigured()).toBe(true);
    expect(resolveProvider().id).toBe('gemini');
  });

  test('an Anthropic key alone selects Claude', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    expect(resolveProvider().id).toBe('claude');
  });

  test('with both keys the paid one wins by default', () => {
    process.env.GEMINI_API_KEY = 'test';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    expect(resolveProvider().id).toBe('claude');
  });

  test('RECALL_PROVIDER overrides that preference', () => {
    process.env.GEMINI_API_KEY = 'test';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    process.env.RECALL_PROVIDER = 'gemini';
    expect(resolveProvider().id).toBe('gemini');
  });

  test('a misspelled RECALL_PROVIDER is off, not a silent fallback', () => {
    process.env.GEMINI_API_KEY = 'test';
    process.env.RECALL_PROVIDER = 'gemeni';
    expect(resolveProvider()).toBeNull();
    expect(isConfigured()).toBe(false);
  });

  test('naming a provider whose key is missing is off, not a fallback', () => {
    process.env.GEMINI_API_KEY = 'test';
    process.env.RECALL_PROVIDER = 'claude';
    expect(resolveProvider()).toBeNull();
  });
});

describe('suggestedRatingFor', () => {
  test.each([
    [100, 'easy'],
    [88, 'easy'],
    [87, 'good'],
    [65, 'good'],
    [64, 'hard'],
    [35, 'hard'],
    [34, 'blackout'],
    [0, 'blackout'],
  ])('%i maps to %s', (score, rating) => {
    expect(suggestedRatingFor(score)).toBe(rating);
  });

  test('every rating it produces is one SM-2 accepts', () => {
    const valid = ['blackout', 'hard', 'good', 'easy'];
    for (let score = 0; score <= 100; score += 1) {
      expect(valid).toContain(suggestedRatingFor(score));
    }
  });
});

describe('buildUserPrompt', () => {
  const base = {
    title: 'Two Sum',
    intuition: 'Hash map of complements in one pass',
    code: 'int main() {}',
    language: 'cpp',
    attempt: 'store seen values in a map',
  };

  test('includes the reference and the attempt', () => {
    const prompt = buildUserPrompt(base);
    expect(prompt).toContain('Two Sum');
    expect(prompt).toContain('Hash map of complements in one pass');
    expect(prompt).toContain('store seen values in a map');
    expect(prompt).toContain('cpp');
  });

  test('omits sections that have no content rather than sending empty headings', () => {
    const prompt = buildUserPrompt({ ...base, code: '', intuition: '' });
    expect(prompt).not.toContain('Reference solution');
    expect(prompt).not.toContain('Reference intuition');
    expect(prompt).toContain('Attempt');
  });

  test('truncates a huge solution instead of sending it whole', () => {
    const prompt = buildUserPrompt({ ...base, code: 'x'.repeat(20000) });
    expect(prompt).toContain('truncated');
    expect(prompt.length).toBeLessThan(12000);
  });

  test('truncates a huge attempt', () => {
    const prompt = buildUserPrompt({ ...base, attempt: 'y'.repeat(20000) });
    expect(prompt).toContain('truncated');
  });
});

describe('normalizeGrade', () => {
  test('keeps a well-formed grade and derives the rating', () => {
    const grade = normalizeGrade({
      score: 92,
      verdict: 'Nailed it.',
      matched: ['one-pass hash map'],
      missed: [],
    });
    expect(grade).toEqual({
      score: 92,
      verdict: 'Nailed it.',
      matched: ['one-pass hash map'],
      missed: [],
      suggestedRating: 'easy',
    });
  });

  test('clamps a score outside 0-100', () => {
    expect(normalizeGrade({ score: 140 }).score).toBe(100);
    expect(normalizeGrade({ score: -20 }).score).toBe(0);
  });

  test('survives junk without throwing', () => {
    expect(normalizeGrade(null)).toEqual({
      score: 0,
      verdict: '',
      matched: [],
      missed: [],
      suggestedRating: 'blackout',
    });
    expect(normalizeGrade({ score: 'abc', matched: 'nope' }).matched).toEqual([]);
  });

  test('caps the lists at three and drops blank entries', () => {
    const grade = normalizeGrade({
      score: 50,
      missed: ['a', '  ', 'b', 'c', 'd'],
    });
    expect(grade.missed).toEqual(['a', 'b', 'c']);
  });
});
