import { PRESETS, getElapsedSessionMs, getPhaseElapsedMs } from "../lib/timer";
import { formatClock, formatDuration, formatElapsedClock } from "../lib/format";
import { getOrbitPoint, getSegmentFillLength } from "../lib/orbit";
import type { TimerState } from "../types";
import { CheckIcon } from "./Icons";

interface OrbitTimerProps {
  timer: TimerState;
}

const radius = 154;
const circumference = 2 * Math.PI * radius;
const gap = 7;

export function OrbitTimer({ timer }: OrbitTimerProps) {
  const preset = PRESETS[timer.presetId];
  const phase = preset.phases[timer.phaseIndex];
  const totalSeconds = preset.phases.reduce((sum, item) => sum + item.durationSeconds, 0);
  const elapsedMs = getElapsedSessionMs(timer);
  const overallProgress = Math.min(1, elapsedMs / (totalSeconds * 1000));
  const phaseProgress = Math.min(1, getPhaseElapsedMs(timer) / (phase.durationSeconds * 1000));
  const playhead = getOrbitPoint(overallProgress, radius, 180, 180);

  let cursor = 0;
  const segments = preset.phases.map((item, index) => {
    const start = cursor;
    const length = (item.durationSeconds / totalSeconds) * circumference;
    cursor += length;

    let fillRatio = 0;
    if (timer.status === "complete" && timer.completionType !== "Partial") fillRatio = 1;
    else if (index < timer.phaseIndex) fillRatio = 1;
    else if (index === timer.phaseIndex) fillRatio = phaseProgress;

    return { item, index, start, length, fillRatio };
  });

  const statusLabel = timer.status === "idle"
    ? "Ready when you are"
    : timer.status === "complete"
      ? "Session complete"
      : timer.isRunning
        ? phase.kind === "focus" ? "Deep focus" : "Recovery break"
        : "Timer paused";

  const displayTime = timer.status === "complete"
    ? formatDuration(timer.focusedMs / 1000)
    : formatClock(timer.remainingMs);

  return (
    <div
      className={`orbit orbit--${phase.kind} ${timer.status === "complete" ? "orbit--complete" : ""}`}
      role="timer"
      aria-label={`${statusLabel}, ${displayTime}${timer.status === "complete" ? " focused" : " remaining"}`}
    >
      <svg className="orbit__svg" viewBox="0 0 360 360" role="presentation">
        <circle className="orbit__halo" cx="180" cy="180" r="171" />
        {segments.map(({ item, start, length }) => (
          <circle
            key={`track-${item.id}`}
            className={`orbit__segment orbit__segment--track orbit__segment--${item.kind}`}
            cx="180"
            cy="180"
            r={radius}
            pathLength={circumference}
            strokeDasharray={`${Math.max(0, length - gap)} ${circumference - length + gap}`}
            strokeDashoffset={-start}
          />
        ))}
        {segments.map(({ item, start, length, fillRatio }) => {
          const filled = getSegmentFillLength(length, gap, fillRatio);
          return filled > 0 ? (
            <circle
              key={`fill-${item.id}`}
              className={`orbit__segment orbit__segment--fill orbit__segment--${item.kind}`}
              cx="180"
              cy="180"
              r={radius}
              pathLength={circumference}
              strokeDasharray={`${filled} ${circumference - filled}`}
              strokeDashoffset={-start}
            />
          ) : null;
        })}
        {timer.status === "active" && elapsedMs > 0 && (
          <circle
            className={`orbit__playhead orbit__playhead--${phase.kind}`}
            cx={playhead.x}
            cy={playhead.y}
            r="4.8"
          />
        )}
        <circle className="orbit__inner-ring" cx="180" cy="180" r="119" />
      </svg>

      <div className="orbit__content">
        {timer.status === "complete" ? (
          <span className="orbit__check"><CheckIcon /></span>
        ) : (
          <span className="orbit__index">{String(timer.phaseIndex + 1).padStart(2, "0")} / 03</span>
        )}
        <strong className="orbit__time">{displayTime}</strong>
        <span className="orbit__label">{statusLabel}</span>
        {timer.status === "active" && (
          <span className="orbit__focused">{formatElapsedClock(timer.focusedMs)} focused</span>
        )}
      </div>

      <span className="sr-only">
        {Math.round((elapsedMs / (totalSeconds * 1000)) * 100)} percent of the session elapsed
      </span>
    </div>
  );
}
