/**
 * Route-level tests for the recall grader.
 *
 * The grader itself is mocked — what matters here is everything guarding it:
 * that the feature reports itself off without a key, that it refuses to spend
 * a request on an empty attempt or a problem with no reference to grade
 * against, and that one user can't grade another's problem.
 */
jest.mock('../middleware/requireAuth', () => (req, res, next) => {
  req.userId = 'user-1';
  next();
});
jest.mock('../models/Problem', () => ({ findOne: jest.fn() }));
jest.mock('../utils/recallGrader', () => ({
  ...jest.requireActual('../utils/recallGrader'),
  gradeRecall: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const Problem = require('../models/Problem');
const { gradeRecall } = require('../utils/recallGrader');

const app = express();
app.use(express.json());
app.use('/api/recall', require('../routes/recall'));

const SOLVED = {
  _id: 'p1',
  title: 'Two Sum',
  intuition: 'one-pass hash map of complements',
  code: '',
  language: 'cpp',
};

// Every provider key is cleared between tests, so a real key exported in the
// developer's shell can't quietly flip a result.
const KEYS = ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'RECALL_PROVIDER'];
const originalEnv = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

function withKey() {
  process.env.GEMINI_API_KEY = 'gemini-test';
}
function withoutKey() {
  KEYS.forEach((k) => delete process.env[k]);
}

beforeEach(withoutKey);

afterEach(() => {
  jest.clearAllMocks();
  for (const k of KEYS) {
    if (originalEnv[k] === undefined) delete process.env[k];
    else process.env[k] = originalEnv[k];
  }
});

describe('GET /api/recall/status', () => {
  test('reports disabled when no key is configured', async () => {
    withoutKey();
    const res = await request(app).get('/api/recall/status');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enabled: false, provider: null });
  });

  test('reports enabled, and which provider, once a key is configured', async () => {
    withKey();
    const res = await request(app).get('/api/recall/status');
    expect(res.body).toEqual({ enabled: true, provider: 'gemini' });
  });
});

describe('POST /api/recall/:problemId', () => {
  test('503s without a key, and never calls the grader', async () => {
    withoutKey();
    const res = await request(app).post('/api/recall/p1').send({ attempt: 'hash map' });
    expect(res.status).toBe(503);
    expect(res.body.disabled).toBe(true);
    expect(gradeRecall).not.toHaveBeenCalled();
  });

  test('rejects an empty attempt before spending a request', async () => {
    withKey();
    const res = await request(app).post('/api/recall/p1').send({ attempt: '   ' });
    expect(res.status).toBe(400);
    expect(gradeRecall).not.toHaveBeenCalled();
  });

  test('404s a problem that is not the caller’s', async () => {
    withKey();
    Problem.findOne.mockResolvedValue(null);
    const res = await request(app).post('/api/recall/p1').send({ attempt: 'hash map' });
    expect(res.status).toBe(404);
    // The lookup must be scoped to the signed-in user, not just the id.
    expect(Problem.findOne).toHaveBeenCalledWith({ _id: 'p1', userId: 'user-1' });
    expect(gradeRecall).not.toHaveBeenCalled();
  });

  test('refuses when there is no reference to grade against', async () => {
    withKey();
    Problem.findOne.mockResolvedValue({ ...SOLVED, intuition: '', code: '' });
    const res = await request(app).post('/api/recall/p1').send({ attempt: 'hash map' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/intuition or your solution/i);
    expect(gradeRecall).not.toHaveBeenCalled();
  });

  test('grades an attempt against a saved intuition', async () => {
    withKey();
    Problem.findOne.mockResolvedValue(SOLVED);
    gradeRecall.mockResolvedValue({
      score: 82,
      verdict: 'Close.',
      matched: ['hash map'],
      missed: ['one pass'],
      suggestedRating: 'good',
    });

    const res = await request(app).post('/api/recall/p1').send({ attempt: 'map of seen values' });
    expect(res.status).toBe(200);
    expect(res.body.suggestedRating).toBe('good');
    expect(gradeRecall).toHaveBeenCalledWith({ problem: SOLVED, attempt: 'map of seen values' });
  });

  test('surfaces a grader failure as its own status, not a 500', async () => {
    withKey();
    Problem.findOne.mockResolvedValue(SOLVED);
    const err = new Error('The grader declined to score this attempt — rate it yourself.');
    err.status = 422;
    gradeRecall.mockRejectedValue(err);

    const res = await request(app).post('/api/recall/p1').send({ attempt: 'x' });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/declined/);
  });
});
