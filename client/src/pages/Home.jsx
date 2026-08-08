import { useState } from 'react';
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
        <h2 className="eyebrow mb-3">Where You’re Weakest</h2>
        <PatternMap refreshKey={refreshKey} />
      </section>
    </div>
  );
}
