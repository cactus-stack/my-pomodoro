import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m8 5 11 7-11 7V5Z" />
    </IconBase>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 5v14M15 5v14" />
    </IconBase>
  );
}

export function SkipIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 6 9 6-9 6V6ZM18 6v12" />
    </IconBase>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m5 12 4 4L19 6" />
    </IconBase>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

export function ArrowIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14M14 7l5 5-5 5" />
    </IconBase>
  );
}

export function CourseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" />
      <path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H19M9 8h6" />
    </IconBase>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m9 5 7 7-7 7" />
    </IconBase>
  );
}

export function SoundOnIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z" />
      <path d="M15 9.5a4 4 0 0 1 0 5M17.7 7a7.5 7.5 0 0 1 0 10" />
    </IconBase>
  );
}

export function SoundOffIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M11 5 6.5 9H3v6h3.5l4.5 4V5Z" />
      <path d="m16 10 5 5M21 10l-5 5" />
    </IconBase>
  );
}

export function FocusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" />
      <path d="M16.5 4.5v3M15 6h3" />
    </IconBase>
  );
}
