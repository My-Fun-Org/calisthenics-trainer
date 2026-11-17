import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface ShellAction {
  label: string;
  to: string;
}

interface AppShellProps {
  children: ReactNode;
  rightAction?: ShellAction;
  leftAction?: ShellAction;
}

export function AppShell({ children, rightAction, leftAction }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-[#EFECE3] text-stone-900">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col border-x border-stone-200/80 bg-[#FAF9F5] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[0_1px_18px_rgba(28,25,23,0.05)]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-stone-200/90 bg-[#FAF9F5]/95 px-4 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-3">
            {leftAction ? (
              <Link
                to={leftAction.to}
                className="inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-md px-1 text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              >
                {leftAction.label}
              </Link>
            ) : null}
            <Link
              to="/"
              className="font-display shrink-0 whitespace-nowrap rounded-md text-base font-bold tracking-tight text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            >
              Calisthenics Trainer
            </Link>
          </div>

          {rightAction ? (
            <Link
              to={rightAction.to}
              className="inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-md px-2 text-sm font-medium text-stone-700 underline-offset-4 transition-colors hover:text-stone-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            >
              {rightAction.label}
            </Link>
          ) : null}
        </header>

        <main className="flex-1 px-4 py-5">{children}</main>
      </div>
    </div>
  );
}
