import { CATALOG } from "./catalog";
import { filterPool, ownedEquipment, planExercise } from "./generateWeekPlan";
import type { Exercise, WeekPlan } from "./types";

export function swapCandidates(
  plan: WeekPlan,
  exerciseId: string,
  catalog: readonly Exercise[] = CATALOG,
): Exercise[] {
  const current = findPlanned(plan, exerciseId);
  if (!current) {
    return [];
  }
  const used = usedIds(plan, exerciseId);
  const equipment = ownedEquipment(plan.equipment);
  return filterPool(current.muscle, plan.difficulty, equipment, catalog).filter(
    (exercise) => exercise.id !== exerciseId && !used.has(exercise.id),
  );
}

export function swapExercise(
  plan: WeekPlan,
  exerciseId: string,
  replacementId: string,
  catalog: readonly Exercise[] = CATALOG,
): WeekPlan | null {
  const replacement = swapCandidates(plan, exerciseId, catalog).find(
    (exercise) => exercise.id === replacementId,
  );
  if (!replacement) {
    return null;
  }
  const planned = planExercise(replacement, plan.difficulty);
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((exercise) =>
        exercise.exerciseId === exerciseId ? planned : exercise,
      ),
    })),
  };
}

function findPlanned(plan: WeekPlan, exerciseId: string) {
  for (const day of plan.days) {
    const match = day.exercises.find((exercise) => exercise.exerciseId === exerciseId);
    if (match) {
      return match;
    }
  }
  return undefined;
}

function usedIds(plan: WeekPlan, exceptId: string): Set<string> {
  return new Set(
    plan.days
      .flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId))
      .filter((id) => id !== exceptId),
  );
}
