import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { problemsApi } from '../api/client';
import Chip from './Chip';
import PlatformBadge from './PlatformBadge';
import StateBadge from './StateBadge';

const DIFFICULTY_COLOR = {
  easy: 'text-rating-good',
  medium: 'text-rating-hard',
  hard: 'text-rating-blackout',
};

export default function AllProblemsTable() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    tag: '',
    company: '',
    platform: '',
    difficulty: '',
    state: '',
  });

  useEffect(() => {
    setLoading(true);
    problemsApi
      .list({
        tag: filters.tag || undefined,
        company: filters.company || undefined,
        platform: filters.platform || undefined,
        difficulty: filters.difficulty || undefined,
      })
      .then(setProblems)
      .finally(() => setLoading(false));
  }, [filters.tag, filters.company, filters.platform, filters.difficulty]);

  const filtered = useMemo(() => {
    if (!filters.state) return problems;
    return problems.filter((p) => p.reviewCard?.state === filters.state);
  }, [problems, filters.state]);

  const setFilter = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Filter by tag…"
          value={filters.tag}
          onChange={setFilter('tag')}
          className="border border-midnight-border bg-midnight-surface px-3 py-1.5 text-sm outline-none focus:border-accent-orange/60 transition-colors"
        />
        <input
          type="text"
          placeholder="Filter by company…"
          value={filters.company}
          onChange={setFilter('company')}
          className="border border-midnight-border bg-midnight-surface px-3 py-1.5 text-sm outline-none focus:border-accent-orange/60 transition-colors"
        />
        <select
          value={filters.platform}
          onChange={setFilter('platform')}
          className="border border-midnight-border bg-midnight-surface px-3 py-1.5 text-sm outline-none focus:border-accent-orange/60 transition-colors"
        >
          <option value="">All platforms</option>
          <option value="leetcode">LeetCode</option>
          <option value="codeforces">Codeforces</option>
          <option value="other">Other</option>
        </select>
        <select
          value={filters.difficulty}
          onChange={setFilter('difficulty')}
          className="border border-midnight-border bg-midnight-surface px-3 py-1.5 text-sm outline-none focus:border-accent-orange/60 transition-colors"
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          value={filters.state}
          onChange={setFilter('state')}
          className="border border-midnight-border bg-midnight-surface px-3 py-1.5 text-sm outline-none focus:border-accent-orange/60 transition-colors"
        >
          <option value="">All states</option>
          <option value="learning">Learning</option>
          <option value="review">Review</option>
          <option value="mastered">Mastered</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-midnight-muted">Loading problems…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-midnight-muted">No problems match these filters.</p>
      ) : (
        <div className="overflow-x-auto border border-midnight-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-midnight-border bg-midnight-surface text-left text-xs uppercase tracking-wide text-midnight-muted">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Difficulty</th>
                <th className="px-4 py-3 font-medium">Tags</th>
                <th className="px-4 py-3 font-medium">Companies</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Next Review</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p._id}
                  className="border-b border-midnight-border/60 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/problems/${p._id}`}
                      className="font-medium text-midnight-text hover:text-accent-orange transition-colors"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <PlatformBadge platform={p.platform} />
                  </td>
                  <td className={`px-4 py-3 capitalize ${DIFFICULTY_COLOR[p.difficulty] || ''}`}>
                    {p.difficulty}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.tags?.map((t) => (
                        <Chip key={t} label={t} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.company?.map((c) => (
                        <Chip key={c} label={c} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.reviewCard && <StateBadge state={p.reviewCard.state} />}
                  </td>
                  <td className="px-4 py-3 text-midnight-muted whitespace-nowrap">
                    {p.reviewCard?.nextReviewAt
                      ? new Date(p.reviewCard.nextReviewAt).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
