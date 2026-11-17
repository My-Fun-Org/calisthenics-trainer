import { DIFFICULTY_RANK, type Difficulty } from "./types";

export const BLOCK_LENGTH = 10;

export interface TrainingVolume {
  sets: number;
  reps: number;
  holdSets: number;
  holdSeconds: number;
}

const VOLUMES: Record<Difficulty, readonly TrainingVolume[]> = {
  beginner: [
    { sets: 3, reps: 5, holdSets: 3, holdSeconds: 12 },
    { sets: 3, reps: 6, holdSets: 3, holdSeconds: 15 },
    { sets: 3, reps: 6, holdSets: 3, holdSeconds: 15 },
    { sets: 3, reps: 7, holdSets: 3, holdSeconds: 20 },
    { sets: 3, reps: 8, holdSets: 3, holdSeconds: 20 },
    { sets: 3, reps: 8, holdSets: 3, holdSeconds: 25 },
    { sets: 3, reps: 9, holdSets: 3, holdSeconds: 25 },
    { sets: 3, reps: 10, holdSets: 3, holdSeconds: 30 },
    { sets: 4, reps: 8, holdSets: 3, holdSeconds: 30 },
    { sets: 4, reps: 12, holdSets: 4, holdSeconds: 35 },
  ],
  intermediate: [
    { sets: 3, reps: 6, holdSets: 3, holdSeconds: 20 },
    { sets: 3, reps: 7, holdSets: 3, holdSeconds: 20 },
    { sets: 3, reps: 8, holdSets: 3, holdSeconds: 25 },
    { sets: 3, reps: 9, holdSets: 3, holdSeconds: 25 },
    { sets: 4, reps: 8, holdSets: 3, holdSeconds: 30 },
    { sets: 4, reps: 8, holdSets: 4, holdSeconds: 30 },
    { sets: 4, reps: 9, holdSets: 4, holdSeconds: 35 },
    { sets: 4, reps: 10, holdSets: 4, holdSeconds: 35 },
    { sets: 4, reps: 10, holdSets: 4, holdSeconds: 40 },
    { sets: 5, reps: 10, holdSets: 4, holdSeconds: 45 },
  ],
  advanced: [
    { sets: 3, reps: 5, holdSets: 3, holdSeconds: 25 },
    { sets: 3, reps: 6, holdSets: 3, holdSeconds: 25 },
    { sets: 4, reps: 5, holdSets: 3, holdSeconds: 30 },
    { sets: 4, reps: 6, holdSets: 4, holdSeconds: 30 },
    { sets: 4, reps: 6, holdSets: 4, holdSeconds: 35 },
    { sets: 4, reps: 7, holdSets: 4, holdSeconds: 35 },
    { sets: 4, reps: 8, holdSets: 4, holdSeconds: 40 },
    { sets: 5, reps: 6, holdSets: 4, holdSeconds: 40 },
    { sets: 5, reps: 8, holdSets: 5, holdSeconds: 45 },
    { sets: 5, reps: 8, holdSets: 5, holdSeconds: 50 },
  ],
};

export type DifficultyBand = "easier" | "building" | "target";

export function trainingWeekNumber(programStart: string, weekStart: string): number {
  const start = Date.parse(`${programStart}T00:00:00Z`);
  const week = Date.parse(`${weekStart}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(week) || week < start) {
    return 1;
  }
  return Math.floor((week - start) / (7 * 86_400_000)) + 1;
}

export function blockWeek(weekNumber: number | undefined): number {
  const safe = Math.max(1, weekNumber ?? 1);
  return ((safe - 1) % BLOCK_LENGTH) + 1;
}

export function blockNumber(weekNumber: number | undefined): number {
  const safe = Math.max(1, weekNumber ?? 1);
  return Math.floor((safe - 1) / BLOCK_LENGTH) + 1;
}

export function weekLabel(weekNumber: number | undefined): string {
  const week = blockWeek(weekNumber);
  const block = blockNumber(weekNumber);
  if (block > 1) {
    return `Block ${block} · week ${week} of ${BLOCK_LENGTH}`;
  }
  return `Week ${week} of ${BLOCK_LENGTH}`;
}

export function volumeFor(difficulty: Difficulty, weekNumber: number | undefined): TrainingVolume {
  const table = VOLUMES[difficulty];
  return table[blockWeek(weekNumber) - 1] ?? table[0];
}

export function difficultyBand(weekNumber: number | undefined): DifficultyBand {
  const week = blockWeek(weekNumber);
  if (week <= 3) {
    return "easier";
  }
  if (week <= 7) {
    return "building";
  }
  return "target";
}

export function matchesDifficultyBand(
  exerciseDifficulty: Difficulty,
  selected: Difficulty,
  weekNumber: number | undefined,
): boolean {
  const rank = DIFFICULTY_RANK[exerciseDifficulty];
  const selectedRank = DIFFICULTY_RANK[selected];
  const band = difficultyBand(weekNumber);
  if (band === "easier") {
    return rank === Math.max(0, selectedRank - 1);
  }
  if (band === "building") {
    return rank === selectedRank || rank === selectedRank - 1;
  }
  if (selectedRank === 0) {
    return rank === 0 || rank === 1;
  }
  return rank === selectedRank;
}

export function prefersHarderVariations(weekNumber: number | undefined): boolean {
  return difficultyBand(weekNumber) === "target";
}
