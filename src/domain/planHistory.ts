import type { WeekPlan, WorkoutDay } from "./types";

export interface WeekRoll {
  currentPlan: WeekPlan;
  history: WeekPlan[];
  completedSets: Record<string, boolean[]>;
  completedWorkouts: string[];
  nextPlan: WeekPlan;
}

export interface RolledWeek {
  currentPlan: WeekPlan;
  history: WeekPlan[];
  completedSets: Record<string, boolean[]>;
  completedWorkouts: string[];
}

export function advanceOrReplaceWeek(input: WeekRoll): RolledWeek {
  if (input.currentPlan.weekStart === input.nextPlan.weekStart) {
    return {
      currentPlan: input.nextPlan,
      history: input.history.filter((plan) => plan.weekStart !== input.nextPlan.weekStart),
      completedSets: dropWeekKeys(input.completedSets, input.nextPlan.weekStart),
      completedWorkouts: input.completedWorkouts.filter(
        (date) => !inWeek(date, input.nextPlan.weekStart),
      ),
    };
  }

  return {
    currentPlan: input.nextPlan,
    history: archivePlan(input.history, input.currentPlan),
    completedSets: input.completedSets,
    completedWorkouts: input.completedWorkouts,
  };
}

export function archivePlan(history: readonly WeekPlan[], plan: WeekPlan): WeekPlan[] {
  return [...history.filter((item) => item.weekStart !== plan.weekStart), plan];
}

export function findDay(
  currentPlan: WeekPlan | null,
  history: readonly WeekPlan[],
  date: string,
): WorkoutDay | undefined {
  return plansForLookup(currentPlan, history)
    .flatMap((plan) => plan.days)
    .find((day) => day.date === date);
}

export function findPlan(
  currentPlan: WeekPlan | null,
  history: readonly WeekPlan[],
  date: string,
): WeekPlan | undefined {
  return plansForLookup(currentPlan, history).find((plan) =>
    plan.days.some((day) => day.date === date),
  );
}

export function findCoveringPlan(
  currentPlan: WeekPlan | null,
  history: readonly WeekPlan[],
  date: string,
): WeekPlan | undefined {
  return plansForLookup(currentPlan, history).find((plan) => inWeek(date, plan.weekStart));
}

export function replacePlan(
  currentPlan: WeekPlan | null,
  history: readonly WeekPlan[],
  next: WeekPlan,
): { currentPlan: WeekPlan | null; history: WeekPlan[] } {
  if (currentPlan?.weekStart === next.weekStart) {
    return { currentPlan: next, history: [...history] };
  }
  return {
    currentPlan,
    history: archivePlan(history, next),
  };
}

function plansForLookup(
  currentPlan: WeekPlan | null,
  history: readonly WeekPlan[],
): WeekPlan[] {
  return currentPlan ? [currentPlan, ...history] : [...history];
}

function dropWeekKeys(
  completedSets: Record<string, boolean[]>,
  weekStart: string,
): Record<string, boolean[]> {
  const next: Record<string, boolean[]> = {};
  for (const [key, value] of Object.entries(completedSets)) {
    const date = key.split("::")[0];
    if (date && !inWeek(date, weekStart)) {
      next[key] = value;
    }
  }
  return next;
}

function inWeek(date: string, weekStart: string): boolean {
  return date >= weekStart && date <= addUtcDays(weekStart, 6);
}

function addUtcDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
