import { useLayoutEffect, useMemo, useRef } from 'react';
import useHighlighter from '../hooks/useHighlighter';
import { detectLanguage, highlightToHtml } from '../utils/highlight';

const INDENT = '    '; // 4 spaces — what every competitive template uses
const LINE_HEIGHT_PX = 20.8; // 13px * 1.6, matching .code-text
const PADDING_Y_PX = 28;

/**
 * A small code editor: a transparent <textarea> layered over a highlighted
 * <pre> showing the same text.
 *
 * The <pre> is the one in normal flow, so it sets the height and the textarea
 * just stretches over it — that removes any need to measure and sync scroll
 * positions, which is where this technique usually goes wrong. Both share the
 * .code-text metrics so the invisible glyphs the caret walks across sit exactly
 * on the coloured ones underneath.
 */
export default function CodeEditor({
  value,
  onChange,
  language,
  onDetectLanguage,
  placeholder = '',
  minRows = 8,
  autoFocus = false,
}) {
  const ready = useHighlighter();
  const ref = useRef(null);

  const html = useMemo(
    () => (ready ? highlightToHtml(value, language) : null),
    [ready, value, language]
  );

  // Replace the text and restore the caret where the edit left it. The
  // position is applied after the re-render rather than on a timer, so the
  // caret can never be placed against the pre-edit text.
  const pendingCaret = useRef(null);

  useLayoutEffect(() => {
    if (pendingCaret.current === null) return;
    ref.current?.setSelectionRange(pendingCaret.current, pendingCaret.current);
    pendingCaret.current = null;
  });

  const applyEdit = (next, caret) => {
    pendingCaret.current = caret;
    onChange(next);
  };

  const handleKeyDown = (e) => {
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Dedent: drop up to one indent's worth of leading space on this line.
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const leading = value.slice(lineStart, start).match(/^ +/)?.[0].length ?? 0;
        const remove = Math.min(leading, INDENT.length);
        if (remove === 0) return;
        applyEdit(
          value.slice(0, lineStart) + value.slice(lineStart + remove),
          Math.max(lineStart, start - remove)
        );
      } else {
        applyEdit(value.slice(0, start) + INDENT + value.slice(end), start + INDENT.length);
      }
      return;
    }

    if (e.key === 'Enter') {
      // Carry the current line's indentation onto the next one.
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const indent = value.slice(lineStart, start).match(/^ +/)?.[0] ?? '';
      if (!indent) return;
      e.preventDefault();
      applyEdit(
        value.slice(0, start) + '\n' + indent + value.slice(end),
        start + 1 + indent.length
      );
      return;
    }

    // Tab is captured above, so Escape is the way back out to the rest of the
    // form for anyone navigating by keyboard.
    if (e.key === 'Escape') el.blur();
  };

  const handlePaste = (e) => {
    if (!onDetectLanguage) return;
    const pasted = e.clipboardData?.getData('text') || '';
    // Only offer a guess when the paste is the whole solution, not a tweak.
    if (!value.trim() && pasted.trim()) {
      const guess = detectLanguage(pasted);
      if (guess) onDetectLanguage(guess);
    }
  };

  const minHeight = minRows * LINE_HEIGHT_PX + PADDING_Y_PX;

  return (
    <div className="code-surface relative border border-midnight-border focus-within:border-accent-orange/60 transition-colors">
      {/* The trailing newline keeps the last line (and an empty final line)
          from collapsing, so the box never ends flush with the caret. */}
      <pre className="code-text" style={{ minHeight }} aria-hidden="true">
        {html ? (
          <code className="hljs" dangerouslySetInnerHTML={{ __html: html + '\n' }} />
        ) : (
          <code className="hljs">{value + '\n'}</code>
        )}
      </pre>

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        autoFocus={autoFocus}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="soft"
        className="code-text absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent text-transparent outline-none placeholder:text-midnight-muted/50"
        style={{ caretColor: '#d4d4d4' }}
      />
    </div>
  );
}
