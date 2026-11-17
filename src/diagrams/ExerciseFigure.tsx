import type { ReactNode } from "react";

const STROKE = "#ead9c8";
const ACCENT = "#e07a4a";

interface PoseProps {
  stroke: string;
  accent: string;
}

const POSES: Record<string, (props: PoseProps) => ReactNode> = {
  "push-up": PushUp,
  dip: Dip,
  handstand: Handstand,
  row: Row,
  "pull-up": PullUp,
  hang: Hang,
  lever: Lever,
  squat: Squat,
  lunge: Lunge,
  bridge: Bridge,
  pistol: Pistol,
  plank: Plank,
  hollow: Hollow,
  "leg-raise": LegRaise,
  "l-sit": LSit,
  jump: Jump,
  calf: Calf,
  "side-plank": SidePlank,
  "muscle-up": MuscleUp,
  planche: Planche,
  crow: Crow,
};

interface ExerciseFigureProps {
  pose: string;
  className?: string;
}

export function ExerciseFigure({ pose, className }: ExerciseFigureProps) {
  const Pose = POSES[pose] ?? Standing;
  return (
    <svg
      viewBox="0 0 160 160"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <rect width="160" height="160" rx="28" fill="#2a211c" />
      <Pose stroke={STROKE} accent={ACCENT} />
    </svg>
  );
}

function Head({ cx, cy, stroke }: { cx: number; cy: number; stroke: string }) {
  return <circle cx={cx} cy={cy} r="9" fill="none" stroke={stroke} strokeWidth="3" />;
}

function Standing({ stroke }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={80} cy={38} stroke={stroke} />
      <path d="M80 47v46M80 93l-18 32M80 93l18 32M62 70h36" />
    </g>
  );
}

function PushUp({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={42} cy={78} stroke={stroke} />
      <path d="M50 82h62M50 82l-12 22M112 82l16 22M70 82v18M102 82v18" />
      <path d="M28 128h108" stroke={accent} strokeWidth="3" />
    </g>
  );
}

function Dip({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M36 58h24M100 58h24" stroke={accent} />
      <Head cx={80} cy={40} stroke={stroke} />
      <path d="M80 49v38M62 58v18H48M98 58v18h14M80 87l-12 28M80 87l12 28" />
    </g>
  );
}

function Handstand({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={80} cy={118} stroke={stroke} />
      <path d="M80 109V62M80 62l-14-36M80 62l14-36M66 92h28" />
      <path d="M58 132h44" stroke={accent} />
    </g>
  );
}

function Row({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M28 52h104" stroke={accent} />
      <Head cx={48} cy={78} stroke={stroke} />
      <path d="M56 74h54M56 74l-10 24M110 74l14 26M74 74v22M98 74v22" />
    </g>
  );
}

function PullUp({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M28 36h104" stroke={accent} />
      <Head cx={80} cy={62} stroke={stroke} />
      <path d="M48 36v18H80V71M112 36v18H80M80 71v28M80 99l-12 22M80 99l12 22" />
    </g>
  );
}

function Hang({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M28 32h104" stroke={accent} />
      <Head cx={80} cy={68} stroke={stroke} />
      <path d="M48 32v28h64V32M80 77v30M80 107l-14 22M80 107l14 22" />
    </g>
  );
}

function Lever({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M28 78h28" stroke={accent} />
      <Head cx={128} cy={78} stroke={stroke} />
      <path d="M56 78h64M56 78v22M72 78v16M88 78v16" />
    </g>
  );
}

function Squat({ stroke }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={80} cy={42} stroke={stroke} />
      <path d="M80 51v28M62 64h36M80 79l-22 18 6 20M80 79l22 18-6 20" />
    </g>
  );
}

function Lunge({ stroke }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={78} cy={36} stroke={stroke} />
      <path d="M78 45v36M62 62h32M78 81l-28 10 4 22M78 81l24 28" />
    </g>
  );
}

function Bridge({ stroke }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={40} cy={92} stroke={stroke} />
      <path d="M48 88h52M48 88l-10 24M100 88v28M72 88v20" />
    </g>
  );
}

function Pistol({ stroke }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={86} cy={40} stroke={stroke} />
      <path d="M86 49v30M70 64h32M86 79l-20 18 4 22M86 79l34-8" />
    </g>
  );
}

function Plank({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={38} cy={74} stroke={stroke} />
      <path d="M46 78h70M46 78l-10 26M116 78l16 26M64 78v22M100 78v22" />
      <path d="M24 128h116" stroke={accent} strokeWidth="3" />
    </g>
  );
}

function Hollow({ stroke }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={40} cy={86} stroke={stroke} />
      <path d="M48 82c18-16 46-16 64 0M48 82l-16-10M112 82l20-8" />
    </g>
  );
}

function LegRaise({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M28 36h104" stroke={accent} />
      <Head cx={80} cy={58} stroke={stroke} />
      <path d="M52 36v20h56V36M80 68v18M80 86l-8 28M80 86l8 28" />
    </g>
  );
}

function LSit({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M40 96h20M100 96h20" stroke={accent} />
      <Head cx={80} cy={48} stroke={stroke} />
      <path d="M80 57v32M60 96V78h40v18M80 89h44" />
    </g>
  );
}

function Jump({ stroke }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={80} cy={32} stroke={stroke} />
      <path d="M80 41v36M62 58h36M80 77l-20 18M80 77l20 18M54 118l12-8M106 118l-12-8" />
    </g>
  );
}

function Calf({ stroke }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={80} cy={34} stroke={stroke} />
      <path d="M80 43v50M64 66h32M80 93l-12 22 8 8M80 93l12 22-8 8" />
    </g>
  );
}

function SidePlank({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={40} cy={70} stroke={stroke} />
      <path d="M48 76h72M48 76l-8 28M120 76l16 12M84 76v-16" />
      <path d="M24 128h116" stroke={accent} strokeWidth="3" />
    </g>
  );
}

function MuscleUp({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M28 58h104" stroke={accent} />
      <Head cx={80} cy={36} stroke={stroke} />
      <path d="M80 45v20M58 58v22H80M102 58v22H80M80 80v18M80 98l-14 24M80 98l14 24" />
    </g>
  );
}

function Planche({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={44} cy={78} stroke={stroke} />
      <path d="M52 82h64M68 82v22M92 82v22" />
      <path d="M28 128h104" stroke={accent} strokeWidth="3" />
    </g>
  );
}

function Crow({ stroke, accent }: PoseProps) {
  return (
    <g fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <Head cx={80} cy={40} stroke={stroke} />
      <path d="M80 49v28M64 88l16-11 16 11M64 88v22M96 88v22M72 77l-16 8M88 77l16 8" />
      <path d="M40 128h80" stroke={accent} strokeWidth="3" />
    </g>
  );
}
