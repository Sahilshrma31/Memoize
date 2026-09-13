import { useEffect, useState } from 'react';
import { isHighlighterReady, loadHighlighter } from '../utils/highlight';

/**
 * Loads highlight.js on mount and re-renders once it's ready.
 *
 * Components render plain, unhighlighted code while this is false, so a slow
 * network delays the colours but never the code itself.
 */
export default function useHighlighter() {
  const [ready, setReady] = useState(isHighlighterReady);

  useEffect(() => {
    if (ready) return undefined;
    let alive = true;
    loadHighlighter()
      .then(() => alive && setReady(true))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ready]);

  return ready;
}
