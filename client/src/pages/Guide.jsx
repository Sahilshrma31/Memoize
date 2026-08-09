import { Link } from 'react-router-dom';
import { ForgettingCurve, IntervalGrowth, ReviewLoop } from '../components/guide/Diagrams';
import { useAuth } from '../context/AuthContext';

const RATINGS = [
  {
    label: 'Blackout',
    cls: 'text-rating-blackout',
    when: 'You had no idea. Total blank.',
    effect: 'Resets to tomorrow, and the problem is treated as harder from now on.',
  },
  {
    label: 'Hard',
    cls: 'text-rating-hard',
    when: 'You got there, but it hurt — needed a hint or took far too long.',
    effect: 'Comes back sooner than usual; future gaps grow more slowly.',
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
    effect: 'Pushed much further out so you stop spending time on it.',
  },
];

const GLOSSARY = [
  ['Due Today', 'Problems whose recall is about to drop below 80%. This is your to-do list.'],
  ['Learning', 'Fewer than 2 successful reviews — not stuck yet.'],
  ['Review', 'Actively being spaced out at growing intervals.'],
  ['Mastered', '5+ successful reviews at gaps of 180 days or more.'],
  ['Your Streak', 'Consecutive days with at least one review.'],
  ['Where You’re Weakest', 'Success rate per tag. Needs 3+ reviews on a tag before the number is trusted.'],
];

const TIPS = [
  ['Tag everything', 'The weakness map groups by tag. An untagged problem can never tell you which patterns you keep failing.'],
  ['Rate honestly', 'Clicking Easy on something you fumbled pushes it months out — and you will have genuinely forgotten it by then.'],
  ['Write intuition as a hint, not a solution', '“Sort by end time, then greedily pick non-overlapping” beats pasting your whole answer. You want to trigger recall, not read code.'],
  ['Don’t add everything you solve', 'Add the ones that taught you something. Forty well-chosen problems beat three hundred you never revisit.'],
  ['Missing days is fine', 'Nothing is lost. Overdue problems simply wait for you — the queue is a suggestion, not a debt.'],
];

export default function Guide() {
  const { isAuthenticated } = useAuth();

  return (
    <article className="max-w-3xl mx-auto pb-20">
      <header className="pt-4 pb-10">
        <p className="eyebrow">The Guide</p>
        <h1 className="display-heading text-3xl sm:text-4xl leading-tight mt-5">
          How To Use Memoize
        </h1>
        <p className="mt-5 text-base text-midnight-muted leading-relaxed">
          A five-minute read that explains what this app does, the science it's built on, and
          how to get value from it in about two minutes a day.
        </p>
      </header>

      <Section n="01" title="The problem this solves">
        <P>
          You solve a problem, feel good, and move on. Three weeks later the same problem
          appears in an interview and you have <Em>no idea</Em> how you did it.
        </P>
        <P>
          That isn't a you problem — it's how memory works. Anything you don't revisit fades on
          a predictable curve. Most people fight this by grinding <Em>more</Em> new problems,
          which is exactly backwards: you keep adding to a pile that's leaking from the bottom.
        </P>
        <P>
          The fix isn't more problems. It's revisiting the ones you've already solved at the
          right moment — just as they're about to slip away.
        </P>
        <div className="my-7">
          <ForgettingCurve />
        </div>
        <P>
          The dashed grey line is a problem you solved once and never touched again. The orange
          line is the same problem reviewed each time recall approaches 80%. Every review resets
          the decay — and the next gap is longer than the last.
        </P>
      </Section>

      <Section n="02" title="How you actually use it">
        <P>
          Two minutes a day. There's no planning, no deciding what to study — the app tells you
          what's at risk and you work through it.
        </P>
        <div className="my-7">
          <ReviewLoop />
        </div>
        <Steps
          items={[
            <>
              <B>Add a problem you want to keep.</B> Paste the URL, add tags like{' '}
              <Code>dp</Code> or <Code>graphs</Code>, and write the key insight in the{' '}
              <B>Intuition</B> box while it's fresh in your head.
            </>,
            <>
              <B>Open the app each day.</B> Whatever's in Today's Queue is what you're about to
              forget. Empty queue means you're done — genuinely, that's the whole session.
            </>,
            <>
              <B>Try to re-solve each one</B>, or at minimum recall the approach. Your intuition
              stays hidden on purpose: attempt it first, then reveal to check yourself.
            </>,
            <>
              <B>Rate how it went.</B> That single click reschedules the problem for the moment
              you'd otherwise start forgetting it.
            </>,
          ]}
        />
      </Section>

      <Section n="03" title="What the four buttons mean">
        <P>
          Your rating is the <Em>only</Em> signal the app receives. It can't watch you solve, so
          everything it decides comes from which button you press.
        </P>
        <div className="mt-6 border border-midnight-border divide-y divide-midnight-border">
          {RATINGS.map((r) => (
            <div key={r.label} className="p-4 sm:flex sm:gap-5">
              <span className={`shrink-0 sm:w-24 text-sm font-semibold ${r.cls}`}>{r.label}</span>
              <div className="text-sm mt-1 sm:mt-0">
                <p className="text-midnight-text leading-relaxed">{r.when}</p>
                <p className="text-midnight-muted mt-1 leading-relaxed">{r.effect}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section n="04" title="The science behind it">
        <P>
          Memoize uses <B>SM-2</B>, the scheduling algorithm behind Anki — the flashcard app
          medical students use to hold thousands of facts in memory. It dates to the 1980s and
          rests on one finding: reviewing something <Em>right before you forget it</Em> is far
          more effective than reviewing early or often.
        </P>
        <P>
          Recall decays roughly as <Code>R(t) = e^(-t / τ)</Code> — steep at first, then
          flattening. Review too early and you spend time on something you already know. Too
          late and you've forgotten it, so you're starting over.
        </P>
        <P>
          The sweet spot sits near <B>80% recall</B>: the point where remembering takes real
          effort but is still possible. That effort is precisely what strengthens the memory.
          Every review is scheduled to land there, which is why the gaps stretch out.
        </P>
        <div className="my-7">
          <IntervalGrowth />
        </div>
        <P>
          Six reviews across roughly a year, and the problem moves from something you looked up
          to something you simply know. Blank on it and the schedule resets to day one — that
          problem proved it wasn't ready.
        </P>
      </Section>

      <Section n="05" title="Reading your dashboard">
        <dl className="border border-midnight-border divide-y divide-midnight-border">
          {GLOSSARY.map(([term, def]) => (
            <div key={term} className="p-4 sm:flex sm:gap-5">
              <dt className="shrink-0 sm:w-44 text-sm text-midnight-text">{term}</dt>
              <dd className="text-sm text-midnight-muted mt-1 sm:mt-0 leading-relaxed">{def}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-midnight-muted leading-relaxed">
          One thing worth knowing: both graphs measure <Em>reviews</Em>, not problems added.
          Adding a problem without ever rating it moves neither.
        </p>
      </Section>

      <Section n="06" title="Getting the most out of it">
        <div className="space-y-5">
          {TIPS.map(([title, body]) => (
            <div key={title} className="border-l-2 border-accent-orange/40 pl-4">
              <h3 className="text-sm font-semibold text-midnight-text">{title}</h3>
              <p className="mt-1 text-sm text-midnight-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-14 border border-midnight-border bg-midnight-surface px-8 py-10 text-center">
        <p className="eyebrow mb-4">That's everything</p>
        <h2 className="display-heading text-xl sm:text-2xl max-w-lg mx-auto leading-snug">
          The rest is just showing up
        </h2>
        <Link
          to={isAuthenticated ? '/app' : '/login'}
          className="inline-block mt-7 bg-accent-orange hover:bg-accent-orange/90 px-7 py-3 text-sm font-semibold uppercase tracking-wide text-black transition-colors"
        >
          {isAuthenticated ? 'Go to my queue →' : 'Get started →'}
        </Link>
      </div>
    </article>
  );
}

function Section({ n, title, children }) {
  return (
    <section className="py-9 border-t border-midnight-border">
      <div className="flex items-baseline gap-4 mb-5">
        <span className="display-heading text-lg text-accent-orange">{n}</span>
        <h2 className="display-heading text-lg sm:text-xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const P = ({ children }) => (
  <p className="text-[15px] text-midnight-muted leading-[1.75] mb-4 last:mb-0">{children}</p>
);
const B = ({ children }) => <strong className="text-midnight-text font-semibold">{children}</strong>;
const Em = ({ children }) => <em className="text-midnight-text not-italic">{children}</em>;
const Code = ({ children }) => (
  <code className="bg-midnight-surface border border-midnight-border px-1.5 py-0.5 text-[13px] text-accent-orange">
    {children}
  </code>
);

function Steps({ items }) {
  return (
    <ol className="space-y-4 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4">
          <span className="shrink-0 font-mono text-xs text-accent-orange pt-1">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span className="text-[15px] text-midnight-muted leading-[1.75]">{item}</span>
        </li>
      ))}
    </ol>
  );
}
