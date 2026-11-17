import type { DayFocus, WeekPlan } from "./types";

export type CalendarKind = "workout" | "off" | "outside";

export interface CalendarDay {
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
  inPlanWeek: boolean;
  kind: CalendarKind;
  muscle?: DayFocus;
  isToday: boolean;
}

export interface MonthCalendar {
  monthLabel: string;
  weeks: CalendarDay[][];
}

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const CALENDAR_HEADERS = WEEKDAY_HEADERS;

export function todayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthCalendar(
  plan: WeekPlan,
  today?: string,
  history: readonly WeekPlan[] = [],
): MonthCalendar {
  const weekStart = plan.weekStart;
  const weekEnd = addUtcDays(weekStart, 6);
  const year = Number(weekStart.slice(0, 4));
  const month = Number(weekStart.slice(5, 7));
  const firstOfMonth = `${pad(year)}-${pad(month)}-01`;
  const lastOfMonth = lastDateOfMonth(year, month);
  const gridStart = mondayOnOrBefore(firstOfMonth);
  const gridEnd = sundayOnOrAfter(lastOfMonth);
  const historicWeeks = history.map((item) => ({
    start: item.weekStart,
    end: addUtcDays(item.weekStart, 6),
  }));
  const workouts = new Map(
    [...history, plan].flatMap((item) => item.days.map((day) => [day.date, day] as const)),
  );

  const weeks: CalendarDay[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week: CalendarDay[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addUtcDays(cursor, offset);
      const workout = workouts.get(date);
      const inPlanWeek = date >= weekStart && date <= weekEnd;
      const inHistoricWeek = historicWeeks.some(
        (range) => date >= range.start && date <= range.end,
      );
      const inMonth = date.startsWith(`${pad(year)}-${pad(month)}`);
      const kind: CalendarKind = workout
        ? "workout"
        : inPlanWeek || inHistoricWeek
          ? "off"
          : "outside";
      week.push({
        date,
        dayOfMonth: Number(date.slice(8, 10)),
        inMonth,
        inPlanWeek,
        kind,
        muscle: workout?.muscle,
        isToday: date === today,
      });
    }
    weeks.push(week);
    cursor = addUtcDays(cursor, 7);
  }

  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${firstOfMonth}T00:00:00Z`));

  return { monthLabel, weeks };
}

function mondayOnOrBefore(isoDate: string): string {
  const weekday = utcWeekday(isoDate);
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addUtcDays(isoDate, offset);
}

function sundayOnOrAfter(isoDate: string): string {
  const weekday = utcWeekday(isoDate);
  const offset = weekday === 0 ? 0 : 7 - weekday;
  return addUtcDays(isoDate, offset);
}

function lastDateOfMonth(year: number, month: number): string {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return addUtcDays(`${pad(nextYear)}-${pad(nextMonth)}-01`, -1);
}

function utcWeekday(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

function addUtcDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
