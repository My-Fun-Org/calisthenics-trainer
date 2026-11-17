import { formatRestClock } from "@/domain/rest";

interface RestTimerProps {
  remaining: number;
  onSkip: () => void;
}

export function RestTimer({ remaining, onSkip }: RestTimerProps) {
  const ready = remaining === 0;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto w-full max-w-lg rounded-2xl bg-stone-900 px-5 py-4 text-white shadow-lift">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ember-bright">
          {ready ? "Ready" : "Rest"}
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="font-mono text-5xl font-bold tabular-nums leading-none" aria-live="assertive">
            {ready ? "Go" : formatRestClock(remaining)}
          </p>
          <button type="button" className="btn-ghost min-h-12 px-4 text-sm" onClick={onSkip}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
