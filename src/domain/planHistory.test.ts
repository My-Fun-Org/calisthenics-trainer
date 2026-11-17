import { describe, expect, it } from "vitest";
import { advanceOrReplaceWeek, findCoveringPlan } from "./planHistory";
import type { WeekPlan, WorkoutDay } from "./types";

function plan(weekStart: string, dates: string[]): WeekPlan {
  return {
    weekStart,
    difficulty: "beginner",
    trainingDays: 3,
    equipment: ["floor"],
    days: dates.map(
      (date): WorkoutDay => ({
        date,
        weekday: "Monday",
        muscle: "push",
        coreFinisher: false,
        exercises: [{ exerciseId: "push-up", name: "Push-Up", muscle: "push", family: "horizontal-push", pose: "push-up", cues: "", clipUrl: "", sets: 3, reps: 8 }],
      }),
    ),
  };
}

describe("advanceOrReplaceWeek", () => {
  it("keeps the previous week in history when a new week starts", () => {
    const previous = plan("2026-11-09", ["2026-11-09", "2026-11-11"]);
    const next = plan("2026-11-16", ["2026-11-16"]);
    const result = advanceOrReplaceWeek({
      currentPlan: previous,
      history: [],
      completedSets: { "2026-11-09::push-up": [true, true, true] },
      completedWorkouts: ["2026-11-09"],
      nextPlan: next,
    });

    expect(result.currentPlan.weekStart).toBe("2026-11-16");
    expect(result.history).toEqual([previous]);
    expect(result.completedWorkouts).toEqual(["2026-11-09"]);
    expect(result.completedSets["2026-11-09::push-up"]).toEqual([true, true, true]);
  });

  it("archives a previous week even if nothing was completed", () => {
    const previous = plan("2026-11-09", ["2026-11-09"]);
    const result = advanceOrReplaceWeek({
      currentPlan: previous,
      history: [],
      completedSets: {},
      completedWorkouts: [],
      nextPlan: plan("2026-11-16", ["2026-11-16"]),
    });

    expect(result.history[0]?.weekStart).toBe("2026-11-09");
  });

  it("replaces the same week without duplicating history and clears only that week's completions", () => {
    const current = plan("2026-11-16", ["2026-11-16"]);
    const replacement = plan("2026-11-16", ["2026-11-18"]);
    const result = advanceOrReplaceWeek({
      currentPlan: current,
      history: [plan("2026-11-09", ["2026-11-09"])],
      completedSets: {
        "2026-11-09::push-up": [true],
        "2026-11-16::push-up": [true, true, true],
      },
      completedWorkouts: ["2026-11-09", "2026-11-16"],
      nextPlan: replacement,
    });

    expect(result.history).toHaveLength(1);
    expect(result.history[0]?.weekStart).toBe("2026-11-09");
    expect(result.currentPlan.days[0]?.date).toBe("2026-11-18");
    expect(result.completedWorkouts).toEqual(["2026-11-09"]);
    expect(result.completedSets["2026-11-09::push-up"]).toEqual([true]);
    expect(result.completedSets["2026-11-16::push-up"]).toBeUndefined();
  });
});

describe("findCoveringPlan", () => {
  it("finds the week that contains an off date, even with no workout that day", () => {
    const current = plan("2026-11-16", ["2026-11-16", "2026-11-17"]);
    const historic = plan("2026-11-09", ["2026-11-09"]);
    expect(findCoveringPlan(current, [historic], "2026-11-18")?.weekStart).toBe("2026-11-16");
    expect(findCoveringPlan(current, [historic], "2026-11-12")?.weekStart).toBe("2026-11-09");
    expect(findCoveringPlan(current, [historic], "2026-11-01")).toBeUndefined();
  });
});
