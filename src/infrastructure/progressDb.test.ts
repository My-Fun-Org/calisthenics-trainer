import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Database, SqlJsStatic } from "sql.js";
import { readProgress, writeProgress } from "./progressDb";
import type { PersistedState } from "./storage";
import type { WeekPlan } from "../domain/types";

const require = createRequire(import.meta.url);
const initSqlJs = require("sql.js/dist/sql-wasm.js") as (config: {
  wasmBinary: Uint8Array;
}) => Promise<SqlJsStatic>;

const SQL = await initSqlJs({
  wasmBinary: readFileSync(resolve("node_modules/sql.js/dist/sql-wasm.wasm")),
});

function openDatabase(): Database {
  return new SQL.Database();
}

const current: WeekPlan = {
  weekStart: "2026-11-16",
  difficulty: "beginner",
  trainingDays: 4,
  equipment: ["floor", "kettlebell"],
  weekNumber: 1,
  includeStretches: true,
  days: [],
};

const previous: WeekPlan = {
  weekStart: "2026-11-09",
  difficulty: "beginner",
  trainingDays: 4,
  equipment: ["floor"],
  weekNumber: 1,
  days: [],
};

const state: PersistedState = {
  currentPlan: current,
  history: [previous],
  completedSets: { "2026-11-16::push-up": [true, false, false] },
  completedWorkouts: ["2026-11-16"],
  settings: {
    difficulty: "beginner",
    trainingDays: 4,
    equipment: ["floor", "kettlebell", "jump-rope"],
    restSeconds: 60,
    includeStretches: true,
  },
  programStart: "2026-11-16",
};

describe("progress database", () => {
  it("reads an empty database as a blank program", () => {
    const db = openDatabase();
    expect(readProgress(db)).toMatchObject({
      currentPlan: null,
      history: [],
      completedSets: {},
      completedWorkouts: [],
      settings: null,
      programStart: null,
    });
    db.close();
  });

  it("round-trips the program start, weeks, and checked sets", () => {
    const db = openDatabase();
    writeProgress(db, state);
    expect(readProgress(db)).toEqual(state);
    db.close();
  });

  it("replaces the previous snapshot instead of appending weeks", () => {
    const db = openDatabase();
    writeProgress(db, state);
    const next: PersistedState = {
      ...state,
      programStart: "2026-11-23",
      currentPlan: { ...current, weekStart: "2026-11-23", weekNumber: 2 },
      history: [previous, current],
      completedSets: {},
      completedWorkouts: [],
    };
    writeProgress(db, next);
    const stored = readProgress(db);
    expect(stored.programStart).toBe("2026-11-23");
    expect(stored.currentPlan?.weekStart).toBe("2026-11-23");
    expect(stored.history.map((plan) => plan.weekStart)).toEqual(["2026-11-09", "2026-11-16"]);
    expect(stored.completedWorkouts).toEqual([]);
    db.close();
  });
});
