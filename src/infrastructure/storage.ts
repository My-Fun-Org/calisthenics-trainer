import type { Difficulty, Equipment, TrainingDays, WeekPlan } from "../domain/types";

export const STORAGE_KEY = "calisthenics.plan.v1";

export interface SetupSettings {
  difficulty: Difficulty;
  trainingDays: TrainingDays;
  equipment: Equipment[];
  restSeconds?: number;
  includeStretches?: boolean;
}

export interface PersistedState {
  currentPlan: WeekPlan | null;
  history: WeekPlan[];
  completedSets: Record<string, boolean[]>;
  completedWorkouts: string[];
  settings: SetupSettings | null;
  programStart: string | null;
}

export const EMPTY_STATE: PersistedState = {
  currentPlan: null,
  history: [],
  completedSets: {},
  completedWorkouts: [],
  settings: null,
  programStart: null,
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadState(storage: StorageLike = defaultStorage()): PersistedState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_STATE;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedState(parsed)) {
      return EMPTY_STATE;
    }
    return {
      ...parsed,
      programStart: typeof parsed.programStart === "string" ? parsed.programStart : null,
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function saveState(
  state: PersistedState,
  storage: StorageLike = defaultStorage(),
): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode and quota errors should not crash the session.
  }
}

function defaultStorage(): StorageLike {
  try {
    return globalThis.localStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => undefined,
    };
  }
}

function isPersistedState(value: unknown): value is PersistedState {
  if (!isRecord(value)) {
    return false;
  }
  return (
    (value.currentPlan === null || isRecord(value.currentPlan)) &&
    Array.isArray(value.history) &&
    isRecord(value.completedSets) &&
    Array.isArray(value.completedWorkouts) &&
    (value.settings === null || isRecord(value.settings))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
