import { useEffect, useState } from 'react';

const STORAGE_KEY = 'memoize_guide_collapsed';

const RATINGS = [
  {
    label: 'Blackout',
    cls: 'text-rating-blackout',
    when: 'You had no idea. Total blank.',
    effect: 'Back to tomorrow, and the problem gets treated as harder from now on.',
  },
  {
    label: 'Hard',
    cls: 'text-rating-hard',
    when: 'You got there, but it hurt — needed a hint or way too long.',
    effect: 'Comes back sooner than usual, and future gaps grow more slowly.',
  },
  {
    label: 'Good',
    cls: 'text-rating-good',
    when: 'You recalled the approach and solved it. Most reviews should be this.',
    effect: 'Normal spacing — each gap roughly 2.5× the last.',
  },
  {
    label: 'Easy',
    cls: 'text-rating-easy',
    when: 'Instant. You barely had to think.',
    effect: 'Pushed much further out so you stop wasting time on it.',
  },
];

export default function HowItWorks() {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  return (
    <div className="border border-midnight-border bg-midnight-surface">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <h3 className="display-heading text-sm tracking-wide">How To Use Memoize</h3>
        <span className="text-xs uppercase tracking-widest text-accent-orange">
          {collapsed ? 'Read this' : 'Hide'}
        </span>
      </button>

      {!collapsed && (
        <div className="px-5 pb-6 space-y-7 border-t border-midnight-border pt-5">
          {/* The problem */}
          <Section title="The problem this solves">
            <p>
              You solve a LeetCode problem, feel good, and move on. Three weeks later the same
              problem shows up in an interview and you have <em>no idea</em> how you did it.
            </p>
            <p>
              That's not a you problem — it's how memory works. Anything you don't revisit
              fades on a predictable curve. Most people fight this by grinding <em>more</em> new
              problems, which is exactly backwards: you keep adding to a pile that's leaking
              from the bottom.
            </p>
          </Section>

          {/* Daily loop */}
          <Section title="How you actually use it (2 minutes a day)">
            <Steps
              items={[
                <>
                  <strong>Solved something worth keeping?</strong> Add it above — paste the URL,
                  add tags like <Code>dp</Code> or <Code>graphs</Code>, and write the key insight
                  in the <strong>Intuition</strong> box while it's fresh.
                </>,
                <>
                  <strong>Open the app each day.</strong> Whatever's in Today's Queue is what
                  you're about to forget. If the queue is empty, you're done — genuinely, that's
                  the whole session.
                </>,
                <>
                  <strong>Try to re-solve each one</strong> (or at least recall the approach).
                  The intuition stays hidden on purpose — attempt it first, then reveal to check
                  yourself.
                </>,
                <>
                  <strong>Rate how it went</strong> honestly. That single click reschedules the
                  problem for exactly when you'd be about to forget it.
                </>,
              ]}
            />
          </Section>

          {/* Ratings */}
          <Section title="What the four buttons mean">
            <p className="mb-3">
              This is the only information the app gets from you — it can't see how well you
              actually did, so your rating is what drives everything.
            </p>
            <div className="border border-midnight-border divide-y divide-midnight-border">
              {RATINGS.map((r) => (
                <div key={r.label} className="p-3 sm:flex sm:gap-4">
                  <span className={`shrink-0 w-20 text-sm font-semibold ${r.cls}`}>{r.label}</span>
                  <div className="text-sm">
                    <p className="text-midnight-text">{r.when}</p>
                    <p className="text-midnight-muted mt-0.5">{r.effect}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* The science */}
          <Section title="The science behind it">
            <p>
              Memoize uses <strong>SM-2</strong>, the same scheduling algorithm behind Anki —
              the flashcard app medical students use to memorise thousands of facts. It's been
              around since the 1980s and it's built on one finding:{' '}
              <strong>reviewing something right before you forget it</strong> is dramatically
              more effective than reviewing it early or often.
            </p>
            <p>
              Your recall of anything decays roughly as{' '}
              <Code>R(t) = e^(-t / τ)</Code> — steep at first, then flattening. Review too early
              and you waste time on something you already know. Too late and you've forgotten it
              and start from scratch.
            </p>
            <p>
              The sweet spot is around <strong>80% recall</strong> — the point where it takes
              real effort to remember, but you still can. That effort is what strengthens the
              memory. Memoize schedules every review to land there, which is why the intervals
              stretch out:
            </p>
            <div className="border border-midnight-border p-3 text-sm font-mono text-midnight-muted overflow-x-auto">
              1 day → 6 days → 15 days → 38 days → 95 days → 238 days
            </div>
            <p>
              Six reviews spread over a year, and the problem moves from short-term recall to
              something you simply know. Blank on it, and the schedule resets — that problem
              proved it wasn't ready.
            </p>
          </Section>

          {/* Dashboard */}
          <Section title="Reading your dashboard">
            <Definitions
              items={[
                ['Due Today', 'Problems whose recall is about to drop below 80%. Your to-do list.'],
                ['Learning', "Fewer than 2 successful reviews — still not stuck."],
                ['Review', 'Actively being spaced out at growing intervals.'],
                ['Mastered', '5+ successful reviews at 180+ day gaps. You know this one.'],
                ['Your Streak', 'Consecutive days with at least one review. Both graphs measure reviews, not problems added.'],
                ['Where You’re Weakest', 'Success rate per tag. Needs 3+ reviews on a tag before it trusts the number.'],
              ]}
            />
          </Section>

          {/* Tips */}
          <Section title="Getting the most out of it">
            <Steps
              ordered={false}
              items={[
                <>
                  <strong>Tag everything.</strong> The weakness map groups by tag — untagged
                  problems tell you nothing about which patterns you keep failing.
                </>,
                <>
                  <strong>Rate honestly.</strong> Clicking Easy on something you fumbled pushes
                  it six months out, and you'll have genuinely forgotten it by then.
                </>,
                <>
                  <strong>Write the intuition as a hint, not a solution.</strong> "Sort by end
                  time, then greedily pick non-overlapping" beats pasting your whole answer —
                  you want to trigger recall, not read code.
                </>,
                <>
                  <strong>Don't add every problem you solve.</strong> Add the ones that taught
                  you something. 40 well-chosen problems beat 300 you never revisit.
                </>,
                <>
                  <strong>Missing days is fine.</strong> Nothing is lost — overdue problems just
                  wait for you. The queue is a suggestion, not a debt.
                </>,
              ]}
            />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h4 className="eyebrow mb-3">{title}</h4>
      <div className="space-y-2.5 text-sm text-midnight-muted leading-relaxed">{children}</div>
    </section>
  );
}

function Steps({ items, ordered = true }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-midnight-muted leading-relaxed">
          <span className="shrink-0 text-accent-orange font-mono text-xs pt-0.5">
            {ordered ? String(i + 1).padStart(2, '0') : '—'}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Definitions({ items }) {
  return (
    <dl className="border border-midnight-border divide-y divide-midnight-border">
      {items.map(([term, def]) => (
        <div key={term} className="p-3 sm:flex sm:gap-4">
          <dt className="shrink-0 w-40 text-sm text-midnight-text">{term}</dt>
          <dd className="text-sm text-midnight-muted">{def}</dd>
        </div>
      ))}
    </dl>
  );
}

function Code({ children }) {
  return (
    <code className="bg-midnight-bg px-1.5 py-0.5 text-xs text-accent-orange">{children}</code>
  );
}
