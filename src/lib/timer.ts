import type { Preset, PresetId, TimerState } from "../types";

const minute = 60;

export const PRESETS: Record<PresetId, Preset> = {
  standard: {
    id: "standard",
    name: "Standard",
    focusMinutes: 90,
    totalMinutes: 100,
    phases: [
      { id: "focus-1", label: "Focus block one", shortLabel: "F1", kind: "focus", durationSeconds: 45 * minute },
      { id: "break", label: "Recovery break", shortLabel: "B", kind: "break", durationSeconds: 10 * minute },
      { id: "focus-2", label: "Focus block two", shortLabel: "F2", kind: "focus", durationSeconds: 45 * minute },
    ],
  },
  short: {
    id: "short",
    name: "Short",
    focusMinutes: 60,
    totalMinutes: 65,
    phases: [
      { id: "focus-1", label: "Focus block one", shortLabel: "F1", kind: "focus", durationSeconds: 30 * minute },
      { id: "break", label: "Recovery break", shortLabel: "B", kind: "break", durationSeconds: 5 * minute },
      { id: "focus-2", label: "Focus block two", shortLabel: "F2", kind: "focus", durationSeconds: 30 * minute },
    ],
  },
};

export function createIdleTimer(presetId: PresetId = "standard"): TimerState {
  return {
    status: "idle",
    presetId,
    courseId: null,
    phaseIndex: 0,
    remainingMs: PRESETS[presetId].phases[0].durationSeconds * 1000,
    focusedMs: 0,
    isRunning: false,
    lastUpdatedAt: null,
    startedAt: null,
    completedFocusBlocks: 0,
    completionType: null,
  };
}

export function startTimer(presetId: PresetId, courseId: string, now: number): TimerState {
  return {
    ...createIdleTimer(presetId),
    status: "active",
    courseId,
    isRunning: true,
    lastUpdatedAt: now,
    startedAt: now,
  };
}

export function advanceTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== "active" || !timer.isRunning || timer.lastUpdatedAt === null) {
    return timer;
  }

  const preset = PRESETS[timer.presetId];
  let delta = Math.max(0, now - timer.lastUpdatedAt);
  let phaseIndex = timer.phaseIndex;
  let remainingMs = timer.remainingMs;
  let focusedMs = timer.focusedMs;
  let completedFocusBlocks = timer.completedFocusBlocks;
  let status: TimerState["status"] = timer.status;
  let isRunning: boolean = timer.isRunning;
  let completionType = timer.completionType;

  while (delta > 0 && status === "active") {
    const phase = preset.phases[phaseIndex];
    const consumed = Math.min(delta, remainingMs);

    if (phase.kind === "focus") {
      focusedMs += consumed;
    }

    remainingMs -= consumed;
    delta -= consumed;

    if (remainingMs <= 0) {
      if (phase.kind === "focus") {
        completedFocusBlocks += 1;
      }

      phaseIndex += 1;
      if (phaseIndex >= preset.phases.length) {
        status = "complete";
        isRunning = false;
        remainingMs = 0;
        phaseIndex = preset.phases.length - 1;
        completionType = preset.name;
      } else {
        remainingMs = preset.phases[phaseIndex].durationSeconds * 1000;
      }
    }
  }

  return {
    ...timer,
    status,
    phaseIndex,
    remainingMs,
    focusedMs,
    completedFocusBlocks,
    isRunning,
    completionType,
    lastUpdatedAt: now,
  };
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  const advanced = advanceTimer(timer, now);
  return advanced.status === "active"
    ? { ...advanced, isRunning: false, lastUpdatedAt: now }
    : advanced;
}

export function resumeTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== "active" || timer.isRunning) return timer;
  return { ...timer, isRunning: true, lastUpdatedAt: now };
}

export function skipBreak(timer: TimerState, now: number): TimerState {
  const advanced = advanceTimer(timer, now);
  if (advanced.status !== "active") return advanced;

  const preset = PRESETS[advanced.presetId];
  if (preset.phases[advanced.phaseIndex].kind !== "break") return advanced;

  const nextPhaseIndex = advanced.phaseIndex + 1;
  if (nextPhaseIndex >= preset.phases.length) return advanced;

  return {
    ...advanced,
    phaseIndex: nextPhaseIndex,
    remainingMs: preset.phases[nextPhaseIndex].durationSeconds * 1000,
    isRunning: true,
    lastUpdatedAt: now,
  };
}

export function canFinishEarly(timer: TimerState): boolean {
  return timer.status === "active" && timer.completedFocusBlocks >= 1;
}

export function finishEarly(timer: TimerState, now: number): TimerState {
  const advanced = advanceTimer(timer, now);
  if (!canFinishEarly(advanced)) return advanced;
  return {
    ...advanced,
    status: "complete",
    isRunning: false,
    completionType: "Partial",
    lastUpdatedAt: now,
  };
}

export function getPhaseElapsedMs(timer: TimerState): number {
  const phase = PRESETS[timer.presetId].phases[timer.phaseIndex];
  return Math.max(0, phase.durationSeconds * 1000 - timer.remainingMs);
}

export function getElapsedSessionMs(timer: TimerState): number {
  const preset = PRESETS[timer.presetId];
  const completed = preset.phases
    .slice(0, timer.phaseIndex)
    .reduce((total, phase) => total + phase.durationSeconds * 1000, 0);
  return completed + getPhaseElapsedMs(timer);
}
