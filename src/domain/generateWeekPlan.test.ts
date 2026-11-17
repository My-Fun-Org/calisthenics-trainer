import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { addWorkoutOnDate, canAddWorkoutOnDate, generateWeekPlan } from "./generateWeekPlan";
import { volumeFor } from "./progression";
import { DIFFICULTY_RANK, EQUIPMENT, type DayFocus, type Difficulty, type Equipment, type TrainingDays, type WeekPlan } from "./types";

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

function sessionLoad(plan: WeekPlan): number {
  return plan.days.reduce(
    (sum, day) =>
      sum +
      day.exercises.reduce(
        (inner, exercise) => inner + exercise.sets * (exercise.reps ?? exercise.holdSeconds ?? 0),
        0,
      ),
    0,
  );
}

function difficultiesOf(plan: WeekPlan, muscle: DayFocus): Difficulty[] {
  const day = plan.days.find((item) => item.muscle === muscle);
  return (day?.exercises ?? [])
    .filter((exercise) => exercise.muscle === muscle)
    .map((exercise) => {
      const entry = CATALOG.find((item) => item.id === exercise.exerciseId);
      if (!entry) {
        throw new Error(`missing catalog exercise ${exercise.exerciseId}`);
      }
      return entry.difficulty;
    });
}

function hardestRank(plan: WeekPlan, muscle: DayFocus): number {
  return Math.max(...difficultiesOf(plan, muscle).map((difficulty) => DIFFICULTY_RANK[difficulty]));
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

  it("never repeats an exercise in the same week, except jump rope on each day", () => {
    const plan = generateWeekPlan({ ...baseInput, trainingDays: 6 });
    const ids = plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId));
    const repeated = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(new Set(repeated)).toEqual(new Set(["jump-rope"]));
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
      expect(catalogEntry?.equipment).not.toBe("kettlebell");
      expect(catalogEntry?.equipment).not.toBe("band");
      expect(catalogEntry?.equipment).not.toBe("jump-rope");
    }
  });

  it("uses week 1 beginner volume unless the exercise overrides it", () => {
    const plan = generateWeekPlan({ ...baseInput, difficulty: "beginner" });
    const volume = volumeFor("beginner", 1);
    for (const day of plan.days) {
      for (const planned of day.exercises) {
        const catalogEntry = CATALOG.find((exercise) => exercise.id === planned.exerciseId);
        expect(catalogEntry).toBeDefined();
        if (catalogEntry?.prescription) {
          expect(planned.sets).toBe(catalogEntry.prescription.sets);
          continue;
        }
        expect(planned.sets).toBe(volume.sets);
        if (catalogEntry?.effort === "hold") {
          expect(planned.holdSeconds).toBe(volume.holdSeconds);
        } else {
          expect(planned.reps).toBe(volume.reps);
        }
      }
    }
  });

  it("makes week 10 harder than week 1, then starts the next block easier", () => {
    const programStart = "2026-09-14";
    const week1 = generateWeekPlan({
      ...baseInput,
      difficulty: "beginner",
      weekStart: programStart,
      programStart,
    });
    const week10 = generateWeekPlan({
      ...baseInput,
      difficulty: "beginner",
      weekStart: "2026-11-16",
      programStart,
    });
    const week11 = generateWeekPlan({
      ...baseInput,
      difficulty: "beginner",
      weekStart: "2026-11-23",
      programStart,
    });

    expect(week1.weekNumber).toBe(1);
    expect(week10.weekNumber).toBe(10);
    expect(week11.weekNumber).toBe(11);
    expect(sessionLoad(week10)).toBeGreaterThan(sessionLoad(week1));
    expect(volumeFor("beginner", week11.weekNumber)).toEqual(volumeFor("beginner", 1));
    expect(hardestRank(week10, "push")).toBeGreaterThan(hardestRank(week1, "push"));
  });

  it("starts an intermediate block on easier variations and finishes on the chosen level", () => {
    const programStart = "2026-09-14";
    const week1 = generateWeekPlan({ ...baseInput, weekStart: programStart, programStart });
    const week10 = generateWeekPlan({
      ...baseInput,
      weekStart: "2026-11-16",
      programStart,
    });

    expect(difficultiesOf(week1, "push").every((difficulty) => difficulty === "beginner")).toBe(true);
    expect(difficultiesOf(week10, "push").every((difficulty) => difficulty === "intermediate")).toBe(
      true,
    );
    expect(sessionLoad(week10)).toBeGreaterThan(sessionLoad(week1));
  });

  it("builds jump rope, a stretch, and a kettlebell swing into each selected session", () => {
    const plan = generateWeekPlan({
      ...baseInput,
      difficulty: "beginner",
      equipment: ["floor", "kettlebell", "jump-rope"],
      includeStretches: true,
    });

    for (const day of plan.days) {
      expect(day.exercises.some((exercise) => exercise.exerciseId === "jump-rope")).toBe(true);
      expect(day.exercises[day.exercises.length - 1]?.muscle).toBe("stretch");
    }
    const legs = plan.days.find((day) => day.muscle === "legs");
    expect(legs?.exercises.some((exercise) => exercise.exerciseId === "kettlebell-swing")).toBe(true);
    const push = plan.days.find((day) => day.muscle === "push");
    expect(
      push?.exercises.some((exercise) => exercise.exerciseId.startsWith("kettlebell-")),
    ).toBe(true);
  });

  it("leaves rope, kettlebell, and stretches out when they are not selected", () => {
    const plan = generateWeekPlan({
      ...baseInput,
      equipment: ["floor", "wall"],
    });
    const ids = plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId));
    expect(ids).not.toContain("jump-rope");
    expect(ids.some((id) => id.startsWith("kettlebell"))).toBe(false);
    expect(plan.days.every((day) => day.exercises.every((exercise) => exercise.muscle !== "stretch"))).toBe(
      true,
    );
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
    expect(
      backDay?.exercises
        .filter((exercise) => exercise.exerciseId !== "jump-rope")
        .every((exercise) => exercise.muscle === "pull"),
    ).toBe(true);

    const full = addWorkoutOnDate(plan, "2026-11-18", "full");
    const fullDay = full?.days.find((day) => day.date === "2026-11-18");
    expect(fullDay?.muscle).toBe("full");
    expect(new Set(fullDay?.exercises.map((exercise) => exercise.muscle)).size).toBeGreaterThanOrEqual(3);
    expect(fullDay?.exercises.every((exercise) => exercise.muscle !== "stretch")).toBe(true);

    const stretch = addWorkoutOnDate(plan, "2026-11-18", "stretch");
    const stretchDay = stretch?.days.find((day) => day.date === "2026-11-18");
    expect(stretchDay?.muscle).toBe("stretch");
    expect(stretchDay?.exercises.length).toBeGreaterThanOrEqual(4);
    expect(
      stretchDay?.exercises
        .filter((exercise) => exercise.exerciseId !== "jump-rope")
        .every((exercise) => exercise.muscle === "stretch"),
    ).toBe(true);
    expect(stretchDay?.exercises.every((exercise) => exercise.clipUrl.length > 0)).toBe(true);
  });

  it("does not reuse an exercise already in the week", () => {
    const plan = generateWeekPlan(baseInput);
    const next = addWorkoutOnDate(plan, "2026-11-18", "push");
    const ids =
      next?.days.flatMap((day) =>
        day.exercises.map((exercise) => exercise.exerciseId).filter((id) => id !== "jump-rope"),
      ) ?? [];
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
