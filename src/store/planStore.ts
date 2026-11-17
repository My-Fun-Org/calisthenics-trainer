import { create } from "zustand";
import { addWorkoutOnDate, generateWeekPlan, mondayOf } from "@/domain/generateWeekPlan";
import {
  advanceOrReplaceWeek,
  findCoveringPlan,
  findDay,
  findPlan,
  replacePlan,
} from "@/domain/planHistory";
import { canToggleSet } from "@/domain/sets";
import { swapExercise } from "@/domain/swapExercise";
import { trainingWeekNumber } from "@/domain/progression";
import type { DayFocus, WeekPlan, WorkoutDay } from "@/domain/types";
import { loadProgress, saveProgress } from "@/infrastructure/browserProgress";
import { EMPTY_STATE, loadState, type PersistedState, type SetupSettings } from "@/infrastructure/storage";

interface PlanStore extends PersistedState {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  startWeek: (settings: SetupSettings, weekStart?: string) => void;
  saveSettings: (settings: SetupSettings) => void;
  regenerateWeek: () => void;
  addWorkout: (date: string, focus: DayFocus) => boolean;
  completeSet: (date: string, exerciseId: string, setIndex: number) => void;
  completeWorkout: (date: string) => void;
  swap: (date: string, exerciseId: string, replacementId: string) => boolean;
  resetSession: () => void;
}

export function setKey(date: string, exerciseId: string): string {
  return `${date}::${exerciseId}`;
}

let hydration: Promise<void> | null = null;

export const usePlanStore = create<PlanStore>((set, get) => {
  const persist = (state: PersistedState): void => {
    set({ ...state, hydrated: true });
    void saveProgress(state);
  };

  return {
    ...EMPTY_STATE,
    hydrated: false,
    hydrate: () => {
      hydration ??= loadProgress()
        .then((state) => {
          set({ ...state, hydrated: true });
        })
        .catch(() => {
          set({ ...loadState(), hydrated: true });
        });
      return hydration;
    },

    startWeek: (settings, weekStart = mondayOf(new Date())) => {
      const { currentPlan, history, completedSets, completedWorkouts, settings: previous, programStart } = get();
      const nextStart = resolveProgramStart(programStart, previous, settings, currentPlan, history, weekStart);
      const nextPlan = generateWeekPlan({ ...settings, weekStart, programStart: nextStart });
      if (!currentPlan) {
        persist({
          ...get(),
          currentPlan: nextPlan,
          settings,
          programStart: nextStart,
          completedSets: {},
          completedWorkouts: [],
        });
        return;
      }
      persist({
        ...get(),
        settings,
        programStart: nextStart,
        ...advanceOrReplaceWeek({
          currentPlan,
          history,
          completedSets,
          completedWorkouts,
          nextPlan,
        }),
      });
    },

    saveSettings: (settings) => {
      persist({
        ...get(),
        settings,
      });
    },

    regenerateWeek: () => {
      const { settings, currentPlan, history, completedSets, completedWorkouts, programStart } = get();
      if (!settings) {
        return;
      }
      const weekStart = mondayOf(new Date());
      const nextStart = resolveProgramStart(programStart, settings, settings, currentPlan, history, weekStart);
      const nextPlan = generateWeekPlan({
        ...settings,
        weekStart,
        programStart: nextStart,
      });
      if (!currentPlan) {
        persist({ ...get(), currentPlan: nextPlan, programStart: nextStart });
        return;
      }
      persist({
        ...get(),
        programStart: nextStart,
        ...advanceOrReplaceWeek({
          currentPlan,
          history,
          completedSets,
          completedWorkouts,
          nextPlan,
        }),
      });
    },

    addWorkout: (date, focus) => {
      const { currentPlan, history } = get();
      const owner = findCoveringPlan(currentPlan, history, date);
      if (!owner) {
        return false;
      }
      const next = addWorkoutOnDate(owner, date, focus);
      if (!next) {
        return false;
      }
      persist({
        ...get(),
        ...replacePlan(currentPlan, history, next),
      });
      return true;
    },

    completeSet: (date, exerciseId, setIndex) => {
      const { currentPlan, history } = get();
      const day = findDay(currentPlan, history, date);
      const exercise = day?.exercises.find((item) => item.exerciseId === exerciseId);
      if (!day || !exercise) {
        return;
      }
      const key = setKey(date, exerciseId);
      const current = get().completedSets[key] ?? Array.from({ length: exercise.sets }, () => false);
      if (!canToggleSet(current, setIndex)) {
        return;
      }
      const nextSets = current.map((done, index) => (index === setIndex ? !done : done));
      const completedSets = { ...get().completedSets, [key]: nextSets };
      const dayComplete = isDayComplete(day, completedSets);
      const completedWorkouts = dayComplete
        ? Array.from(new Set([...get().completedWorkouts, date]))
        : get().completedWorkouts.filter((item) => item !== date);
      persist({ ...get(), completedSets, completedWorkouts });
    },

    completeWorkout: (date) => {
      const { currentPlan, history } = get();
      const day = findDay(currentPlan, history, date);
      if (!day) {
        return;
      }
      const completedSets = { ...get().completedSets };
      for (const exercise of day.exercises) {
        completedSets[setKey(date, exercise.exerciseId)] = Array.from(
          { length: exercise.sets },
          () => true,
        );
      }
      persist({
        ...get(),
        completedSets,
        completedWorkouts: Array.from(new Set([...get().completedWorkouts, date])),
      });
    },

    swap: (date, exerciseId, replacementId) => {
      const { currentPlan, history, completedSets } = get();
      const owner = findPlan(currentPlan, history, date);
      if (!owner) {
        return false;
      }
      const next = swapExercise(owner, exerciseId, replacementId);
      if (!next) {
        return false;
      }
      const nextSets = { ...completedSets };
      for (const key of Object.keys(nextSets)) {
        if (key.startsWith(`${date}::`) && key.endsWith(`::${exerciseId}`)) {
          delete nextSets[key];
        }
      }
      persist({
        ...get(),
        ...replacePlan(currentPlan, history, next),
        completedSets: nextSets,
      });
      return true;
    },

    resetSession: () => {
      persist({ ...EMPTY_STATE });
    },
  };
});

function resolveProgramStart(
  stored: string | null,
  previous: SetupSettings | null,
  next: SetupSettings,
  currentPlan: WeekPlan | null,
  history: WeekPlan[],
  weekStart: string,
): string {
  if (previous && previous.difficulty !== next.difficulty) {
    return weekStart;
  }
  if (stored) {
    return stored;
  }
  const known = [currentPlan?.weekStart, ...history.map((plan) => plan.weekStart)].filter(
    (date): date is string => Boolean(date),
  );
  known.sort();
  const earliest = known[0];
  if (!earliest) {
    return weekStart;
  }
  return trainingWeekNumber(earliest, weekStart) >= 1 ? earliest : weekStart;
}

function isDayComplete(
  day: WorkoutDay,
  completedSets: Record<string, boolean[]>,
): boolean {
  return day.exercises.every((exercise) => {
    const sets = completedSets[setKey(day.date, exercise.exerciseId)];
    return Boolean(sets && sets.length === exercise.sets && sets.every(Boolean));
  });
}
