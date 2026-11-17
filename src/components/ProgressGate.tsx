import { useEffect, type ReactNode } from "react";
import { usePlanStore } from "@/store/planStore";

export function ProgressGate({ children }: { children: ReactNode }) {
  const hydrated = usePlanStore((state) => state.hydrated);

  useEffect(() => {
    void usePlanStore.getState().hydrate();
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F3EFE6] px-6 text-sm text-stone-600">
        Loading your training…
      </div>
    );
  }

  return children;
}
