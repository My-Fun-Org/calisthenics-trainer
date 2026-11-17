import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { DIFFICULTIES, EQUIPMENT, MUSCLES } from "./types";

const REQUIRED = [
  "id",
  "name",
  "muscle",
  "family",
  "difficulty",
  "equipment",
  "effort",
  "pose",
  "cues",
  "clipUrl",
] as const;

describe("calisthenics catalog", () => {
  it("has at least 80 named exercises", () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(80);
  });

  it("gives every exercise a unique id and the required fields", () => {
    const ids = CATALOG.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const exercise of CATALOG) {
      for (const field of REQUIRED) {
        expect(exercise[field], `${exercise.id} missing ${field}`).toBeTypeOf("string");
        if (field !== "clipUrl") {
          expect(exercise[field], `${exercise.id} empty ${field}`).not.toBe("");
        }
      }
      expect(MUSCLES).toContain(exercise.muscle);
      expect(DIFFICULTIES).toContain(exercise.difficulty);
      expect(EQUIPMENT).toContain(exercise.equipment);
    }
  });

  it("covers every muscle at beginner, intermediate, and advanced", () => {
    for (const muscle of MUSCLES) {
      const difficulties = new Set(
        CATALOG.filter((exercise) => exercise.muscle === muscle).map(
          (exercise) => exercise.difficulty,
        ),
      );
      for (const difficulty of DIFFICULTIES) {
        expect(difficulties, `${muscle} missing ${difficulty}`).toContain(difficulty);
      }
    }
  });

  it("includes floor, wall, pull-up bar, dip bars, and rings movements", () => {
    const gear = new Set(CATALOG.map((exercise) => exercise.equipment));
    for (const item of EQUIPMENT) {
      expect(gear).toContain(item);
    }
  });

  it("covers every named exercise from the Wikipedia calisthenics list", () => {
    const missing = WIKIPEDIA_EXERCISES.filter((name) => !catalogCovers(name));
    expect(missing, `missing: ${missing.join(", ")}`).toEqual([]);
  });
});

const WIKIPEDIA_EXERCISES = [
  "Australian row",
  "Bear crawl",
  "Bulgarian split squat",
  "Burpee",
  "Calf raise",
  "Crunch",
  "Dip",
  "Hanging knee raise",
  "Hanging leg raise",
  "Hindu squat",
  "Hip bridge",
  "Inverted row",
  "Jumping jack",
  "Jump rope",
  "Lunge",
  "Mountain climber",
  "Nordic curl",
  "Pike push-up",
  "Pull over",
  "Pull-up",
  "Chin-up",
  "Push-up",
  "Rope climbing",
  "Split jump",
  "Squat",
  "Squat thrust",
  "Stair climbing",
  "Toes to bar",
  "Active hang",
  "Arch hold",
  "Crow pose",
  "Dead hang",
  "Elbow lever",
  "Frogstand",
  "Handstand",
  "Hollow hold",
  "L-sit",
  "Plank",
  "Side plank",
  "V-sit",
  "Wall handstand",
  "Wall sit",
  "Archer pull-up",
  "Archer push-up",
  "Back lever pull-up",
  "Bridge",
  "Dragon flag",
  "Front lever pull-up",
  "Hand walking",
  "Handstand push-up",
  "Hefesto",
  "Hindu push-up",
  "Kip-up",
  "Muscle-up",
  "Nordic hamstring curl",
  "One-arm pull-up",
  "One-arm chin-up",
  "One-arm push-up",
  "Pistol squat",
  "Typewriter pull-up",
  "Windshield wipers",
  "Back lever",
  "Front lever",
  "Human flag",
  "Iron cross",
  "Planche",
  "One arm handstand",
  "Victorian",
  "Back extension",
  "Bicycle crunch",
  "Flutter kick",
  "Jackknife",
  "Leg raises",
  "Pelvic lift",
  "Russian twist",
  "Sit-up",
] as const;

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function catalogCovers(wikiName: string): boolean {
  const needle = normalizeName(wikiName);
  return CATALOG.some((exercise) => {
    const names = [exercise.name, ...(exercise.aliases ?? [])];
    return names.some((name) => normalizeName(name) === needle);
  });
}
