import { create } from "zustand";
import { addWorkoutOnDate, generateWeekPlan, mondayOf } from "@/domain/generateWeekPlan";
import {
  advanceOrReplaceWeek,
  findCoveringPlan,
  findDay,
  findPlan,
  replacePlan,
} from "@/domain/planHistory";
import { swapExercise } from "@/domain/swapExercise";
import type { DayFocus, WorkoutDay } from "@/domain/types";
import {
  EMPTY_STATE,
  loadState,
  saveState,
  type PersistedState,
  type SetupSettings,
} from "@/infrastructure/storage";

interface PlanStore extends PersistedState {
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

const initial = loadState();

export const usePlanStore = create<PlanStore>((set, get) => {
  const persist = (state: PersistedState): void => {
    saveState(state);
    set(state);
  };

  return {
    ...initial,

    startWeek: (settings, weekStart = mondayOf(new Date())) => {
      const nextPlan = generateWeekPlan({ ...settings, weekStart });
      const { currentPlan, history, completedSets, completedWorkouts } = get();
      if (!currentPlan) {
        persist({
          ...get(),
          currentPlan: nextPlan,
          settings,
          completedSets: {},
          completedWorkouts: [],
        });
        return;
      }
      persist({
        ...get(),
        settings,
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
      const { settings, currentPlan, history, completedSets, completedWorkouts } = get();
      if (!settings) {
        return;
      }
      const nextPlan = generateWeekPlan({
        ...settings,
        weekStart: mondayOf(new Date()),
      });
      if (!currentPlan) {
        persist({ ...get(), currentPlan: nextPlan });
        return;
      }
      persist({
        ...get(),
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

function isDayComplete(
  day: WorkoutDay,
  completedSets: Record<string, boolean[]>,
): boolean {
  return day.exercises.every((exercise) => {
    const sets = completedSets[setKey(day.date, exercise.exerciseId)];
    return Boolean(sets && sets.length === exercise.sets && sets.every(Boolean));
  });
}
