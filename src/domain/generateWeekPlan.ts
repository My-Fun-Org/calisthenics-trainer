import { CATALOG } from "./catalog";
import {
  matchesDifficultyBand,
  prefersHarderVariations,
  trainingWeekNumber,
  volumeFor,
} from "./progression";
import {
  DIFFICULTY_RANK,
  MUSCLES,
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

export function isDifficultyEligible(
  exercise: Exercise,
  selected: Difficulty,
  weekNumber = 1,
): boolean {
  return matchesDifficultyBand(exercise.difficulty, selected, weekNumber);
}

export function ownedEquipment(selected: readonly Equipment[]): ReadonlySet<Equipment> {
  return new Set<Equipment>(["floor", ...selected]);
}

export function filterPool(
  muscle: Muscle,
  difficulty: Difficulty,
  equipment: ReadonlySet<Equipment>,
  catalog: readonly Exercise[] = CATALOG,
  weekNumber = 1,
): Exercise[] {
  const owned = catalog.filter(
    (exercise) => exercise.muscle === muscle && equipment.has(exercise.equipment),
  );
  const band = owned.filter((exercise) =>
    matchesDifficultyBand(exercise.difficulty, difficulty, weekNumber),
  );
  if (band.length >= MAIN_EXERCISES_PER_DAY) {
    return band;
  }
  const building = owned.filter((exercise) => {
    const rank = DIFFICULTY_RANK[exercise.difficulty];
    const selectedRank = DIFFICULTY_RANK[difficulty];
    return rank === selectedRank || rank === selectedRank - 1;
  });
  return building.length > 0 ? building : owned;
}

export function planExercise(
  exercise: Exercise,
  difficulty: Difficulty,
  weekNumber = 1,
): PlannedExercise {
  const volume = volumeFor(difficulty, weekNumber);
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
  const weekNumber = trainingWeekNumber(input.programStart ?? input.weekStart, input.weekStart);
  const seed = hashString(seedKey(input, weekNumber));
  const days: WorkoutDay[] = SCHEDULE[input.trainingDays].map((slot, index) => {
    const date = addDays(input.weekStart, slot.offset);
    const rng = mulberry32(seed + index * 101 + slot.offset * 17);
    const exercises = buildSession(
      slot.muscle,
      input.difficulty,
      equipment,
      used,
      rng,
      catalog,
      weekNumber,
      Boolean(input.includeStretches),
      slot.coreFinisher,
    );
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
    weekNumber,
    includeStretches: Boolean(input.includeStretches),
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
    exercises: buildSession(
      focus,
      plan.difficulty,
      equipment,
      used,
      rng,
      catalog,
      plan.weekNumber ?? 1,
      Boolean(plan.includeStretches),
      false,
    ),
  };
  return {
    ...plan,
    days: [...plan.days, added].sort((left, right) => left.date.localeCompare(right.date)),
  };
}

const STRETCH_FAMILIES: Record<Muscle, readonly string[]> = {
  push: ["chest", "shoulder"],
  pull: ["back", "shoulder"],
  legs: ["hamstring", "hip-flexor", "quad", "calf", "glute"],
  core: ["spine", "back"],
  stretch: [],
};

function buildSession(
  focus: DayFocus,
  difficulty: Difficulty,
  equipment: ReadonlySet<Equipment>,
  used: Set<string>,
  rng: () => number,
  catalog: readonly Exercise[],
  weekNumber: number,
  includeStretches: boolean,
  coreFinisher: boolean,
): PlannedExercise[] {
  const exercises = sessionWork(
    focus,
    difficulty,
    equipment,
    used,
    rng,
    catalog,
    weekNumber,
    coreFinisher,
  );
  if (equipment.has("jump-rope")) {
    for (const id of ["jump-rope", "double-under"]) {
      if (exercises.some((exercise) => exercise.exerciseId === id)) continue;
      const rope = catalog.find((exercise) => exercise.id === id);
      if (rope) exercises.push(planExercise(rope, difficulty, weekNumber));
    }
  }
  if (includeStretches && focus !== "stretch") {
    const stretch = pickStretch(focus, difficulty, equipment, used, rng, catalog, weekNumber);
    if (stretch) {
      exercises.push(planExercise(stretch, difficulty, weekNumber));
    }
  }
  return exercises;
}

function sessionWork(
  focus: DayFocus,
  difficulty: Difficulty,
  equipment: ReadonlySet<Equipment>,
  used: Set<string>,
  rng: () => number,
  catalog: readonly Exercise[],
  weekNumber: number,
  coreFinisher: boolean,
): PlannedExercise[] {
  if (focus === "full") {
    return MUSCLES.filter((muscle) => muscle !== "stretch").flatMap((muscle) =>
      pickMuscle(muscle, 1, difficulty, equipment, used, rng, catalog, weekNumber),
    );
  }
  if (focus === "stretch") {
    return pickMuscle("stretch", MAIN_EXERCISES_PER_DAY, difficulty, equipment, used, rng, catalog, weekNumber);
  }
  const exercises = pickMuscle(
    focus,
    MAIN_EXERCISES_PER_DAY,
    difficulty,
    equipment,
    used,
    rng,
    catalog,
    weekNumber,
  );
  if (coreFinisher) {
    exercises.push(
      ...pickMuscle("core", 1, difficulty, equipment, used, rng, catalog, weekNumber),
    );
  }
  return exercises;
}

function pickMuscle(
  muscle: Muscle,
  count: number,
  difficulty: Difficulty,
  equipment: ReadonlySet<Equipment>,
  used: Set<string>,
  rng: () => number,
  catalog: readonly Exercise[],
  weekNumber: number,
): PlannedExercise[] {
  const pool = filterPool(muscle, difficulty, equipment, catalog, weekNumber).filter(
    (exercise) => exercise.equipment !== "jump-rope",
  );
  const reserved = reserveKettlebell(muscle, equipment, pool, used, rng, catalog);
  return pickExercises(pool, count, used, rng, weekNumber, reserved).map((exercise) =>
    planExercise(exercise, difficulty, weekNumber),
  );
}

function reserveKettlebell(
  muscle: Muscle,
  equipment: ReadonlySet<Equipment>,
  pool: readonly Exercise[],
  used: Set<string>,
  rng: () => number,
  catalog: readonly Exercise[],
): Exercise[] {
  if (!equipment.has("kettlebell") || muscle === "stretch") {
    return [];
  }
  if (muscle === "legs") {
    const swing = catalog.find((exercise) => exercise.id === "kettlebell-swing");
    if (swing && !used.has(swing.id)) {
      used.add(swing.id);
      return [swing];
    }
  }
  const options = shuffle(
    pool.filter((exercise) => exercise.equipment === "kettlebell" && !used.has(exercise.id)),
    rng,
  );
  const choice = options[0];
  if (!choice) {
    return [];
  }
  used.add(choice.id);
  return [choice];
}

function pickStretch(
  focus: DayFocus,
  difficulty: Difficulty,
  equipment: ReadonlySet<Equipment>,
  used: Set<string>,
  rng: () => number,
  catalog: readonly Exercise[],
  weekNumber: number,
): Exercise | undefined {
  const pool = filterPool("stretch", difficulty, equipment, catalog, weekNumber).filter(
    (exercise) => !used.has(exercise.id),
  );
  const families = STRETCH_FAMILIES[focus === "full" ? "legs" : focus];
  const matched = pool.filter((exercise) => families.includes(exercise.family));
  const choice = shuffle(matched.length > 0 ? matched : pool, rng)[0];
  if (!choice) {
    return undefined;
  }
  used.add(choice.id);
  return choice;
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
  weekNumber = 1,
  reserved: readonly Exercise[] = [],
): Exercise[] {
  const available = pool.filter((exercise) => !used.has(exercise.id));
  const shuffled = prefersHarderVariations(weekNumber)
    ? shuffle(available, rng).sort(
        (left, right) => DIFFICULTY_RANK[right.difficulty] - DIFFICULTY_RANK[left.difficulty],
      )
    : shuffle(available, rng);
  const picked: Exercise[] = [...reserved];
  const families = new Set(reserved.map((exercise) => exercise.family));

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

function seedKey(input: GenerateWeekPlanInput, weekNumber: number): string {
  const gear = [...input.equipment].slice().sort().join(",");
  return `${input.weekStart}|${input.difficulty}|${input.trainingDays}|${gear}|${weekNumber}|${input.includeStretches ? "stretches" : "no-stretches"}`;
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
