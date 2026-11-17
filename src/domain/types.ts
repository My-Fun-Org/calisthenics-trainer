export const MUSCLES = ["push", "pull", "legs", "core", "stretch"] as const;
export type Muscle = (typeof MUSCLES)[number];

export const DAY_FOCUSES = ["push", "pull", "legs", "core", "stretch", "full"] as const;
export type DayFocus = (typeof DAY_FOCUSES)[number];

export const FOCUS_LABEL: Record<DayFocus, string> = {
  push: "Push",
  pull: "Back",
  legs: "Legs",
  core: "Core",
  stretch: "Stretch",
  full: "Full body",
};

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const EQUIPMENT = ["floor", "wall", "pull-up-bar", "dip-bars", "rings", "kettlebell", "band", "jump-rope"] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const TRAINING_DAYS = [3, 4, 5, 6] as const;
export type TrainingDays = (typeof TRAINING_DAYS)[number];

export const EFFORTS = ["reps", "hold"] as const;
export type Effort = (typeof EFFORTS)[number];

export const OPTIONAL_EQUIPMENT = ["wall", "pull-up-bar", "dip-bars", "rings", "kettlebell", "band", "jump-rope"] as const;
export type OptionalEquipment = (typeof OPTIONAL_EQUIPMENT)[number];

export interface Prescription {
  sets: number;
  reps?: number;
  holdSeconds?: number;
}

export interface Exercise {
  id: string;
  name: string;
  muscle: Muscle;
  family: string;
  difficulty: Difficulty;
  equipment: Equipment;
  effort: Effort;
  pose: string;
  cues: string;
  clipUrl: string;
  prescription?: Prescription;
  aliases?: readonly string[];
}

export interface PlannedExercise {
  exerciseId: string;
  name: string;
  muscle: Muscle;
  family: string;
  pose: string;
  cues: string;
  clipUrl: string;
  sets: number;
  reps?: number;
  holdSeconds?: number;
}

export interface WorkoutDay {
  date: string;
  weekday: string;
  muscle: DayFocus;
  coreFinisher: boolean;
  exercises: PlannedExercise[];
}

export interface WeekPlan {
  weekStart: string;
  difficulty: Difficulty;
  trainingDays: TrainingDays;
  equipment: Equipment[];
  /** 1-based week since the program started. Missing on plans saved before progression. */
  weekNumber?: number;
  /** A stretch is added to the end of each session. Missing on older plans. */
  includeStretches?: boolean;
  days: WorkoutDay[];
}

export interface GenerateWeekPlanInput {
  weekStart: string;
  difficulty: Difficulty;
  trainingDays: TrainingDays;
  equipment: readonly Equipment[];
  /** Monday the current 10-week block is counted from. Defaults to weekStart. */
  programStart?: string;
  includeStretches?: boolean;
}

export const DIFFICULTY_RANK: Record<Difficulty, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;
