import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { CALENDAR_HEADERS, monthCalendar, todayIso, type CalendarDay } from "@/domain/calendar";
import { canAddWorkoutOnDate, mondayOf } from "@/domain/generateWeekPlan";
import { trainingWeekNumber, weekLabel } from "@/domain/progression";
import { findCoveringPlan } from "@/domain/planHistory";
import { DAY_FOCUSES, FOCUS_LABEL, type DayFocus } from "@/domain/types";
import { usePlanStore } from "@/store/planStore";

const FOCUS_TINT: Record<DayFocus, string> = {
  push: "bg-amber-100/90 text-amber-950 border-amber-300/80",
  pull: "bg-sky-100/90 text-sky-950 border-sky-300/80",
  legs: "bg-emerald-100/90 text-emerald-950 border-emerald-300/80",
  core: "bg-violet-100/90 text-violet-950 border-violet-300/80",
  stretch: "bg-rose-100/90 text-rose-950 border-rose-300/80",
  full: "bg-stone-200/90 text-stone-950 border-stone-300",
};

const FOCUS_HINT: Record<DayFocus, string> = {
  push: "Chest, shoulders, triceps",
  pull: "Lats, upper back, biceps",
  legs: "Quads, glutes, hamstrings",
  core: "Abs, obliques, compression",
  stretch: "Hips, hamstrings, shoulders",
  full: "One movement per muscle",
};

export function WeekScreen() {
  const navigate = useNavigate();
  const plan = usePlanStore((state) => state.currentPlan);
  const history = usePlanStore((state) => state.history);
  const completedWorkouts = usePlanStore((state) => state.completedWorkouts);
  const regenerateWeek = usePlanStore((state) => state.regenerateWeek);
  const programStart = usePlanStore((state) => state.programStart);
  const addWorkout = usePlanStore((state) => state.addWorkout);
  const [addingDate, setAddingDate] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  if (!plan) {
    return <Navigate to="/setup" replace />;
  }

  const calendar = monthCalendar(plan, todayIso(), history);
  const willArchivePrevious = plan.weekStart !== mondayOf(new Date());

  return (
    <AppShell rightAction={{ label: "Settings", to: "/setup" }}>
      <div className="space-y-6 pb-8">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-stone-900">
              {calendar.monthLabel}
            </h1>
            <p className="mt-0.5 text-xs capitalize text-stone-600">
              {plan.difficulty} · {plan.trainingDays} days/week ·{" "}
              {weekLabel(
                plan.weekNumber ??
                  (programStart ? trainingWeekNumber(programStart, plan.weekStart) : 1),
              )}
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-stone-500">
            Week of {formatDateShort(plan.weekStart)}
          </span>
        </div>

        <section
          aria-label="Training calendar"
          className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_3px_rgba(28,25,23,0.04)]"
        >
          <div className="grid grid-cols-7 border-b border-stone-200 bg-[#F7F4EC]">
            {CALENDAR_HEADERS.map((label) => (
              <div
                key={label}
                className="py-2 text-center font-mono text-[11px] font-semibold text-stone-500"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="divide-y divide-stone-100">
            {calendar.weeks.map((week) => {
              const isRowCurrentWeek = week.some((cell) => cell.inPlanWeek);
              return (
                <div
                  key={week[0]?.date}
                  className={`grid grid-cols-7 divide-x divide-stone-100 ${
                    isRowCurrentWeek ? "bg-amber-50/75" : ""
                  }`}
                >
                  {week.map((cell) => {
                    const covering = findCoveringPlan(plan, history, cell.date);
                    const canAdd = covering ? canAddWorkoutOnDate(covering, cell.date) : false;
                    return (
                      <CalendarCell
                        key={cell.date}
                        cell={cell}
                        done={completedWorkouts.includes(cell.date)}
                        canAdd={canAdd}
                        onOpen={() => {
                          if (cell.kind === "off") {
                            setAddingDate(cell.date);
                            return;
                          }
                          navigate(`/workout/${cell.date}`);
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-2.5">
          <h2 className="font-display text-sm font-semibold text-stone-800">This week’s sessions</h2>
          <div className="divide-y divide-stone-200/80 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {plan.days.map((day) => {
              const done = completedWorkouts.includes(day.date);
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => navigate(`/workout/${day.date}`)}
                  className="flex min-h-[58px] w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-600"
                >
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-stone-900">
                      {day.weekday} · {FOCUS_LABEL[day.muscle]}
                    </p>
                    <p className="mt-0.5 font-mono text-xs tabular-nums text-stone-500">
                      {formatDateShort(day.date)} · {day.exercises.length} exercises
                    </p>
                  </div>
                  <span
                    className={`shrink-0 whitespace-nowrap text-xs font-semibold ${
                      done ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {done ? "Done" : "Open"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="pt-1">
          {confirmRegenerate ? (
            <div className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50/80 p-4">
              <p className="font-display text-sm font-semibold text-stone-900">
                {willArchivePrevious ? "Start a new week on the calendar?" : "Regenerate this week?"}
              </p>
              <p className="text-xs leading-relaxed text-stone-700">
                {willArchivePrevious
                  ? "Your previous week and its completed sets will stay archived on the calendar."
                  : "This replaces the current week with a fresh schedule and clears this week’s completed sets."}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    regenerateWeek();
                    setConfirmRegenerate(false);
                  }}
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRegenerate(false)}
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRegenerate(true)}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            >
              Generate a new week
            </button>
          )}
        </div>
      </div>

      <FocusPicker
        date={addingDate}
        onCancel={() => setAddingDate(null)}
        onPick={(focus) => {
          const date = addingDate;
          if (!date || !addWorkout(date, focus)) {
            return;
          }
          setAddingDate(null);
          navigate(`/workout/${date}`);
        }}
      />
    </AppShell>
  );
}

interface FocusPickerProps {
  date: string | null;
  onPick: (focus: DayFocus) => void;
  onCancel: () => void;
}

function FocusPicker({ date, onPick, onCancel }: FocusPickerProps) {
  if (!date) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 backdrop-blur-[1px]"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-picker-title"
    >
      <div
        className="w-full max-w-lg rounded-t-3xl border-t border-stone-200 bg-[#FAF9F5] px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-stone-300" />
        <div className="mb-4">
          <p className="text-xs font-medium text-stone-500">
            {weekdayOf(date)} · {formatDateShort(date)}
          </p>
          <h2 id="focus-picker-title" className="font-display mt-0.5 text-lg font-bold text-stone-900">
            What do you want to work on?
          </h2>
        </div>
        <div className="space-y-2">
          {DAY_FOCUSES.map((focus) => (
            <button
              key={focus}
              type="button"
              onClick={() => onPick(focus)}
              className="flex min-h-[52px] w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-left transition-colors hover:border-amber-500 hover:bg-amber-50/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            >
              <span className="font-display text-sm font-semibold text-stone-900">
                {FOCUS_LABEL[focus]}
              </span>
              <span className="text-xs text-stone-500">{FOCUS_HINT[focus]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-stone-200 bg-stone-100 px-4 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface CalendarCellProps {
  cell: CalendarDay;
  done: boolean;
  canAdd: boolean;
  onOpen: () => void;
}

function CalendarCell({ cell, done, canAdd, onOpen }: CalendarCellProps) {
  if (cell.kind === "outside" || (cell.kind === "off" && !canAdd)) {
    return (
      <div className="min-h-[64px] p-1.5 text-left" aria-hidden={cell.kind === "outside"}>
        <span
          className={`font-mono text-[11px] tabular-nums ${
            cell.inMonth ? "text-stone-300" : "text-stone-200"
          }`}
        >
          {cell.dayOfMonth}
        </span>
        {cell.kind === "off" ? (
          <span className="mt-1 block text-[10px] font-medium text-stone-300">Off</span>
        ) : null}
      </div>
    );
  }

  if (cell.kind === "off") {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Add workout on ${cell.date}`}
        className="flex min-h-[64px] flex-col justify-between p-1.5 text-left transition-colors hover:bg-amber-100/50 active:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-600"
      >
        <span className={dayNumberClass(cell)}>{cell.dayOfMonth}</span>
        <span className="text-[10px] font-medium text-stone-400">Add</span>
      </button>
    );
  }

  const focus = cell.muscle ?? "push";
  const chipText = `${FOCUS_LABEL[focus]}${done ? " · Done" : ""}`;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${cell.date} ${chipText}`}
      className="flex min-h-[64px] flex-col justify-between p-1.5 text-left transition-colors hover:bg-amber-100/50 active:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-600"
    >
      <span className={dayNumberClass(cell)}>{cell.dayOfMonth}</span>
      <span
        className={`mt-1 block w-full break-words rounded-md border px-1 py-0.5 text-[10px] font-semibold leading-tight ${
          done ? "border-stone-300 bg-stone-800 text-stone-50" : FOCUS_TINT[focus]
        }`}
      >
        {chipText}
      </span>
    </button>
  );
}

function dayNumberClass(cell: CalendarDay): string {
  return `font-mono text-[11px] font-medium tabular-nums ${
    cell.isToday
      ? "font-bold text-amber-700 underline underline-offset-2"
      : cell.inMonth
        ? "text-stone-900"
        : "text-stone-500"
  }`;
}

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

function weekdayOf(iso: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
