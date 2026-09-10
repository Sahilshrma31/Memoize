import { useEffect, useRef, useState } from 'react';
import { problemsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import ChipsInput from './ChipsInput';

const PLATFORM_HOSTS = [
  { host: 'leetcode.com', value: 'leetcode' },
  { host: 'codeforces.com', value: 'codeforces' },
  { host: 'geeksforgeeks.org', value: 'gfg' },
];

const PLATFORM_NAMES = { leetcode: 'LeetCode', codeforces: 'Codeforces', gfg: 'GeeksforGeeks' };

// Cheap pre-check so typing a half-finished URL doesn't hit the server. The
// server does the real parsing and rejects anything it can't look up.
const LOOKUP_URL =
  /^https?:\/\/(www\.|practice\.|m1\.)?(leetcode\.com\/problems\/|geeksforgeeks\.org\/problems\/|codeforces\.com\/(problemset|contest)\/)/i;
const LOOKUP_DEBOUNCE_MS = 350;

// Swap out the chips the previous lookup added, keep the ones you typed.
function replaceAuto(current, previousAuto, incoming) {
  const kept = current.filter((v) => !previousAuto.includes(v));
  return [...kept, ...incoming.filter((v) => !kept.includes(v))];
}

function detectPlatform(url) {
  const lower = url.toLowerCase();
  const match = PLATFORM_HOSTS.find((p) => lower.includes(p.host));
  return match ? match.value : 'other';
}

const EMPTY_FORM = {
  title: '',
  url: '',
  platform: 'other',
  tags: [],
  company: [],
  difficulty: 'medium',
  notes: '',
  intuition: '',
};

const inputCls =
  'w-full border border-midnight-border bg-midnight-bg px-3 py-2 text-sm outline-none focus:border-accent-orange/60 transition-colors';
const labelCls = 'block text-xs uppercase tracking-wide text-midnight-muted mb-1.5';

export default function AddProblemForm({ onAdded }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [platformTouched, setPlatformTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lookup, setLookup] = useState({ status: 'idle', message: '' });
  // Fields you've edited by hand are never overwritten by a lookup.
  const touched = useRef({ title: false, difficulty: false });
  const lastAuto = useRef({ tags: [], company: [] });
  const { showToast } = useToast();

  const handleUrlChange = (url) => {
    setForm((f) => ({
      ...f,
      url,
      platform: platformTouched ? f.platform : detectPlatform(url),
    }));
  };

  useEffect(() => {
    const url = form.url.trim();
    if (!LOOKUP_URL.test(url)) {
      setLookup({ status: 'idle', message: '' });
      return undefined;
    }

    let cancelled = false; // a newer URL supersedes this lookup
    const timer = setTimeout(async () => {
      setLookup({ status: 'loading', message: 'Fetching problem details…' });
      try {
        const data = await problemsApi.lookup(url);
        if (cancelled) return;
        setForm((f) => ({
          ...f,
          title: touched.current.title && f.title.trim() ? f.title : data.title,
          difficulty: touched.current.difficulty ? f.difficulty : data.difficulty,
          platform: platformTouched ? f.platform : data.platform,
          tags: replaceAuto(f.tags, lastAuto.current.tags, data.tags),
          company: replaceAuto(f.company, lastAuto.current.company, data.company),
        }));
        lastAuto.current = { tags: data.tags, company: data.company };
        setLookup({ status: 'done', message: `Filled in from ${PLATFORM_NAMES[data.platform]}` });
      } catch (err) {
        if (cancelled) return;
        setLookup({
          status: 'error',
          message: err.response?.data?.error || 'Couldn’t fetch details — fill them in manually',
        });
      }
    }, LOOKUP_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.url]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPlatformTouched(false);
    touched.current = { title: false, difficulty: false };
    lastAuto.current = { tags: [], company: [] };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;

    setSubmitting(true);
    try {
      await problemsApi.create(form);
      showToast(`Added "${form.title}" to your queue`);
      resetForm();
      onAdded?.();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add problem', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-midnight-border bg-midnight-surface p-5 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            URL <span className="text-midnight-muted/60 normal-case">— paste a LeetCode, GFG or Codeforces link to auto-fill</span>
          </label>
          <input
            type="url"
            required
            value={form.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://leetcode.com/problems/two-sum/"
            className={inputCls}
          />
          {lookup.status !== 'idle' && (
            <p
              className={`mt-1.5 text-xs ${
                lookup.status === 'error'
                  ? 'text-rating-blackout'
                  : lookup.status === 'done'
                    ? 'text-rating-good'
                    : 'text-midnight-muted'
              }`}
            >
              {lookup.status === 'done' ? '✓ ' : ''}
              {lookup.message}
            </p>
          )}
        </div>
        <div>
          <label className={labelCls}>Title</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => {
              touched.current.title = true;
              setForm((f) => ({ ...f, title: e.target.value }));
            }}
            placeholder="Two Sum"
            className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Platform</label>
          <select
            value={form.platform}
            onChange={(e) => {
              setPlatformTouched(true);
              setForm((f) => ({ ...f, platform: e.target.value }));
            }}
            className={inputCls}
          >
            <option value="leetcode">LeetCode</option>
            <option value="codeforces">Codeforces</option>
            <option value="gfg">GeeksforGeeks</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Difficulty</label>
          <select
            value={form.difficulty}
            onChange={(e) => {
              touched.current.difficulty = true;
              setForm((f) => ({ ...f, difficulty: e.target.value }));
            }}
            className={inputCls}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ChipsInput
          label="Tags"
          placeholder="DP, graphs, greedy… (Enter)"
          values={form.tags}
          onChange={(tags) => setForm((f) => ({ ...f, tags }))}
        />
        <ChipsInput
          label="Companies"
          placeholder="Amazon, Google… (Enter)"
          values={form.company}
          onChange={(company) => setForm((f) => ({ ...f, company }))}
        />
      </div>

      <div>
        <label className={labelCls}>
          Intuition <span className="text-midnight-muted/60 normal-case">— the insight to recall</span>
        </label>
        <textarea
          rows={2}
          value={form.intuition}
          onChange={(e) => setForm((f) => ({ ...f, intuition: e.target.value }))}
          placeholder="What's the trick? e.g. sort by end time, then greedily pick non-overlapping…"
          className={`${inputCls} resize-none`}
        />
      </div>

      <div>
        <label className={labelCls}>
          Notes <span className="text-midnight-muted/60 normal-case">— why it's worth revisiting</span>
        </label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Got stuck on the edge case, or a pattern that keeps recurring…"
          className={`${inputCls} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto bg-accent-orange hover:bg-accent-orange/90 px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-black transition-colors disabled:opacity-50"
      >
        {submitting ? 'Adding…' : 'Add Problem'}
      </button>
    </form>
  );
}
