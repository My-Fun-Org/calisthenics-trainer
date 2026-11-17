import { describe, expect, it } from "vitest";
import { EMPTY_STATE, loadState, saveState, STORAGE_KEY } from "./storage";
import type { PersistedState } from "./storage";
import type { WeekPlan } from "../domain/types";

class MemoryStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

const samplePlan: WeekPlan = {
  weekStart: "2026-11-16",
  difficulty: "beginner",
  trainingDays: 3,
  equipment: ["floor"],
  days: [],
};

describe("plan storage", () => {
  it("returns an empty state when nothing is stored", () => {
    expect(loadState(new MemoryStorage())).toEqual(EMPTY_STATE);
  });

  it("round-trips a saved plan", () => {
    const storage = new MemoryStorage();
    const state: PersistedState = {
      ...EMPTY_STATE,
      currentPlan: samplePlan,
    };
    saveState(state, storage);
    expect(storage.getItem(STORAGE_KEY)).toContain("2026-11-16");
    expect(loadState(storage)).toEqual(state);
  });

  it("returns empty state for corrupt JSON instead of throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, "{not-json");
    expect(loadState(storage)).toEqual(EMPTY_STATE);
  });

  it("returns empty state for JSON that is not a plan blob", () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ hello: "world" }));
    expect(loadState(storage)).toEqual(EMPTY_STATE);
  });
});
