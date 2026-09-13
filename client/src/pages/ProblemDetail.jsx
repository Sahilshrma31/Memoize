import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { problemsApi } from '../api/client';
import Chip from '../components/Chip';
import DeleteProblem from '../components/DeleteProblem';
import IntuitionPanel from '../components/IntuitionPanel';
import PlatformBadge from '../components/PlatformBadge';
import SolutionPanel from '../components/SolutionPanel';
import StateBadge from '../components/StateBadge';

// Keeps recharts out of the main bundle — see Landing.jsx.
const RetentionChart = lazy(() => import('../components/RetentionChart'));

const RATING_COLOR = {
  blackout: 'text-rating-blackout',
  hard: 'text-rating-hard',
  good: 'text-rating-good',
  easy: 'text-rating-easy',
};

export default function ProblemDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    problemsApi
      .get(id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-sm text-midnight-muted">Loading…</p>;
  if (!data) return <p className="text-sm text-midnight-muted">Problem not found.</p>;

  const { problem, reviewCard, reviewLogs } = data;

  return (
    <div className="space-y-6">
      <Link to="/problems" className="text-sm text-accent-orange hover:underline">
        ← All Problems
      </Link>

      <div className="border border-midnight-border bg-midnight-surface p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PlatformBadge platform={problem.platform} />
              {reviewCard && <StateBadge state={reviewCard.state} />}
              <span className="text-xs text-midnight-muted capitalize">{problem.difficulty}</span>
            </div>
            <h1 className="display-heading text-2xl">{problem.title}</h1>
          </div>
          <a
            href={problem.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-accent-orange hover:underline"
          >
            Open problem ↗
          </a>
        </div>

        {(problem.tags?.length > 0 || problem.company?.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {problem.tags?.map((t) => (
              <Chip key={`tag-${t}`} label={t} />
            ))}
            {problem.company?.map((c) => (
              <Chip key={`co-${c}`} label={c} />
            ))}
          </div>
        )}

        {problem.notes && (
          <p className="mt-4 text-sm text-midnight-muted whitespace-pre-wrap">{problem.notes}</p>
        )}

        {reviewCard && (
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Ease Factor" value={reviewCard.easeFactor.toFixed(2)} />
            <Stat label="Interval" value={`${reviewCard.intervalDays}d`} />
            <Stat label="Repetitions" value={reviewCard.repetitions} />
            <Stat
              label="Next Review"
              value={new Date(reviewCard.nextReviewAt).toLocaleDateString()}
            />
          </div>
        )}
      </div>

      <IntuitionPanel
        problem={problem}
        onSaved={(updated) => setData((d) => ({ ...d, problem: updated }))}
      />

      <SolutionPanel
        problem={problem}
        onSaved={(updated) => setData((d) => ({ ...d, problem: updated }))}
      />

      <Suspense
        fallback={
          <div className="border border-midnight-border bg-midnight-surface h-[360px] flex items-center justify-center text-sm text-midnight-muted">
            Loading chart…
          </div>
        }
      >
        <RetentionChart reviewCard={reviewCard} />
      </Suspense>

      <div>
        <h2 className="eyebrow mb-3">Review History</h2>
        {reviewLogs?.length === 0 ? (
          <p className="text-sm text-midnight-muted">No reviews logged yet.</p>
        ) : (
          <div className="border border-midnight-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-midnight-border bg-midnight-surface text-left text-xs uppercase tracking-wide text-midnight-muted">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Rating</th>
                  <th className="px-4 py-2.5 font-medium">Time Taken</th>
                </tr>
              </thead>
              <tbody>
                {reviewLogs
                  ?.slice()
                  .reverse()
                  .map((log) => (
                    <tr key={log._id} className="border-b border-midnight-border/60 last:border-0">
                      <td className="px-4 py-2.5 text-midnight-muted">
                        {new Date(log.reviewedAt).toLocaleString()}
                      </td>
                      <td className={`px-4 py-2.5 font-medium capitalize ${RATING_COLOR[log.rating]}`}>
                        {log.rating}
                      </td>
                      <td className="px-4 py-2.5 text-midnight-muted">
                        {log.timeTakenSec ? `${log.timeTakenSec}s` : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-midnight-border">
        <DeleteProblem problem={problem} reviewLogCount={reviewLogs?.length || 0} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-midnight-border bg-midnight-bg px-3 py-2.5">
      <p className="text-xs text-midnight-muted">{label}</p>
      <p className="mt-0.5 font-medium text-midnight-text tabular-nums">{value}</p>
    </div>
  );
}
