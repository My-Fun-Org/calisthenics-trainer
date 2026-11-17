import { CATALOG } from "./catalog";
import {
  DIFFICULTY_RANK,
  MUSCLES,
  VOLUME,
  WEEKDAYS,
  type DayFocus,
  type Difficulty,
  type Equipment,
  type Exercise,
  type GenerateWeekPlanInput,
  type Muscle,
  type PlannedExercise,
  type TrainingDays,
  type WeekPlan,
  type WorkoutDay,
} from "./types";

const MAIN_EXERCISES_PER_DAY = 4;

interface DaySlot {
  offset: number;
  muscle: Muscle;
  coreFinisher: boolean;
}

const SCHEDULE: Record<TrainingDays, readonly DaySlot[]> = {
  3: [
    { offset: 0, muscle: "push", coreFinisher: true },
    { offset: 1, muscle: "pull", coreFinisher: true },
    { offset: 3, muscle: "legs", coreFinisher: true },
  ],
  4: [
    { offset: 0, muscle: "push", coreFinisher: false },
    { offset: 1, muscle: "pull", coreFinisher: false },
    { offset: 3, muscle: "legs", coreFinisher: false },
    { offset: 4, muscle: "core", coreFinisher: false },
  ],
  5: [
    { offset: 0, muscle: "push", coreFinisher: false },
    { offset: 1, muscle: "pull", coreFinisher: false },
    { offset: 2, muscle: "legs", coreFinisher: false },
    { offset: 4, muscle: "core", coreFinisher: false },
    { offset: 5, muscle: "push", coreFinisher: false },
  ],
  6: [
    { offset: 0, muscle: "push", coreFinisher: true },
    { offset: 1, muscle: "pull", coreFinisher: true },
    { offset: 2, muscle: "legs", coreFinisher: true },
    { offset: 4, muscle: "push", coreFinisher: true },
    { offset: 5, muscle: "pull", coreFinisher: true },
    { offset: 6, muscle: "legs", coreFinisher: true },
  ],
};

export function isDifficultyEligible(exercise: Exercise, selected: Difficulty): boolean {
  const rank = DIFFICULTY_RANK[exercise.difficulty];
  const selectedRank = DIFFICULTY_RANK[selected];
  return rank === selectedRank || rank === selectedRank - 1;
}

export function ownedEquipment(selected: readonly Equipment[]): ReadonlySet<Equipment> {
  return new Set<Equipment>(["floor", ...selected]);
}

export function filterPool(
  muscle: Muscle,
  difficulty: Difficulty,
  equipment: ReadonlySet<Equipment>,
  catalog: readonly Exercise[] = CATALOG,
): Exercise[] {
  return catalog.filter(
    (exercise) =>
      exercise.muscle === muscle &&
      isDifficultyEligible(exercise, difficulty) &&
      equipment.has(exercise.equipment),
  );
}

export function planExercise(exercise: Exercise, difficulty: Difficulty): PlannedExercise {
  const volume = VOLUME[difficulty];
  const base = {
    exerciseId: exercise.id,
    name: exercise.name,
    muscle: exercise.muscle,
    family: exercise.family,
    pose: exercise.pose,
    cues: exercise.cues,
    clipUrl: exercise.clipUrl,
  };
  if (exercise.prescription) {
    return {
      ...base,
      sets: exercise.prescription.sets,
      reps: exercise.prescription.reps,
      holdSeconds: exercise.prescription.holdSeconds,
    };
  }
  if (exercise.effort === "hold") {
    return {
      ...base,
      sets: volume.holdSets,
      holdSeconds: volume.holdSeconds,
    };
  }
  return {
    ...base,
    sets: volume.sets,
    reps: volume.reps,
  };
}

export function generateWeekPlan(
  input: GenerateWeekPlanInput,
  catalog: readonly Exercise[] = CATALOG,
): WeekPlan {
  const equipment = ownedEquipment(input.equipment);
  const used = new Set<string>();
  const seed = hashString(seedKey(input));
  const days: WorkoutDay[] = SCHEDULE[input.trainingDays].map((slot, index) => {
    const date = addDays(input.weekStart, slot.offset);
    const rng = mulberry32(seed + index * 101 + slot.offset * 17);
    const mainPool = filterPool(slot.muscle, input.difficulty, equipment, catalog);
    const main = pickExercises(mainPool, MAIN_EXERCISES_PER_DAY, used, rng);
    const exercises = main.map((exercise) => planExercise(exercise, input.difficulty));
    if (slot.coreFinisher) {
      const corePool = filterPool("core", input.difficulty, equipment, catalog);
      const finisher = pickExercises(corePool, 1, used, rng);
      exercises.push(...finisher.map((exercise) => planExercise(exercise, input.difficulty)));
    }
    return {
      date,
      weekday: WEEKDAYS[slot.offset] ?? "Monday",
      muscle: slot.muscle,
      coreFinisher: slot.coreFinisher,
      exercises,
    };
  });

  return {
    weekStart: input.weekStart,
    difficulty: input.difficulty,
    trainingDays: input.trainingDays,
    equipment: [...equipment],
    days,
  };
}

export function mondayOf(date: Date): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + offset);
  return toIsoDate(copy);
}

export function canAddWorkoutOnDate(plan: WeekPlan, date: string): boolean {
  return inPlanWeek(date, plan.weekStart) && !plan.days.some((day) => day.date === date);
}

export function addWorkoutOnDate(
  plan: WeekPlan,
  date: string,
  focus: DayFocus,
  catalog: readonly Exercise[] = CATALOG,
): WeekPlan | null {
  if (plan.days.some((day) => day.date === date)) {
    return plan;
  }
  if (!canAddWorkoutOnDate(plan, date)) {
    return null;
  }
  const offset = daysBetween(plan.weekStart, date);
  const equipment = ownedEquipment(plan.equipment);
  const used = new Set(
    plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId)),
  );
  const rng = mulberry32(hashString(`${plan.weekStart}|extra|${date}|${focus}`) + offset * 17);
  const added: WorkoutDay = {
    date,
    weekday: WEEKDAYS[offset] ?? "Monday",
    muscle: focus,
    coreFinisher: false,
    exercises: exercisesForFocus(focus, plan.difficulty, equipment, used, rng, catalog),
  };
  return {
    ...plan,
    days: [...plan.days, added].sort((left, right) => left.date.localeCompare(right.date)),
  };
}

function exercisesForFocus(
  focus: DayFocus,
  difficulty: Difficulty,
  equipment: ReadonlySet<Equipment>,
  used: Set<string>,
  rng: () => number,
  catalog: readonly Exercise[],
): PlannedExercise[] {
  if (focus === "full") {
    return MUSCLES.flatMap((muscle) =>
      pickExercises(filterPool(muscle, difficulty, equipment, catalog), 1, used, rng),
    ).map((exercise) => planExercise(exercise, difficulty));
  }
  return pickExercises(
    filterPool(focus, difficulty, equipment, catalog),
    MAIN_EXERCISES_PER_DAY,
    used,
    rng,
  ).map((exercise) => planExercise(exercise, difficulty));
}

function inPlanWeek(date: string, weekStart: string): boolean {
  return date >= weekStart && date <= addDays(weekStart, 6);
}

function daysBetween(start: string, end: string): number {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  return Math.round((endMs - startMs) / 86_400_000);
}

function pickExercises(
  pool: readonly Exercise[],
  count: number,
  used: Set<string>,
  rng: () => number,
): Exercise[] {
  const available = pool.filter((exercise) => !used.has(exercise.id));
  const shuffled = shuffle(available, rng);
  const picked: Exercise[] = [];
  const families = new Set<string>();

  for (const exercise of shuffled) {
    if (picked.length >= count) {
      break;
    }
    if (families.has(exercise.family)) {
      continue;
    }
    picked.push(exercise);
    families.add(exercise.family);
    used.add(exercise.id);
  }

  for (const exercise of shuffled) {
    if (picked.length >= count) {
      break;
    }
    if (picked.some((item) => item.id === exercise.id)) {
      continue;
    }
    picked.push(exercise);
    used.add(exercise.id);
  }

  return picked;
}

function seedKey(input: GenerateWeekPlanInput): string {
  const gear = [...input.equipment].slice().sort().join(",");
  return `${input.weekStart}|${input.difficulty}|${input.trainingDays}|${gear}`;
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const current = copy[index];
    const other = copy[swapIndex];
    if (current === undefined || other === undefined) {
      continue;
    }
    copy[index] = other;
    copy[swapIndex] = current;
  }
  return copy;
}
