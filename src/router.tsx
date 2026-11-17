import { createBrowserRouter, Navigate } from "react-router-dom";
import { SetupScreen } from "@/screens/SetupScreen";
import { WeekScreen } from "@/screens/WeekScreen";
import { WorkoutScreen } from "@/screens/WorkoutScreen";
import { usePlanStore } from "@/store/planStore";

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

function HomeRedirect() {
  const plan = usePlanStore((state) => state.currentPlan);
  return <Navigate to={plan ? "/week" : "/setup"} replace />;
}

export const router = createBrowserRouter(
  [
    { path: "/", element: <HomeRedirect /> },
    { path: "/setup", element: <SetupScreen /> },
    { path: "/week", element: <WeekScreen /> },
    { path: "/workout/:date", element: <WorkoutScreen /> },
    { path: "*", element: <Navigate to="/" replace /> },
  ],
  { basename: basename || "/" },
);
