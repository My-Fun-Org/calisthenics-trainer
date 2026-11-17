import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { addWorkoutOnDate, canAddWorkoutOnDate, generateWeekPlan } from "./generateWeekPlan";
import { EQUIPMENT, type DayFocus, type Equipment, type TrainingDays } from "./types";

const ALL_GEAR: Equipment[] = [...EQUIPMENT];
const WEEK_START = "2026-11-16";

const baseInput = {
  weekStart: WEEK_START,
  difficulty: "intermediate" as const,
  trainingDays: 4 as TrainingDays,
  equipment: ALL_GEAR,
};

function musclesOf(days: ReturnType<typeof generateWeekPlan>["days"]): DayFocus[] {
  return days.map((day) => day.muscle);
}

function addUtcDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function longestStreak(dates: string[]): number {
  const set = new Set(dates);
  let longest = 0;
  for (const date of dates) {
    if (set.has(addUtcDays(date, -1))) {
      continue;
    }
    let length = 1;
    while (set.has(addUtcDays(date, length))) {
      length += 1;
    }
    longest = Math.max(longest, length);
  }
  return longest;
}

describe("generateWeekPlan", () => {
  it("places a 3-day week as two days on, a rest, then Thursday", () => {
    const plan = generateWeekPlan({ ...baseInput, trainingDays: 3 });
    expect(plan.days.map((day) => day.date)).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-19",
    ]);
    expect(musclesOf(plan.days)).toEqual(["push", "pull", "legs"]);
    for (const day of plan.days) {
      expect(day.exercises.some((exercise) => exercise.muscle === "core")).toBe(true);
    }
  });

  it("places a 4-day week as push, pull, legs, core", () => {
    const plan = generateWeekPlan({ ...baseInput, trainingDays: 4 });
    expect(plan.days.map((day) => day.date)).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-19",
      "2026-11-20",
    ]);
    expect(musclesOf(plan.days)).toEqual(["push", "pull", "legs", "core"]);
  });

  it("places a 5-day week as three days, a rest, then two more", () => {
    const plan = generateWeekPlan({ ...baseInput, trainingDays: 5 });
    expect(plan.days.map((day) => day.date)).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-20",
      "2026-11-21",
    ]);
    expect(musclesOf(plan.days)).toEqual(["push", "pull", "legs", "core", "push"]);
  });

  it("places a 6-day week as three days, a rest, then three more", () => {
    const plan = generateWeekPlan({ ...baseInput, trainingDays: 6 });
    expect(plan.days.map((day) => day.date)).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ]);
    expect(musclesOf(plan.days)).toEqual(["push", "pull", "legs", "push", "pull", "legs"]);
    for (const day of plan.days) {
      expect(day.exercises.some((exercise) => exercise.muscle === "core")).toBe(true);
    }
  });

  it("never trains more than three calendar days in a row", () => {
    for (const trainingDays of [3, 4, 5, 6] as const) {
      const plan = generateWeekPlan({ ...baseInput, trainingDays });
      expect(longestStreak(plan.days.map((day) => day.date))).toBeLessThanOrEqual(3);
    }
  });

  it("never puts the same primary muscle on two consecutive training days", () => {
    for (const trainingDays of [3, 4, 5, 6] as const) {
      const plan = generateWeekPlan({ ...baseInput, trainingDays });
      const muscles = musclesOf(plan.days);
      for (let index = 1; index < muscles.length; index += 1) {
        expect(muscles[index]).not.toBe(muscles[index - 1]);
      }
    }
  });

  it("never repeats an exercise in the same week", () => {
    const plan = generateWeekPlan({ ...baseInput, trainingDays: 6 });
    const ids = plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("picks four main exercises from different families when the pool allows", () => {
    const plan = generateWeekPlan(baseInput);
    const pushDay = plan.days[0];
    const main = pushDay.exercises.filter((exercise) => exercise.muscle === "push");
    expect(main.length).toBe(4);
    expect(new Set(main.map((exercise) => exercise.family)).size).toBe(main.length);
  });

  it("keeps every exercise inside owned equipment", () => {
    const plan = generateWeekPlan({
      ...baseInput,
      equipment: ["floor"],
      trainingDays: 6,
    });
    for (const day of plan.days) {
      for (const planned of day.exercises) {
        const catalogEntry = CATALOG.find((exercise) => exercise.id === planned.exerciseId);
        expect(catalogEntry?.equipment).toBe("floor");
      }
    }
  });

  it("does not invent a bar movement when no pull-up bar is owned", () => {
    const plan = generateWeekPlan({
      ...baseInput,
      equipment: ["floor", "wall"],
      trainingDays: 3,
    });
    const pullDay = plan.days.find((day) => day.muscle === "pull");
    expect(pullDay).toBeDefined();
    for (const planned of pullDay!.exercises) {
      const catalogEntry = CATALOG.find((exercise) => exercise.id === planned.exerciseId);
      expect(catalogEntry?.equipment).not.toBe("pull-up-bar");
      expect(catalogEntry?.equipment).not.toBe("rings");
      expect(catalogEntry?.equipment).not.toBe("dip-bars");
    }
  });

  it("uses beginner volume unless the exercise overrides it", () => {
    const plan = generateWeekPlan({ ...baseInput, difficulty: "beginner" });
    for (const day of plan.days) {
      for (const planned of day.exercises) {
        const catalogEntry = CATALOG.find((exercise) => exercise.id === planned.exerciseId);
        expect(catalogEntry).toBeDefined();
        if (catalogEntry?.prescription) {
          expect(planned.sets).toBe(catalogEntry.prescription.sets);
          continue;
        }
        expect(planned.sets).toBe(3);
        if (catalogEntry?.effort === "hold") {
          expect(planned.holdSeconds).toBe(20);
        } else {
          expect(planned.reps).toBe(8);
        }
      }
    }
  });

  it("returns the same week for the same inputs", () => {
    const first = generateWeekPlan(baseInput);
    const second = generateWeekPlan(baseInput);
    expect(second).toEqual(first);
  });

  it("changes the week when the week start changes", () => {
    const thisWeek = generateWeekPlan(baseInput);
    const nextWeek = generateWeekPlan({ ...baseInput, weekStart: "2026-11-23" });
    const thisIds = thisWeek.days.flatMap((day) =>
      day.exercises.map((exercise) => exercise.exerciseId),
    );
    const nextIds = nextWeek.days.flatMap((day) =>
      day.exercises.map((exercise) => exercise.exerciseId),
    );
    expect(nextIds).not.toEqual(thisIds);
  });
});

describe("addWorkoutOnDate", () => {
  it("adds a training day on a weekday that was off", () => {
    const plan = generateWeekPlan(baseInput);
    expect(plan.days.map((day) => day.date)).not.toContain("2026-11-18");

    const next = addWorkoutOnDate(plan, "2026-11-18", "core");
    expect(next).not.toBeNull();
    expect(next?.days.map((day) => day.date)).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
    ]);
    const added = next?.days.find((day) => day.date === "2026-11-18");
    expect(added?.weekday).toBe("Wednesday");
    expect(added?.muscle).toBe("core");
    expect(added?.exercises.length).toBeGreaterThanOrEqual(4);
  });

  it("builds the requested focus, including a mixed full-body day", () => {
    const plan = generateWeekPlan(baseInput);
    const back = addWorkoutOnDate(plan, "2026-11-18", "pull");
    const backDay = back?.days.find((day) => day.date === "2026-11-18");
    expect(backDay?.muscle).toBe("pull");
    expect(backDay?.exercises.every((exercise) => exercise.muscle === "pull")).toBe(true);

    const full = addWorkoutOnDate(plan, "2026-11-18", "full");
    const fullDay = full?.days.find((day) => day.date === "2026-11-18");
    expect(fullDay?.muscle).toBe("full");
    expect(new Set(fullDay?.exercises.map((exercise) => exercise.muscle)).size).toBeGreaterThanOrEqual(3);
  });

  it("does not reuse an exercise already in the week", () => {
    const plan = generateWeekPlan(baseInput);
    const next = addWorkoutOnDate(plan, "2026-11-18", "push");
    const ids = next?.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId)) ?? [];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leaves an existing workout day unchanged", () => {
    const plan = generateWeekPlan(baseInput);
    const next = addWorkoutOnDate(plan, "2026-11-16", "legs");
    expect(next).toEqual(plan);
  });

  it("adds a workout on a weekend off day", () => {
    const plan = generateWeekPlan(baseInput);
    const saturday = addWorkoutOnDate(plan, "2026-11-21", "push");
    const sunday = addWorkoutOnDate(plan, "2026-11-22", "legs");
    expect(saturday?.days.find((day) => day.date === "2026-11-21")).toMatchObject({
      weekday: "Saturday",
      muscle: "push",
    });
    expect(sunday?.days.find((day) => day.date === "2026-11-22")).toMatchObject({
      weekday: "Sunday",
      muscle: "legs",
    });
  });

  it("does not add a workout outside the plan week", () => {
    const plan = generateWeekPlan(baseInput);
    expect(addWorkoutOnDate(plan, "2026-11-11", "push")).toBeNull();
  });
});

describe("canAddWorkoutOnDate", () => {
  it("is true for any off day in the plan week, including weekends", () => {
    const plan = generateWeekPlan(baseInput);
    expect(canAddWorkoutOnDate(plan, "2026-11-18")).toBe(true);
    expect(canAddWorkoutOnDate(plan, "2026-11-16")).toBe(false);
    expect(canAddWorkoutOnDate(plan, "2026-11-21")).toBe(true);
    expect(canAddWorkoutOnDate(plan, "2026-11-22")).toBe(true);
    expect(canAddWorkoutOnDate(plan, "2026-11-11")).toBe(false);
  });
});
