import { describe, expect, it } from "vitest";
import { monthCalendar } from "./calendar";
import type { WeekPlan, WorkoutDay } from "./types";

function day(date: string, weekday: string, muscle: WorkoutDay["muscle"]): WorkoutDay {
  return {
    date,
    weekday,
    muscle,
    coreFinisher: false,
    exercises: [],
  };
}

const plan: WeekPlan = {
  weekStart: "2026-11-16",
  difficulty: "beginner",
  trainingDays: 4,
  equipment: ["floor"],
  days: [
    day("2026-11-16", "Monday", "push"),
    day("2026-11-17", "Tuesday", "pull"),
    day("2026-11-19", "Thursday", "legs"),
    day("2026-11-20", "Friday", "core"),
  ],
};

describe("monthCalendar", () => {
  it("builds a Monday-first November 2026 grid", () => {
    const calendar = monthCalendar(plan);
    expect(calendar.monthLabel).toBe("November 2026");
    expect(calendar.weeks.length).toBeGreaterThanOrEqual(5);
    expect(calendar.weeks[0]).toHaveLength(7);
    expect(calendar.weeks[0]?.[0]?.date).toBe("2026-10-26");
  });

  it("marks planned workouts and off days in the current week", () => {
    const cells = monthCalendar(plan).weeks.flat();
    const monday = cells.find((cell) => cell.date === "2026-11-16");
    const wednesday = cells.find((cell) => cell.date === "2026-11-18");
    const friday = cells.find((cell) => cell.date === "2026-11-20");
    const sunday = cells.find((cell) => cell.date === "2026-11-22");

    expect(monday).toMatchObject({ kind: "workout", muscle: "push", inPlanWeek: true });
    expect(wednesday).toMatchObject({ kind: "off", inPlanWeek: true });
    expect(friday).toMatchObject({ kind: "workout", muscle: "core", inPlanWeek: true });
    expect(sunday).toMatchObject({ kind: "off", inPlanWeek: true });
  });

  it("leaves days outside the plan week empty, not off", () => {
    const cells = monthCalendar(plan).weeks.flat();
    const first = cells.find((cell) => cell.date === "2026-11-01");
    expect(first).toMatchObject({ kind: "outside", inPlanWeek: false });
  });

  it("flags today when it falls in the grid", () => {
    const cells = monthCalendar(plan, "2026-11-18").weeks.flat();
    expect(cells.find((cell) => cell.date === "2026-11-18")?.isToday).toBe(true);
    expect(cells.find((cell) => cell.date === "2026-11-16")?.isToday).toBe(false);
  });

  it("keeps previous-week workouts on the month after a new week is generated", () => {
    const previous: WeekPlan = {
      weekStart: "2026-11-09",
      difficulty: "beginner",
      trainingDays: 3,
      equipment: ["floor"],
      days: [day("2026-11-09", "Monday", "push"), day("2026-11-11", "Wednesday", "pull")],
    };
    const cells = monthCalendar(plan, "2026-11-18", [previous]).weeks.flat();
    expect(cells.find((cell) => cell.date === "2026-11-09")).toMatchObject({
      kind: "workout",
      muscle: "push",
      inPlanWeek: false,
    });
    expect(cells.find((cell) => cell.date === "2026-11-16")).toMatchObject({
      kind: "workout",
      muscle: "push",
      inPlanWeek: true,
    });
  });
});
