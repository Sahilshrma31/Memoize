import { useMemo, useState } from 'react';
import useHighlighter from '../hooks/useHighlighter';
import { highlightToHtml, languageLabel } from '../utils/highlight';

// Past this, a solution is clipped with a fade and a "show all" button —
// a 200-line DP solution shouldn't push the review history off the page.
const COLLAPSED_LINES = 22;
const LINE_HEIGHT_PX = 20.8; // 13px * 1.6, matching .code-text
const PADDING_Y_PX = 28;

/**
 * Read-only view of a saved solution: Dark+ colours, a line-number gutter that
 * stays put while long lines scroll under it, and copy-to-clipboard.
 */
export default function CodeBlock({ code = '', language, collapsible = true }) {
  const ready = useHighlighter();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Trailing blank lines are dropped so the gutter can't run one number past
  // the last line of code.
  const trimmed = useMemo(() => code.replace(/\n+$/, ''), [code]);
  const lines = useMemo(() => trimmed.split('\n'), [trimmed]);
  const html = useMemo(
    () => (ready ? highlightToHtml(trimmed, language) : null),
    [ready, trimmed, language]
  );

  if (!code.trim()) return null;

  const clipped = collapsible && !expanded && lines.length > COLLAPSED_LINES;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure origin or denied permission) — the code is
      // on screen and selectable, so there's nothing useful to say here.
    }
  };

  return (
    <div className="code-surface border border-midnight-border">
      <div className="flex items-center justify-between border-b border-black/40 px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-widest text-midnight-muted">
          {languageLabel(language)} · {lines.length} {lines.length === 1 ? 'line' : 'lines'}
        </span>
        <button
          type="button"
          onClick={copy}
          className="text-[10px] uppercase tracking-widest text-midnight-muted hover:text-accent-orange transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <div className="relative">
        <div
          className="overflow-x-auto"
          style={
            clipped
              ? { maxHeight: COLLAPSED_LINES * LINE_HEIGHT_PX + PADDING_Y_PX, overflowY: 'hidden' }
              : undefined
          }
        >
          <div className="flex w-max min-w-full">
            <div
              aria-hidden="true"
              className="code-text code-scroll sticky left-0 z-10 select-none text-right"
              style={{ background: '#1e1e1e', color: '#6e7681', paddingRight: '0.75rem' }}
            >
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre className="code-text code-scroll flex-1" style={{ paddingLeft: 0 }}>
              {html ? (
                <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <code className="hljs">{trimmed}</code>
              )}
            </pre>
          </div>
        </div>

        {clipped && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{ background: 'linear-gradient(to bottom, rgba(30,30,30,0), #1e1e1e)' }}
          />
        )}
      </div>

      {collapsible && lines.length > COLLAPSED_LINES && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full border-t border-black/40 py-1.5 text-[10px] uppercase tracking-widest text-midnight-muted hover:text-accent-orange transition-colors"
        >
          {expanded ? 'Collapse' : `Show all ${lines.length} lines`}
        </button>
      )}
    </div>
  );
}
