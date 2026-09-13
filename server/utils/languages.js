/**
 * Languages a solution can be stored in.
 *
 * Kept server-side as the single source of truth for the Problem schema's
 * enum; the client mirrors this list with display labels in
 * client/src/utils/highlight.js. Anything not on this list is rejected at
 * write time rather than being stored and silently failing to highlight.
 */
const LANGUAGES = [
  'cpp',
  'c',
  'python',
  'java',
  'javascript',
  'typescript',
  'go',
  'rust',
  'kotlin',
  'csharp',
  'ruby',
  'swift',
  'sql',
  'plaintext',
];

const DEFAULT_LANGUAGE = 'cpp';

module.exports = { LANGUAGES, DEFAULT_LANGUAGE };
