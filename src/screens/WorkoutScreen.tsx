import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { ExerciseFigure } from "@/diagrams/ExerciseFigure";
import { RestTimer } from "@/components/RestTimer";
import { CATALOG } from "@/domain/catalog";
import { findDay, findPlan } from "@/domain/planHistory";
import { restSecondsFor, tickRest } from "@/domain/rest";
import { swapCandidates } from "@/domain/swapExercise";
import { FOCUS_LABEL, type PlannedExercise } from "@/domain/types";
import { setKey, usePlanStore } from "@/store/planStore";

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
  if (!day) {
    return <Navigate to="/week" replace />;
  }

  const done = completedWorkouts.includes(day.date);

  return (
    <AppShell>
      <header className="mb-5 flex items-center justify-between gap-3">
        <Link to="/week" className="btn-ghost px-3 py-2 text-sm">
          Calendar
        </Link>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ember-deep">
            {day.weekday}
          </p>
          <h1 className="text-xl font-bold text-stone-900">{FOCUS_LABEL[day.muscle]}</h1>
        </div>
      </header>

      <div className={`flex flex-col gap-4 ${restRemaining !== null ? "pb-28" : ""}`}>
        {day.exercises.map((exercise) => {
          const sets = completedSets[setKey(day.date, exercise.exerciseId)] ??
            Array.from({ length: exercise.sets }, () => false);
          const canSwap = owningPlan
            ? swapCandidates(owningPlan, exercise.exerciseId, CATALOG).length > 0
            : false;
          return (
            <article key={exercise.exerciseId} className="card-surface overflow-hidden">
              <div className="flex gap-3 p-3">
                <ExerciseFigure pose={exercise.pose} className="h-24 w-24 shrink-0" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold leading-tight text-stone-900">{exercise.name}</h2>
                  <p className="mt-1 text-sm font-medium text-ember-deep">{volumeLabel(exercise)}</p>
                  <p className="mt-2 text-sm text-stone-600">{exercise.cues}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 px-3 pb-3">
                {sets.map((isDone, index) => (
                  <button
                    key={`${exercise.exerciseId}-set-${index}`}
                    type="button"
                    onClick={() => {
                      completeSet(day.date, exercise.exerciseId, index);
                      if (isDone) {
                        setRestRemaining(null);
                        return;
                      }
                      setRestRemaining(
                        restSecondsFor(owningPlan?.difficulty ?? plan.difficulty, settings?.restSeconds),
                      );
                    }}
                    className={`min-h-12 min-w-12 rounded-xl text-sm font-semibold ${
                      isDone ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-800"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={!canSwap}
                  onClick={() => {
                    setQuery("");
                    setSwappingId(exercise.exerciseId);
                  }}
                  className="btn-ghost ml-auto min-h-12 px-3 text-sm"
                >
                  Swap
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <button
        type="button"
        className="btn-success mt-6 w-full"
        onClick={() => completeWorkout(day.date)}
      >
        {done ? "Workout complete" : "Mark workout done"}
      </button>

      {swappingId ? (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 p-4">
          <div className="card-surface max-h-[80vh] w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-4">
              <h2 className="text-lg font-semibold text-stone-900">Swap exercise</h2>
              <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={() => setSwappingId(null)}>
                Close
              </button>
            </div>
            <div className="px-4 pb-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the catalog"
                className="min-h-12 w-full rounded-xl bg-stone-50 px-3 text-stone-900 ring-1 ring-stone-200 outline-none"
              />
            </div>
            <ul className="max-h-[50vh] overflow-y-auto px-4 pb-4">
              {candidates.length === 0 ? (
                <li className="py-6 text-center text-stone-500">No other movements fit this slot.</li>
              ) : (
                candidates.map((exercise) => (
                  <li key={exercise.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 border-t border-stone-100 py-3 text-left"
                      onClick={() => {
                        swap(day.date, swappingId, exercise.id);
                        setSwappingId(null);
                      }}
                    >
                      <ExerciseFigure pose={exercise.pose} className="h-14 w-14 shrink-0" />
                      <span>
                        <span className="block font-semibold text-stone-900">{exercise.name}</span>
                        <span className="text-sm capitalize text-stone-500">
                          {exercise.difficulty} · {exercise.family.replace("-", " ")}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {restRemaining !== null ? (
        <RestTimer remaining={restRemaining} onSkip={() => setRestRemaining(null)} />
      ) : null}
    </AppShell>
  );
}

function volumeLabel(exercise: PlannedExercise): string {
  if (exercise.holdSeconds) {
    return `${exercise.sets} × ${exercise.holdSeconds}s`;
  }
  return `${exercise.sets} × ${exercise.reps ?? 0}`;
}
