import { useState } from 'react';
import ActivityHeatmap from '../components/ActivityHeatmap';
import AddProblemForm from '../components/AddProblemForm';
import HowItWorks from '../components/HowItWorks';
import PatternMap from '../components/PatternMap';
import TodayQueue from '../components/TodayQueue';

export default function Home({ onDataChange, refreshKey }) {
  const [queueKey, setQueueKey] = useState(0);

  return (
    <div className="space-y-8">
      {/* Expanded on a first visit, then collapses to a single bar once dismissed. */}
      <HowItWorks />

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
        <h2 className="eyebrow mb-3">Where You’re Weakest</h2>
        <PatternMap refreshKey={refreshKey} />
      </section>
    </div>
  );
}
