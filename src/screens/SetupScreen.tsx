import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { volumeFor } from "@/domain/progression";
import { REST_OPTIONS, restSecondsFor } from "@/domain/rest";
import {
  OPTIONAL_EQUIPMENT,
  TRAINING_DAYS,
  type Difficulty,
  type Equipment,
  type OptionalEquipment,
  type TrainingDays,
} from "@/domain/types";
import { usePlanStore } from "@/store/planStore";

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const GEAR_LABEL: Record<OptionalEquipment, string> = {
  wall: "Wall",
  "pull-up-bar": "Pull-up bar",
  "dip-bars": "Dip bars",
  rings: "Rings",
  kettlebell: "Kettlebell",
  band: "Band",
  "jump-rope": "Jump rope",
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
  const [includeStretches, setIncludeStretches] = useState(Boolean(existing?.includeStretches));

  const equipment: Equipment[] = ["floor", ...gear];
  const planSettingsChanged =
    !currentPlan ||
    difficulty !== currentPlan.difficulty ||
    trainingDays !== currentPlan.trainingDays ||
    Boolean(currentPlan.includeStretches) !== includeStretches ||
    !sameGear(currentPlan.equipment, equipment);

  function toggleGear(item: OptionalEquipment): void {
    setGear((current) =>
      current.includes(item) ? current.filter((value) => value !== item) : [...current, item],
    );
  }

  function onSubmit(event: FormEvent): void {
    event.preventDefault();
    const next = { difficulty, trainingDays, equipment, restSeconds, includeStretches };
    if (planSettingsChanged) {
      startWeek(next);
    } else {
      saveSettings(next);
    }
    navigate("/week");
  }

  return (
    <AppShell rightAction={currentPlan ? { label: "Calendar", to: "/week" } : undefined}>
      <form onSubmit={onSubmit} className="space-y-6 pb-8">
        <div>
          <h1 className="font-display text-balance text-2xl font-bold tracking-tight text-stone-900">
            {currentPlan ? "Training settings" : "Build your training week"}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Pick your level, weekly schedule, and available equipment. Each level builds for 10 weeks: more reps first, then harder variations.
          </p>
        </div>

        <section className="space-y-2.5">
          <h2 className="font-display text-sm font-semibold text-stone-800">Difficulty</h2>
          <div className="space-y-2">
            {DIFFICULTIES.map((option) => {
              const selected = difficulty === option.value;
              const start = volumeFor(option.value, 1);
              const peak = volumeFor(option.value, 10);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDifficulty(option.value)}
                  aria-pressed={selected}
                  className={`flex min-h-[52px] w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
                    selected
                      ? "border-amber-600 bg-amber-50/70 text-stone-950"
                      : "border-stone-200 bg-white text-stone-800 hover:border-stone-300"
                  }`}
                >
                  <div>
                    <span className="font-display text-sm font-semibold">{option.label}</span>
                    <span className="mt-0.5 block font-mono text-xs tabular-nums text-stone-500">
                      Week 1: {start.sets}×{start.reps} · Week 10: {peak.sets}×{peak.reps}
                    </span>
                  </div>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                      selected
                        ? "border-amber-600 bg-amber-600 text-white"
                        : "border-stone-300 bg-white"
                    }`}
                  >
                    {selected ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-sm font-semibold text-stone-800">
            Training days per week
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {TRAINING_DAYS.map((count) => {
              const selected = trainingDays === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => setTrainingDays(count)}
                  aria-pressed={selected}
                  className={`flex min-h-[48px] items-center justify-center rounded-xl border font-mono text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
                    selected
                      ? "border-amber-600 bg-amber-600 text-white"
                      : "border-stone-200 bg-white text-stone-800 hover:border-stone-300"
                  }`}
                >
                  {count} days
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-stone-800">Equipment</h2>
            <span className="text-xs text-stone-500">Bell, jump rope, and double unders are added to each session</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {OPTIONAL_EQUIPMENT.map((item) => {
              const active = gear.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleGear(item)}
                  aria-pressed={active}
                  className={`flex min-h-[48px] items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
                    active
                      ? "border-amber-600 bg-amber-50/70 text-stone-950"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                  }`}
                >
                  <span className="whitespace-nowrap">{GEAR_LABEL[item]}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      active
                        ? "border-amber-600 bg-amber-600 text-white"
                        : "border-stone-300 bg-white"
                    }`}
                  >
                    {active ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-sm font-semibold text-stone-800">In every workout</h2>
          <button
            type="button"
            onClick={() => setIncludeStretches((current) => !current)}
            aria-pressed={includeStretches}
            className={`flex min-h-[48px] w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
              includeStretches
                ? "border-amber-600 bg-amber-50/70 text-stone-950"
                : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
            }`}
          >
            <span>
              <span className="block">Stretches</span>
              <span className="mt-0.5 block text-xs font-normal text-stone-500">
                One stretch at the end of each session
              </span>
            </span>
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                includeStretches
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-stone-300 bg-white"
              }`}
            >
              {includeStretches ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
          </button>
        </section>

        <section className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-stone-800">Rest between sets</h2>
            <span className="text-xs text-stone-500">Does not rebuild your week</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {REST_OPTIONS.map((seconds) => {
              const selected = restSeconds === seconds;
              return (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => setRestSeconds(seconds)}
                  aria-pressed={selected}
                  className={`flex min-h-[46px] items-center justify-center rounded-xl border font-mono text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${
                    selected
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-800 hover:border-stone-300"
                  }`}
                >
                  {seconds}s
                </button>
              );
            })}
          </div>
        </section>

        <div className="pt-2">
          <button
            type="submit"
            className="flex min-h-[50px] w-full items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-stone-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
          >
            {planSettingsChanged ? "Show on calendar" : "Save settings"}
          </button>
        </div>
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
