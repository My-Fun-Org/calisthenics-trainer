import type { ReactNode } from "react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      {children}
    </div>
  );
}
