import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chip from './Chip';
import PlatformBadge from './PlatformBadge';
import RatingButtons from './RatingButtons';
import Stopwatch from './Stopwatch';

export default function ProblemCard({ card, onRate, leaving }) {
  const problem = card.problemId;
  const [submitting, setSubmitting] = useState(false);
  const secondsRef = useRef(0);

  const handleRate = async (rating) => {
    if (submitting) return;
    setSubmitting(true);
    await onRate(card._id, rating, secondsRef.current);
  };

  return (
    <div
      className={`border border-midnight-border bg-midnight-surface p-5 transition-all duration-300 ${
        leaving ? 'opacity-0 -translate-x-3 scale-95' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <PlatformBadge platform={problem.platform} />
            <span className="text-xs text-midnight-muted capitalize">{problem.difficulty}</span>
          </div>
          <Link
            to={`/problems/${problem._id}`}
            className="text-base font-medium text-midnight-text hover:text-accent-orange transition-colors"
          >
            {problem.title}
          </Link>
        </div>
        <a
          href={problem.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs text-accent-orange hover:underline"
        >
          Open ↗
        </a>
      </div>

      {(problem.tags?.length > 0 || problem.company?.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {problem.tags?.map((t) => (
            <Chip key={`tag-${t}`} label={t} />
          ))}
          {problem.company?.map((c) => (
            <Chip key={`co-${c}`} label={c} />
          ))}
        </div>
      )}

      {problem.notes && (
        <p className="mt-3 text-sm text-midnight-muted line-clamp-2">{problem.notes}</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Stopwatch onTick={(s) => (secondsRef.current = s)} />
      </div>

      <div className="mt-3">
        <RatingButtons onRate={handleRate} disabled={submitting} />
      </div>
    </div>
  );
}
