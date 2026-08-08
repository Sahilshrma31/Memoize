import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { statsApi } from '../api/client';
import LiveStat from '../components/LiveStat';
import Reveal from '../components/Reveal';
import { useAuth } from '../context/AuthContext';

// recharts is by far the heaviest dependency; load it only when a chart is
// actually rendered so the first paint isn't waiting on it.
const SpacedRepetitionChart = lazy(() => import('../components/SpacedRepetitionChart'));

const STEPS = [
  {
    n: '01',
    title: 'Log It',
    body: 'Solved something worth remembering? Drop in the title, tags, company, and the one insight that cracked it.',
  },
  {
    n: '02',
    title: 'Get Prompted',
    body: 'When your memory of it is about to slip below 80%, it lands back in your queue — not before, not after.',
  },
  {
    n: '03',
    title: 'Rate & Retain',
    body: 'Blackout, Hard, Good, or Easy. SM-2 reschedules on the spot, stretching the gap every time you succeed.',
  },
];

export default function Landing() {
  const [stats, setStats] = useState(null);
  const { isAuthenticated } = useAuth();
  const ctaTarget = isAuthenticated ? '/app' : '/login';

  useEffect(() => {
    if (!isAuthenticated) {
      setStats(null);
      return;
    }
    statsApi.get().then(setStats).catch(() => {});
  }, [isAuthenticated]);

  return (
    <div className="space-y-24 pb-16">
      {/* Hero */}
      <section className="pt-6">
        <p className="eyebrow">Spaced Repetition For Competitive Programming</p>
        <h1 className="display-heading text-3xl sm:text-5xl leading-tight mt-5 max-w-3xl">
          Solve It Once.
          <br />
          Remember It Forever
          <span className="cursor-blink text-accent-orange">_</span>
        </h1>
        <p className="mt-6 max-w-xl text-sm sm:text-base text-midnight-muted leading-relaxed">
          Memoize tracks every problem you've solved and uses SM-2 — the same scheduling
          algorithm behind Anki — to bring it back right as your recall starts to fade. No
          re-grinding problems you already know. No forgetting the ones you don't revisit
          enough.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Link
            to={ctaTarget}
            className="bg-accent-orange hover:bg-accent-orange/90 px-7 py-3 text-sm font-semibold uppercase tracking-wide text-black transition-colors"
          >
            Try Now →
          </Link>
          <span className="text-xs text-midnight-muted">
            Free. Sign in with Google — your queue stays private to you.
          </span>
        </div>
      </section>

      {/* How it works */}
      <Reveal>
        <section>
          <p className="eyebrow mb-8">How It Works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 border border-midnight-border divide-y sm:divide-y-0 sm:divide-x divide-midnight-border">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-midnight-surface p-6">
                <span className="display-heading text-2xl text-accent-orange">{s.n}</span>
                <h3 className="mt-3 text-sm font-semibold uppercase tracking-wide">{s.title}</h3>
                <p className="mt-2 text-sm text-midnight-muted leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* The science / chart */}
      <Reveal>
        <section>
          <p className="eyebrow mb-3">The Science</p>
          <p className="max-w-2xl text-sm text-midnight-muted leading-relaxed mb-6">
            Every memory decays on a predictable curve. Left alone, your recall of a solved
            problem drops toward zero. Review it right as it crosses the 80% mark, and the
            decay resets — but the next interval is longer than the last. Repeat enough times
            and the problem moves from short-term recall to something you simply know.
          </p>
          <Suspense
            fallback={
              <div className="border border-midnight-border bg-midnight-surface h-[380px] flex items-center justify-center text-sm text-midnight-muted">
                Loading chart…
              </div>
            }
          >
            <SpacedRepetitionChart />
          </Suspense>
        </section>
      </Reveal>

      {/* Live stats — only meaningful once signed in */}
      {isAuthenticated && (
        <Reveal>
          <section>
            <p className="eyebrow mb-3">Your Progress</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-midnight-border border border-midnight-border bg-midnight-surface">
              <LiveStat label="Total Problems" value={stats?.totalProblems ?? 0} />
              <LiveStat
                label="Due Today"
                value={stats?.dueToday ?? 0}
                accent="text-rating-hard"
              />
              <LiveStat
                label="Mastered"
                value={stats?.byState?.mastered ?? 0}
                accent="text-rating-good"
              />
              <LiveStat label="Streak" value={stats?.streak ?? 0} accent="text-accent-orange" />
            </div>
          </section>
        </Reveal>
      )}

      {/* Final CTA */}
      <Reveal>
        <section className="border border-midnight-border bg-midnight-surface px-8 py-12 text-center">
          <p className="eyebrow mb-4">Start Reviewing</p>
          <h2 className="display-heading text-2xl sm:text-3xl max-w-xl mx-auto">
            {stats?.dueToday
              ? `${stats.dueToday} problem${stats.dueToday === 1 ? '' : 's'} due right now.`
              : 'Your queue is waiting.'}
          </h2>
          <Link
            to={ctaTarget}
            className="inline-block mt-8 bg-accent-orange hover:bg-accent-orange/90 px-7 py-3 text-sm font-semibold uppercase tracking-wide text-black transition-colors"
          >
            Try Now →
          </Link>
        </section>
      </Reveal>
    </div>
  );
}
