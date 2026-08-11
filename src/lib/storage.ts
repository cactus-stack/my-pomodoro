import { PRESETS, createIdleTimer } from "./timer";
import type { AppData, Course } from "../types";

const STORAGE_KEY = "study-pomodoro:data:v1";

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultCourse(): Course {
  return {
    id: makeId(),
    name: "General study",
    totalFocusedSeconds: 0,
    sessionsCompleted: 0,
    createdAt: new Date().toISOString(),
  };
}

export function createDefaultData(): AppData {
  const course = defaultCourse();
  return {
    version: 1,
    courses: [course],
    sessions: [],
    selectedCourseId: course.id,
    timer: createIdleTimer(),
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.courses) ||
      !Array.isArray(parsed.sessions) ||
      !parsed.timer
    ) {
      return createDefaultData();
    }
    const data = parsed as AppData;
    const preset = PRESETS[data.timer.presetId];
    const selectedCourseExists = data.courses.some((course) => course.id === data.selectedCourseId);
    const timerCourseExists = data.courses.some((course) => course.id === data.timer.courseId);
    const validPhase = Boolean(preset?.phases[data.timer.phaseIndex]);
    const validTimerNumbers =
      Number.isFinite(data.timer.remainingMs) &&
      data.timer.remainingMs >= 0 &&
      Number.isFinite(data.timer.focusedMs) &&
      data.timer.focusedMs >= 0;

    if (!preset || !validPhase || !validTimerNumbers) {
      data.timer = createIdleTimer();
    } else if (data.timer.status === "active" && !timerCourseExists) {
      data.timer = createIdleTimer(data.timer.presetId);
    }

    if (!selectedCourseExists) {
      data.selectedCourseId = data.courses[0]?.id ?? null;
    }
    if (data.courses.length === 0) {
      return createDefaultData();
    }
    return data;
  } catch {
    return createDefaultData();
  }
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export { makeId };
