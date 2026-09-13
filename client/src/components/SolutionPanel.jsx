import { useEffect, useState } from 'react';
import { problemsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { DEFAULT_LANGUAGE, languageLabel } from '../utils/highlight';
import CodeBlock from './CodeBlock';
import CodeEditor from './CodeEditor';
import LanguageSelect from './LanguageSelect';

function timeAgo(date) {
  if (!date) return null;
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * The solution you actually wrote, stored and re-read in Dark+ colours.
 *
 * `startHidden` is the review-flow mode: the code stays behind a click so you
 * re-solve from memory first and only then compare. Revealing it during a
 * review is meant to be a deliberate act, not the default view.
 */
export default function SolutionPanel({
  problem,
  onSaved,
  startHidden = false,
  compact = false,
}) {
  const [revealed, setRevealed] = useState(!startHidden);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(problem.code || '');
  const [language, setLanguage] = useState(problem.language || DEFAULT_LANGUAGE);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setDraft(problem.code || '');
    setLanguage(problem.language || DEFAULT_LANGUAGE);
    setRevealed(!startHidden);
    setEditing(false);
  }, [problem._id, problem.code, problem.language, startHidden]);

  const hasCode = Boolean(problem.code?.trim());

  const save = async () => {
    setSaving(true);
    try {
      const { problem: updated } = await problemsApi.update(problem._id, {
        code: draft,
        language,
      });
      showToast(draft.trim() ? 'Solution saved' : 'Solution cleared');
      setEditing(false);
      onSaved?.(updated);
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not save solution', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(problem.code || '');
    setLanguage(problem.language || DEFAULT_LANGUAGE);
    setEditing(false);
  };

  const shell = compact ? '' : 'border border-midnight-border bg-midnight-surface p-5';

  if (editing) {
    return (
      <div className={shell}>
        <div className="flex items-center justify-between mb-3 gap-3">
          <h3 className="display-heading text-sm tracking-wide">Solution</h3>
          <LanguageSelect value={language} onChange={setLanguage} />
        </div>
        <CodeEditor
          value={draft}
          onChange={setDraft}
          language={language}
          onDetectLanguage={setLanguage}
          autoFocus
          minRows={compact ? 8 : 14}
          placeholder="Paste your accepted solution here…"
        />
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-accent-orange hover:bg-accent-orange/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-black transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="border border-midnight-border px-4 py-1.5 text-xs uppercase tracking-wide text-midnight-muted hover:text-midnight-text transition-colors"
          >
            Cancel
          </button>
          <span className="ml-auto hidden sm:block text-[10px] text-midnight-muted/70 tracking-wide">
            tab indent · esc to exit
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      {!compact && (
        <div className="flex items-center justify-between mb-3 gap-3">
          <h3 className="display-heading text-sm tracking-wide">Solution</h3>
          <div className="flex items-center gap-3">
            {hasCode && problem.codeUpdatedAt && (
              <span className="text-xs text-midnight-muted">
                {languageLabel(problem.language)} · saved {timeAgo(problem.codeUpdatedAt)}
              </span>
            )}
            {hasCode && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs text-accent-orange hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      )}

      {!hasCode ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`w-full border border-dashed border-midnight-border px-4 text-midnight-muted hover:border-accent-orange/50 hover:text-midnight-text transition-colors ${
            compact ? 'py-2.5 text-xs' : 'py-5 text-sm'
          }`}
        >
          + Save the code you solved this with
        </button>
      ) : !revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="w-full border border-dashed border-midnight-border px-4 py-3 text-xs uppercase tracking-wide text-midnight-muted hover:border-accent-orange/50 hover:text-midnight-text transition-colors"
        >
          Show my solution
          <span className="normal-case opacity-60"> — {languageLabel(problem.language)}, after you've re-solved it</span>
        </button>
      ) : (
        <div>
          <CodeBlock code={problem.code} language={problem.language} />
          {compact && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 text-xs text-accent-orange hover:underline"
            >
              Update it
            </button>
          )}
        </div>
      )}
    </div>
  );
}
