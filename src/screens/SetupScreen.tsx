import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { REST_OPTIONS, restOptionLabel, restSecondsFor } from "@/domain/rest";
import {
  DIFFICULTIES,
  OPTIONAL_EQUIPMENT,
  TRAINING_DAYS,
  type Difficulty,
  type Equipment,
  type OptionalEquipment,
  type TrainingDays,
} from "@/domain/types";
import { usePlanStore } from "@/store/planStore";

const GEAR_LABEL: Record<OptionalEquipment, string> = {
  wall: "Wall",
  "pull-up-bar": "Pull-up bar",
  "dip-bars": "Dip bars",
  rings: "Rings",
};

const DIFFICULTY_COPY: Record<Difficulty, string> = {
  beginner: "Foundations and regressions",
  intermediate: "Full movements, honest volume",
  advanced: "Harder variations and skills",
};

export function SetupScreen() {
  const navigate = useNavigate();
  const startWeek = usePlanStore((state) => state.startWeek);
  const saveSettings = usePlanStore((state) => state.saveSettings);
  const currentPlan = usePlanStore((state) => state.currentPlan);
  const existing = usePlanStore((state) => state.settings);
  const [difficulty, setDifficulty] = useState<Difficulty>(existing?.difficulty ?? "beginner");
  const [trainingDays, setTrainingDays] = useState<TrainingDays>(existing?.trainingDays ?? 3);
  const [restSeconds, setRestSeconds] = useState(
    existing?.restSeconds ?? restSecondsFor(existing?.difficulty ?? "beginner"),
  );
  const [gear, setGear] = useState<OptionalEquipment[]>(
    (existing?.equipment.filter((item): item is OptionalEquipment =>
      OPTIONAL_EQUIPMENT.includes(item as OptionalEquipment),
    ) ?? ["pull-up-bar"]) as OptionalEquipment[],
  );

  function toggleGear(item: OptionalEquipment): void {
    setGear((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  }

  function onSubmit(event: FormEvent): void {
    event.preventDefault();
    const equipment: Equipment[] = ["floor", ...gear];
    const next = { difficulty, trainingDays, equipment, restSeconds };
    const gearChanged = !sameGear(existing?.equipment ?? [], equipment);
    const rebuild =
      !currentPlan ||
      existing?.difficulty !== difficulty ||
      existing?.trainingDays !== trainingDays ||
      gearChanged;
    if (rebuild) {
      startWeek(next);
    } else {
      saveSettings(next);
    }
    navigate("/week");
  }

  return (
    <AppShell>
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ember-deep">Planner</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-stone-900">
          Put this week on the calendar.
        </h1>
        <p className="mt-3 text-stone-600">
          Pick a level, how often you train, and the gear you have. Floor work is always included.
        </p>
      </header>

      <form className="flex flex-1 flex-col gap-8" onSubmit={onSubmit}>
        <fieldset>
          <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Difficulty
          </legend>
          <div className="grid gap-2">
            {DIFFICULTIES.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficulty(level)}
                className={`card-surface min-h-14 px-4 py-3 text-left ${
                  difficulty === level ? "ring-2 ring-ember" : ""
                }`}
              >
                <span className="block capitalize text-stone-900">{level}</span>
                <span className="text-sm text-stone-500">{DIFFICULTY_COPY[level]}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Days this week
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {TRAINING_DAYS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setTrainingDays(count)}
                className={`card-surface min-h-14 text-lg text-stone-900 ${
                  trainingDays === count ? "ring-2 ring-ember" : ""
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Gear
          </legend>
          <p className="mb-3 text-sm text-stone-500">Floor is always on. Add what you own.</p>
          <div className="grid grid-cols-2 gap-2">
            {OPTIONAL_EQUIPMENT.map((item) => {
              const on = gear.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleGear(item)}
                  className={`card-surface min-h-14 px-3 text-sm text-stone-900 ${
                    on ? "ring-2 ring-ember" : ""
                  }`}
                >
                  {GEAR_LABEL[item]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Rest between sets
          </legend>
          <p className="mb-3 text-sm text-stone-500">Used by the cooldown timer after each set.</p>
          <div className="grid grid-cols-3 gap-2">
            {REST_OPTIONS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => setRestSeconds(seconds)}
                className={`card-surface min-h-14 text-sm text-stone-900 ${
                  restSeconds === seconds ? "ring-2 ring-ember" : ""
                }`}
              >
                {restOptionLabel(seconds)}
              </button>
            ))}
          </div>
        </fieldset>

        <button type="submit" className="btn-primary mt-auto w-full">
          {currentPlan ? "Save settings" : "Show on calendar"}
        </button>
      </form>
    </AppShell>
  );
}

function sameGear(left: Equipment[], right: Equipment[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const owned = new Set(left);
  return right.every((item) => owned.has(item));
}
