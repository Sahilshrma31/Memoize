import { useState } from 'react';
import { Link } from 'react-router-dom';
import ActivityHeatmap from '../components/ActivityHeatmap';
import AddProblemForm from '../components/AddProblemForm';
import PatternMap from '../components/PatternMap';
import TodayQueue from '../components/TodayQueue';

export default function Home({ onDataChange, refreshKey }) {
  const [queueKey, setQueueKey] = useState(0);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="eyebrow mb-3">Add a Problem</h2>
        <AddProblemForm
          onAdded={() => {
            setQueueKey((k) => k + 1);
            onDataChange?.();
          }}
        />
      </section>

      <section>
        <h2 className="eyebrow mb-3">Today’s Queue</h2>
        <TodayQueue key={queueKey} onQueueChange={onDataChange} />
      </section>

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
