import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { generateWeekPlan } from "./generateWeekPlan";
import { swapCandidates, swapExercise } from "./swapExercise";
import { EQUIPMENT, type Equipment } from "./types";

const ALL_GEAR: Equipment[] = [...EQUIPMENT];

const plan = generateWeekPlan({
  weekStart: "2026-11-16",
  difficulty: "intermediate",
  trainingDays: 4,
  equipment: ALL_GEAR,
});

describe("swapExercise", () => {
  it("offers replacements on the same muscle, owned gear, and unused this week", () => {
    const current = plan.days[0].exercises[0];
    const used = new Set(
      plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId)),
    );
    const candidates = swapCandidates(plan, current.exerciseId, CATALOG);

    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      expect(candidate.id).not.toBe(current.exerciseId);
      expect(candidate.muscle).toBe(current.muscle);
      expect(used.has(candidate.id)).toBe(false);
      expect(ALL_GEAR).toContain(candidate.equipment);
      expect(["beginner", "intermediate"]).toContain(candidate.difficulty);
    }
  });

  it("replaces the exercise in place and leaves the rest of the week intact", () => {
    const current = plan.days[0].exercises[0];
    const [replacement] = swapCandidates(plan, current.exerciseId, CATALOG);
    expect(replacement).toBeDefined();

    const swapped = swapExercise(plan, current.exerciseId, replacement.id, CATALOG);
    expect(swapped).not.toBeNull();
    expect(swapped!.days[0].exercises[0].exerciseId).toBe(replacement.id);
    expect(swapped!.days[0].exercises[0].name).toBe(replacement.name);

    const otherIds = swapped!.days
      .flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId))
      .filter((id) => id !== replacement.id);
    const originalOther = plan.days
      .flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId))
      .filter((id) => id !== current.exerciseId);
    expect(otherIds).toEqual(originalOther);
  });

  it("rejects a replacement that is already in the week", () => {
    const first = plan.days[0].exercises[0];
    const second = plan.days[0].exercises[1];
    expect(swapExercise(plan, first.exerciseId, second.exerciseId, CATALOG)).toBeNull();
  });
});
