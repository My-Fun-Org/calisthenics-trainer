import type { Difficulty } from "./types";

export const REST_SECONDS = {
  beginner: 60,
  intermediate: 90,
  advanced: 120,
} as const;

export const REST_OPTIONS = [30, 45, 60, 90, 120, 180] as const;
export type RestOption = (typeof REST_OPTIONS)[number];

const MIN_REST_SECONDS = 30;
const MAX_REST_SECONDS = 180;

export function clampRestSeconds(value: number): number {
  if (!Number.isFinite(value)) {
    return REST_SECONDS.beginner;
  }
  return Math.min(MAX_REST_SECONDS, Math.max(MIN_REST_SECONDS, Math.round(value)));
}

export function restSecondsFor(difficulty: Difficulty, override?: number): number {
  if (typeof override === "number") {
    return clampRestSeconds(override);
  }
  return REST_SECONDS[difficulty];
}

export function restOptionLabel(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  return formatRestClock(seconds);
}

export function formatRestClock(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function tickRest(remaining: number): number {
  return Math.max(0, remaining - 1);
}
