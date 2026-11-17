import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { CALENDAR_HEADERS, monthCalendar, todayIso, type CalendarDay } from "@/domain/calendar";
import { canAddWorkoutOnDate } from "@/domain/generateWeekPlan";
import { findCoveringPlan } from "@/domain/planHistory";
import { DAY_FOCUSES, FOCUS_LABEL, type DayFocus } from "@/domain/types";
import { usePlanStore } from "@/store/planStore";

const FOCUS_CHIP: Record<DayFocus, string> = {
  push: "bg-orange-500 text-white",
  pull: "bg-sky-600 text-white",
  legs: "bg-emerald-600 text-white",
  core: "bg-violet-600 text-white",
  full: "bg-stone-800 text-white",
};

export function WeekScreen() {
  const navigate = useNavigate();
  const plan = usePlanStore((state) => state.currentPlan);
  const history = usePlanStore((state) => state.history);
  const completedWorkouts = usePlanStore((state) => state.completedWorkouts);
  const regenerateWeek = usePlanStore((state) => state.regenerateWeek);
  const addWorkout = usePlanStore((state) => state.addWorkout);
  const [addingDate, setAddingDate] = useState<string | null>(null);

  if (!plan) {
    return <Navigate to="/setup" replace />;
  }

  const calendar = monthCalendar(plan, todayIso(), history);

  function onRegenerate(): void {
    if (!window.confirm("Generate a new week? Previous weeks stay on the calendar.")) {
      return;
    }
    regenerateWeek();
  }

  return (
    <AppShell>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">{calendar.monthLabel}</h1>
          <p className="mt-1 capitalize text-stone-500">
            {plan.difficulty} · {plan.trainingDays} training days
          </p>
        </div>
        <Link to="/setup" className="btn-ghost px-3 py-2 text-sm">
          Settings
        </Link>
      </header>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50">
          {CALENDAR_HEADERS.map((label) => (
            <div
              key={label}
              className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-stone-500"
            >
              {label}
            </div>
          ))}
        </div>
        <div>
          {calendar.weeks.map((week) => {
            const inPlan = week.some((cell) => cell.inPlanWeek);
            return (
              <div
                key={week[0]?.date}
                className={`grid grid-cols-7 border-t border-stone-100 ${
                  inPlan ? "bg-amber-50/70" : ""
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

      <p className="mt-3 text-center text-sm text-stone-500">
        Tap a workout to open it, or an off day to add one.
      </p>

      <button type="button" className="btn-ghost mt-6 w-full" onClick={onRegenerate}>
        Generate a new week
      </button>

      {addingDate ? (
        <FocusPicker
          date={addingDate}
          onCancel={() => setAddingDate(null)}
          onPick={(focus) => {
            const date = addingDate;
            if (!addWorkout(date, focus)) {
              return;
            }
            setAddingDate(null);
            navigate(`/workout/${date}`);
          }}
        />
      ) : null}
    </AppShell>
  );
}

interface FocusPickerProps {
  date: string;
  onPick: (focus: DayFocus) => void;
  onCancel: () => void;
}

function FocusPicker({ date, onPick, onCancel }: FocusPickerProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 p-4">
      <div className="card-surface w-full max-w-md overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">What do you want to work on?</h2>
            <p className="mt-1 text-sm text-stone-500">{date}</p>
          </div>
          <button type="button" className="btn-ghost px-3 py-2 text-sm" onClick={onCancel}>
            Cancel
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 px-4 pb-4">
          {DAY_FOCUSES.map((focus) => (
            <button
              key={focus}
              type="button"
              className="min-h-12 rounded-xl bg-stone-50 px-4 text-left text-base font-semibold text-stone-900 ring-1 ring-stone-200 active:bg-stone-100"
              onClick={() => onPick(focus)}
            >
              {FOCUS_LABEL[focus]}
            </button>
          ))}
        </div>
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
  const muted = !cell.inMonth;
  const className = `flex min-h-[4.75rem] flex-col items-stretch gap-1 border-l border-stone-100 px-1 py-1.5 first:border-l-0 ${
    muted ? "text-stone-300" : "text-stone-800"
  }`;

  const body = (
    <>
      <span
        className={`inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-xs font-semibold ${
          cell.isToday ? "bg-stone-900 text-white" : ""
        }`}
      >
        {cell.dayOfMonth}
      </span>
      {cell.kind === "workout" && cell.muscle ? (
        <span
          className={`truncate rounded-md px-1 py-0.5 text-[10px] font-semibold leading-tight ${FOCUS_CHIP[cell.muscle]}`}
        >
          {FOCUS_LABEL[cell.muscle]}
          {done ? " · Done" : ""}
        </span>
      ) : null}
      {cell.kind === "off" ? (
        <span className={`text-[10px] font-medium ${canAdd ? "text-stone-500" : "text-stone-400"}`}>
          {canAdd ? "Add" : "Off"}
        </span>
      ) : null}
    </>
  );

  if ((cell.kind === "workout" && cell.muscle) || canAdd) {
    const label =
      cell.kind === "workout" && cell.muscle
        ? `${FOCUS_LABEL[cell.muscle]} workout, ${cell.date}${done ? ", done" : ""}`
        : `Add workout, ${cell.date}`;
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className={`${className} text-left active:bg-stone-100`}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className={className}
      aria-label={cell.kind === "off" ? `${cell.date} off` : undefined}
    >
      {body}
    </div>
  );
}
