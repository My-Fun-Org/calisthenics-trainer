import { formatRestClock } from "@/domain/rest";

interface RestTimerProps {
  remaining: number;
  durationSeconds: number;
  exerciseName?: string;
  onSkip: () => void;
}

export function RestTimer({ remaining, durationSeconds, exerciseName, onSkip }: RestTimerProps) {
  const progress = durationSeconds > 0 ? remaining / durationSeconds : 0;
  const ready = remaining === 0;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      role="status"
      aria-live="polite"
    >
      <div className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 text-stone-50 shadow-xl">
        <div className="h-1 w-full bg-stone-800">
          <div
            className="h-full bg-amber-500 transition-[width] duration-500 ease-linear"
            style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-stone-400">
              {ready ? "Ready" : "Rest"}
              {exerciseName ? ` · ${exerciseName}` : ""}
            </p>
            <p className="font-mono text-2xl font-bold tracking-tight text-amber-400 tabular-nums">
              {ready ? "Go" : formatRestClock(remaining)}
            </p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-stone-800 px-5 py-2 text-sm font-semibold text-stone-100 transition-colors hover:bg-stone-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            Skip rest
          </button>
        </div>
      </div>
    </div>
  );
}
