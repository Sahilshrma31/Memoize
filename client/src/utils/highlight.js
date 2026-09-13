/**
 * Syntax highlighting for saved solutions, rendered in VS Code's Dark+ palette
 * (the token colours live in index.css).
 *
 * highlight.js and its grammars are pulled in with a dynamic import the first
 * time a code block mounts, so the ~100KB of grammars never reaches the main
 * bundle — the dashboard loads without it. Until it resolves, callers render
 * the code as plain text, so nothing is ever hidden waiting on the download.
 */

// Mirrors LANGUAGES in server/utils/languages.js — keep the ids in step.
export const LANGUAGES = [
  { id: 'cpp', label: 'C++', loader: () => import('highlight.js/lib/languages/cpp') },
  { id: 'python', label: 'Python', loader: () => import('highlight.js/lib/languages/python') },
  { id: 'java', label: 'Java', loader: () => import('highlight.js/lib/languages/java') },
  { id: 'c', label: 'C', loader: () => import('highlight.js/lib/languages/c') },
  {
    id: 'javascript',
    label: 'JavaScript',
    loader: () => import('highlight.js/lib/languages/javascript'),
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    loader: () => import('highlight.js/lib/languages/typescript'),
  },
  { id: 'go', label: 'Go', loader: () => import('highlight.js/lib/languages/go') },
  { id: 'rust', label: 'Rust', loader: () => import('highlight.js/lib/languages/rust') },
  { id: 'kotlin', label: 'Kotlin', loader: () => import('highlight.js/lib/languages/kotlin') },
  { id: 'csharp', label: 'C#', loader: () => import('highlight.js/lib/languages/csharp') },
  { id: 'ruby', label: 'Ruby', loader: () => import('highlight.js/lib/languages/ruby') },
  { id: 'swift', label: 'Swift', loader: () => import('highlight.js/lib/languages/swift') },
  { id: 'sql', label: 'SQL', loader: () => import('highlight.js/lib/languages/sql') },
  { id: 'plaintext', label: 'Plain text', loader: () => import('highlight.js/lib/languages/plaintext') },
];

const LANGUAGE_IDS = LANGUAGES.map((l) => l.id);
const LABELS = Object.fromEntries(LANGUAGES.map((l) => [l.id, l.label]));

export const DEFAULT_LANGUAGE = 'cpp';

export function languageLabel(id) {
  if (!id) return LABELS[DEFAULT_LANGUAGE];
  return LABELS[id] || id;
}

/**
 * Dark+ splits what highlight.js lumps together as `hljs-keyword`: control
 * flow (`if`, `return`, `while`) is pink, while declarations and types
 * (`class`, `public`, `int`) are blue. highlight.js has no such distinction,
 * so the pink ones are re-tagged here after the fact — without this, every
 * `public static void` in a Java solution comes out the wrong colour.
 */
const BLUE_KEYWORDS = new Set([
  'class', 'struct', 'enum', 'union', 'interface', 'namespace', 'template', 'typename',
  'public', 'private', 'protected', 'static', 'final', 'abstract', 'sealed', 'partial',
  'virtual', 'override', 'const', 'constexpr', 'consteval', 'inline', 'explicit', 'friend',
  'mutable', 'volatile', 'synchronized', 'transient', 'native', 'extern', 'register',
  'extends', 'implements', 'void', 'int', 'long', 'short', 'char', 'float', 'double',
  'bool', 'boolean', 'byte', 'string', 'unsigned', 'signed', 'auto', 'var', 'let',
  'def', 'func', 'fn', 'fun', 'package', 'new', 'this', 'self', 'super', 'using',
  'operator', 'typedef', 'decltype', 'sizeof', 'readonly', 'val', 'lateinit', 'suspend',
]);

const KEYWORD_SPAN = /<span class="hljs-keyword">([^<]+)<\/span>/g;

function recolorDeclarations(html) {
  return html.replace(KEYWORD_SPAN, (match, word) =>
    BLUE_KEYWORDS.has(word.trim())
      ? `<span class="hljs-keyword hljs-decl">${word}</span>`
      : match
  );
}

let hljs = null;
let loadPromise = null;

export function isHighlighterReady() {
  return hljs !== null;
}

export function loadHighlighter() {
  if (hljs) return Promise.resolve(hljs);
  if (!loadPromise) {
    loadPromise = Promise.all([
      import('highlight.js/lib/core'),
      ...LANGUAGES.map((l) => l.loader()),
    ])
      .then(([core, ...grammars]) => {
        const instance = core.default;
        LANGUAGES.forEach((lang, i) => instance.registerLanguage(lang.id, grammars[i].default));
        hljs = instance;
        return instance;
      })
      .catch((err) => {
        // Leave hljs null: every caller already falls back to plain text.
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}

/**
 * @returns {string|null} highlighted HTML, or null if the highlighter hasn't
 *   loaded yet — render the raw code as text in that case.
 */
export function highlightToHtml(code, language) {
  if (!hljs || !code) return null;
  const id = LANGUAGE_IDS.includes(language) ? language : 'plaintext';
  try {
    const { value } = hljs.highlight(code, { language: id, ignoreIllegals: true });
    return recolorDeclarations(value);
  } catch {
    return null;
  }
}

/**
 * Best guess at the language of a pasted solution, so the picker lands on the
 * right one without being asked. Returns null when it isn't confident.
 */
export function detectLanguage(code) {
  if (!hljs || !code || code.trim().length < 24) return null;
  try {
    const { language, relevance } = hljs.highlightAuto(
      code,
      LANGUAGE_IDS.filter((id) => id !== 'plaintext')
    );
    // Low relevance means it matched a handful of generic tokens; a wrong
    // auto-switch is more annoying than no switch at all.
    return language && relevance >= 8 ? language : null;
  } catch {
    return null;
  }
}
