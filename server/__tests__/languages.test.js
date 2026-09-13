const fs = require('node:fs');
const path = require('node:path');
const { LANGUAGES, DEFAULT_LANGUAGE } = require('../utils/languages');

// The Problem schema's enum comes from the server list, while the highlighter
// and the language picker come from the client one. If they drift, a language
// you can pick in the UI is rejected on save — so pin them together here.
const CLIENT_HIGHLIGHT = path.join(__dirname, '..', '..', 'client', 'src', 'utils', 'highlight.js');

function clientLanguageIds() {
  const source = fs.readFileSync(CLIENT_HIGHLIGHT, 'utf8');
  const block = source.slice(
    source.indexOf('export const LANGUAGES'),
    source.indexOf('const LANGUAGE_IDS')
  );
  return [...block.matchAll(/\bid:\s*'([^']+)'/g)].map((m) => m[1]);
}

describe('supported solution languages', () => {
  test('the default is one of them', () => {
    expect(LANGUAGES).toContain(DEFAULT_LANGUAGE);
  });

  test('ids are unique', () => {
    expect(new Set(LANGUAGES).size).toBe(LANGUAGES.length);
  });

  test('plaintext is offered as an escape hatch', () => {
    expect(LANGUAGES).toContain('plaintext');
  });

  test('the client picker offers exactly the ids the schema accepts', () => {
    expect(clientLanguageIds().sort()).toEqual([...LANGUAGES].sort());
  });

  test('the client defaults to the same language as the server', () => {
    const source = fs.readFileSync(CLIENT_HIGHLIGHT, 'utf8');
    const match = source.match(/export const DEFAULT_LANGUAGE = '([^']+)'/);
    expect(match?.[1]).toBe(DEFAULT_LANGUAGE);
  });
});
