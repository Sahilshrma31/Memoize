import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { progressApi } from '../api/client';
import ActivityHeatmap from '../components/ActivityHeatmap';
import AddProblemForm from '../components/AddProblemForm';
import DailyChallenge from '../components/DailyChallenge';
import PatternMap from '../components/PatternMap';
import ReadinessPanel from '../components/ReadinessPanel';
import TodayPanel from '../components/TodayPanel';
import TodayQueue from '../components/TodayQueue';

export default function Home({ onDataChange, refreshKey }) {
  const [queueKey, setQueueKey] = useState(0);
  const [today, setToday] = useState(null);
  // While the challenge is open, it gets the keyboard shortcuts, not the queue.
  const [challengeActive, setChallengeActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    progressApi
      .today()
      .then((d) => !cancelled && setToday(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="space-y-8">
      <TodayPanel dailyGoal={today?.dailyGoal} />

      <section>
        <h2 className="eyebrow mb-3">Add a Problem</h2>
        <AddProblemForm
          collapsible
          onAdded={() => {
            setQueueKey((k) => k + 1);
            onDataChange?.();
          }}
        />
      </section>

      <section>
        <h2 className="eyebrow mb-3">Today’s Queue</h2>
        <TodayQueue key={queueKey} onQueueChange={onDataChange} keyboardEnabled={!challengeActive} />
      </section>

      {today && (
        <section>
          <h2 className="eyebrow mb-3">Daily Challenge</h2>
          <DailyChallenge challenge={today.challenge} onDone={onDataChange} onActiveChange={setChallengeActive} />
        </section>
      )}

      {today && (
        <section>
          <h2 className="eyebrow mb-3">Interview Readiness</h2>
          <ReadinessPanel readiness={today.readiness} goal={today.goal} onGoalSaved={onDataChange} />
        </section>
      )}

      <section>
        <h2 className="eyebrow mb-3">Your Streak</h2>
        <ActivityHeatmap refreshKey={refreshKey} />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="eyebrow">Where You’re Weakest</h2>
          <Link to="/patterns" className="text-xs uppercase tracking-wide text-midnight-muted hover:text-accent-orange">
            Full pattern tracker →
          </Link>
        </div>
        <PatternMap refreshKey={refreshKey} />
      </section>
    </div>
  );
}
