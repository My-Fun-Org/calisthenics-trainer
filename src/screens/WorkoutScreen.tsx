import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ArrowLeftRight, Check, Search, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ExerciseFigure } from "@/diagrams/ExerciseFigure";
import { RestTimer } from "@/components/RestTimer";
import { CATALOG } from "@/domain/catalog";
import { findDay, findPlan } from "@/domain/planHistory";
import { restSecondsFor, tickRest } from "@/domain/rest";
import { canToggleSet } from "@/domain/sets";
import { swapCandidates } from "@/domain/swapExercise";
import { weekLabel } from "@/domain/progression";
import { FOCUS_LABEL, type Equipment, type Exercise, type PlannedExercise } from "@/domain/types";
import { setKey, usePlanStore } from "@/store/planStore";

const EQUIPMENT_LABEL: Record<Equipment, string> = {
  floor: "Floor",
  wall: "Wall",
  "pull-up-bar": "Pull-up bar",
  "dip-bars": "Dip bars",
  rings: "Rings",
  kettlebell: "Kettlebell",
  band: "Band",
  "jump-rope": "Jump rope",
};

export function WorkoutScreen() {
  const { date } = useParams();
  const plan = usePlanStore((state) => state.currentPlan);
  const history = usePlanStore((state) => state.history);
  const settings = usePlanStore((state) => state.settings);
  const completedSets = usePlanStore((state) => state.completedSets);
  const completedWorkouts = usePlanStore((state) => state.completedWorkouts);
  const completeSet = usePlanStore((state) => state.completeSet);
  const completeWorkout = usePlanStore((state) => state.completeWorkout);
  const swap = usePlanStore((state) => state.swap);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [restName, setRestName] = useState("");
  const [restDuration, setRestDuration] = useState(0);

  const day = findDay(plan, history, date ?? "");
  const owningPlan = findPlan(plan, history, date ?? "");

  const restRunning = restRemaining !== null && restRemaining > 0;

  useEffect(() => {
    if (!restRunning) {
      return;
    }
    const id = window.setInterval(() => {
      setRestRemaining((current) => (current === null ? null : tickRest(current)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [restRunning]);

  useEffect(() => {
    if (restRemaining !== 0) {
      return;
    }
    const id = window.setTimeout(() => setRestRemaining(null), 1500);
    return () => window.clearTimeout(id);
  }, [restRemaining]);

  const swapping = day?.exercises.find((exercise) => exercise.exerciseId === swappingId) ?? null;

  const candidates = useMemo(() => {
    if (!plan || !swappingId) {
      return [];
    }
    const pool = owningPlan ? swapCandidates(owningPlan, swappingId, CATALOG) : [];
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return pool;
    }
    return pool.filter(
      (exercise) =>
        exercise.name.toLowerCase().includes(needle) ||
        exercise.family.toLowerCase().includes(needle),
    );
  }, [owningPlan, plan, swappingId, query]);

  if (!plan || !date) {
    return <Navigate to="/setup" replace />;
  }
  if (!day || !owningPlan) {
    return <Navigate to="/week" replace />;
  }

  const done = completedWorkouts.includes(day.date);
  const totalSets = day.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const finishedSets = day.exercises.reduce((sum, exercise) => {
    const marks = completedSets[setKey(day.date, exercise.exerciseId)] ?? [];
    return sum + marks.filter(Boolean).length;
  }, 0);

  return (
    <AppShell rightAction={{ label: "Calendar", to: "/week" }}>
      <div className={`space-y-5 ${restRemaining !== null ? "pb-28" : "pb-8"}`}>
        <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <p className="font-mono text-xs tabular-nums text-stone-500">
              {formatDateShort(day.date)} · {owningPlan.difficulty} · {weekLabel(owningPlan.weekNumber)}
            </p>
            <h1 className="font-display mt-0.5 text-2xl font-bold tracking-tight text-stone-900">
              {day.weekday} · {FOCUS_LABEL[day.muscle]}
            </h1>
          </div>
          <span className="shrink-0 whitespace-nowrap font-mono text-xs font-semibold tabular-nums text-stone-600">
            {finishedSets}/{totalSets} sets
          </span>
        </div>

        <div className="space-y-3.5">
          {day.exercises.map((exercise) => {
            const sets = completedSets[setKey(day.date, exercise.exerciseId)] ??
              Array.from({ length: exercise.sets }, () => false);
            const canSwap = swapCandidates(owningPlan, exercise.exerciseId, CATALOG).length > 0;
            return (
              <article
                key={exercise.exerciseId}
                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.03)]"
              >
                <div className="flex items-start gap-3.5">
                  <ExerciseThumb exercise={exercise} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-display text-base font-bold leading-snug text-stone-900">
                        {exercise.name}
                      </h2>
                      <button
                        type="button"
                        disabled={!canSwap}
                        onClick={() => {
                          setQuery("");
                          setSwappingId(exercise.exerciseId);
                        }}
                        className="inline-flex min-h-[36px] shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        Swap
                      </button>
                    </div>
                    <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-amber-800">
                      {volumeLabel(exercise)}{" "}
                      <span className="font-sans text-xs font-normal text-stone-500">
                        · {FOCUS_LABEL[exercise.muscle]}
                      </span>
                    </p>
                  </div>
                </div>

                <p className="mt-3 border-t border-stone-100 pt-2.5 text-xs leading-relaxed text-stone-600">
                  {exercise.cues}
                </p>

                <div className="mt-3.5 grid grid-cols-4 gap-2">
                  {sets.map((isDone, index) => {
                    const allowed = canToggleSet(sets, index);
                    return (
                    <button
                      key={`${exercise.exerciseId}-set-${index}`}
                      type="button"
                      disabled={!allowed}
                      onClick={() => {
                        if (!allowed) {
                          return;
                        }
                        completeSet(day.date, exercise.exerciseId, index);
                        if (isDone) {
                          setRestRemaining(null);
                          return;
                        }
                        const seconds = restSecondsFor(owningPlan.difficulty, settings?.restSeconds);
                        setRestDuration(seconds);
                        setRestName(exercise.name);
                        setRestRemaining(seconds);
                      }}
                      aria-pressed={isDone}
                      className={`flex min-h-[44px] items-center justify-center gap-1 rounded-xl border font-mono text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:cursor-not-allowed disabled:opacity-40 ${
                        isDone
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-200 bg-[#FAF9F5] text-stone-800 enabled:hover:border-amber-500 enabled:active:scale-[0.97]"
                      }`}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : null}
                      <span>Set {index + 1}</span>
                    </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => completeWorkout(day.date)}
            disabled={done}
            className={`flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
              done
                ? "cursor-default border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "bg-stone-900 text-white shadow-sm hover:bg-stone-800 active:scale-[0.99]"
            }`}
          >
            {done ? (
              <>
                <Check className="h-4 w-4" />
                Workout done
              </>
            ) : (
              "Mark workout done"
            )}
          </button>
        </div>
      </div>

      {swapping ? (
        <SwapSheet
          exerciseName={swapping.name}
          query={query}
          candidates={candidates}
          onQuery={setQuery}
          onClose={() => setSwappingId(null)}
          onSelect={(exerciseId) => {
            swap(day.date, swapping.exerciseId, exerciseId);
            setSwappingId(null);
          }}
        />
      ) : null}

      {restRemaining !== null ? (
        <RestTimer
          remaining={restRemaining}
          durationSeconds={restDuration}
          exerciseName={restName}
          onSkip={() => setRestRemaining(null)}
        />
      ) : null}
    </AppShell>
  );
}

function SwapSheet({
  exerciseName,
  query,
  candidates,
  onQuery,
  onClose,
  onSelect,
}: {
  exerciseName: string;
  query: string;
  candidates: Exercise[];
  onQuery: (value: string) => void;
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-stone-950/40 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="swap-sheet-title"
    >
      <div
        className="flex max-h-[82dvh] w-full max-w-lg flex-col rounded-t-3xl border-t border-stone-200 bg-[#FAF9F5] pt-3 pb-[env(safe-area-inset-bottom)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-300" />
        <div className="flex items-center justify-between px-5 pb-3">
          <div className="min-w-0">
            <p className="text-xs text-stone-500">Replacing {exerciseName}</p>
            <h2 id="swap-sheet-title" className="font-display text-lg font-bold text-stone-900">
              Choose replacement
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close swap sheet"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-stone-500 hover:bg-stone-200/70 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 pb-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search eligible movements..."
              className="min-h-[44px] w-full rounded-xl border border-stone-200 bg-white pr-4 pl-10 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </label>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {candidates.length === 0 ? (
            <div className="rounded-xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">
              No unused eligible movements match “{query}”.
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white p-2.5 text-left transition-colors hover:border-amber-500 hover:bg-amber-50/30 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  <ExerciseThumb
                    exercise={{ name: item.name, pose: item.pose, clipUrl: item.clipUrl }}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-stone-900">
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-stone-500">
                      {item.difficulty} · {EQUIPMENT_LABEL[item.equipment]} ·{" "}
                      {item.effort === "hold" ? "Hold" : "Reps"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExerciseThumb({
  exercise,
  size,
}: {
  exercise: { exerciseId?: string; name: string; pose: string; clipUrl: string };
  size: "sm" | "md";
}) {
  const dimensions = size === "sm" ? "h-16 w-20" : "h-28 w-32";
  const clipUrl = currentClip(exercise);
  if (clipUrl) {
    return (
      <img
        src={clipSrc(clipUrl)}
        alt=""
        className={`${dimensions} shrink-0 rounded-xl bg-[#F4F1EA] object-contain`}
      />
    );
  }
  return <ExerciseFigure pose={exercise.pose} className={`${dimensions} shrink-0`} />;
}

function currentClip(exercise: { exerciseId?: string; clipUrl: string }): string {
  if (!exercise.exerciseId) {
    return exercise.clipUrl;
  }
  return CATALOG.find((item) => item.id === exercise.exerciseId)?.clipUrl || exercise.clipUrl;
}

function clipSrc(clipUrl: string): string {
  return `${import.meta.env.BASE_URL}${clipUrl}`;
}

function volumeLabel(exercise: PlannedExercise): string {
  if (exercise.holdSeconds) {
    return `${exercise.sets} × ${exercise.holdSeconds}s`;
  }
  return `${exercise.sets} × ${exercise.reps ?? 0}`;
}

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
