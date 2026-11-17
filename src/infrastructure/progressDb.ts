import type { WeekPlan } from "../domain/types";
import type { PersistedState, SetupSettings } from "./storage";

export interface ProgressStatement {
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
}

export interface ProgressDatabase {
  run(sql: string, params?: readonly (string | number | null)[]): unknown;
  prepare(sql: string): ProgressStatement;
}

export function ensureSchema(db: ProgressDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS weeks (
      week_start TEXT PRIMARY KEY,
      plan_json TEXT NOT NULL,
      is_current INTEGER NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS completed_sets (
      set_key TEXT PRIMARY KEY,
      sets_json TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS completed_workouts (
      date TEXT PRIMARY KEY
    )
  `);
}

export function readProgress(db: ProgressDatabase): PersistedState {
  ensureSchema(db);
  const meta = Object.fromEntries(query(db, "SELECT key, value FROM meta").map((row) => [text(row.key), text(row.value)]));
  const weeks = query(db, "SELECT plan_json, is_current FROM weeks ORDER BY week_start");
  let currentPlan: WeekPlan | null = null;
  const history: WeekPlan[] = [];
  for (const row of weeks) {
    const plan = parsePlan(row.plan_json);
    if (!plan) {
      continue;
    }
    if (Number(row.is_current) === 1) {
      currentPlan = plan;
    } else {
      history.push(plan);
    }
  }
  const completedSets: Record<string, boolean[]> = {};
  for (const row of query(db, "SELECT set_key, sets_json FROM completed_sets")) {
    const marks = parseMarks(row.sets_json);
    const key = text(row.set_key);
    if (key && marks) {
      completedSets[key] = marks;
    }
  }
  const completedWorkouts = query(db, "SELECT date FROM completed_workouts ORDER BY date")
    .map((row) => text(row.date))
    .filter((date): date is string => Boolean(date));
  return {
    currentPlan,
    history,
    completedSets,
    completedWorkouts,
    settings: parseSettings(meta.settings),
    programStart: meta.program_start ? meta.program_start : null,
  };
}

export function writeProgress(db: ProgressDatabase, state: PersistedState): void {
  ensureSchema(db);
  db.run("BEGIN");
  try {
    db.run("DELETE FROM meta");
    db.run("DELETE FROM weeks");
    db.run("DELETE FROM completed_sets");
    db.run("DELETE FROM completed_workouts");
    db.run("INSERT INTO meta (key, value) VALUES (?, ?)", ["schema_version", "1"]);
    db.run("INSERT INTO meta (key, value) VALUES (?, ?)", ["program_start", state.programStart ?? ""]);
    db.run("INSERT INTO meta (key, value) VALUES (?, ?)", ["settings", JSON.stringify(state.settings)]);
    if (state.currentPlan) {
      insertWeek(db, state.currentPlan, 1);
    }
    for (const plan of state.history) {
      if (plan.weekStart === state.currentPlan?.weekStart) {
        continue;
      }
      insertWeek(db, plan, 0);
    }
    for (const [key, marks] of Object.entries(state.completedSets)) {
      db.run("INSERT INTO completed_sets (set_key, sets_json) VALUES (?, ?)", [key, JSON.stringify(marks)]);
    }
    for (const date of state.completedWorkouts) {
      db.run("INSERT INTO completed_workouts (date) VALUES (?)", [date]);
    }
    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
}

export function isBlankProgress(state: PersistedState): boolean {
  return (
    state.currentPlan === null &&
    state.history.length === 0 &&
    state.completedWorkouts.length === 0 &&
    state.settings === null &&
    state.programStart === null &&
    Object.keys(state.completedSets).length === 0
  );
}

export function persistedFields(state: PersistedState): PersistedState {
  return {
    currentPlan: state.currentPlan,
    history: state.history,
    completedSets: state.completedSets,
    completedWorkouts: state.completedWorkouts,
    settings: state.settings,
    programStart: state.programStart,
  };
}

function insertWeek(db: ProgressDatabase, plan: WeekPlan, isCurrent: number): void {
  db.run("INSERT INTO weeks (week_start, plan_json, is_current) VALUES (?, ?, ?)", [
    plan.weekStart,
    JSON.stringify(plan),
    isCurrent,
  ]);
}

function query(db: ProgressDatabase, sql: string): Record<string, unknown>[] {
  const statement = db.prepare(sql);
  const result: Record<string, unknown>[] = [];
  try {
    while (statement.step()) {
      result.push(statement.getAsObject());
    }
  } finally {
    statement.free();
  }
  return result;
}

function parsePlan(value: unknown): WeekPlan | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || typeof parsed.weekStart !== "string" || !Array.isArray(parsed.days)) {
      return null;
    }
    return parsed as unknown as WeekPlan;
  } catch {
    return null;
  }
}

function parseSettings(value: string | undefined): SetupSettings | null {
  if (!value) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) {
      return null;
    }
    if (typeof parsed.difficulty !== "string" || typeof parsed.trainingDays !== "number" || !Array.isArray(parsed.equipment)) {
      return null;
    }
    return parsed as unknown as SetupSettings;
  } catch {
    return null;
  }
}

function parseMarks(value: unknown): boolean[] | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some((mark) => typeof mark !== "boolean")) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
