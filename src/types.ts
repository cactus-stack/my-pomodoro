export type PresetId = "standard" | "short";
export type PhaseKind = "focus" | "break";
export type TimerStatus = "idle" | "active" | "complete";
export type CompletionType = "Standard" | "Short" | "Partial";

export interface Phase {
  id: string;
  label: string;
  shortLabel: string;
  kind: PhaseKind;
  durationSeconds: number;
}

export interface Preset {
  id: PresetId;
  name: "Standard" | "Short";
  focusMinutes: number;
  totalMinutes: number;
  phases: Phase[];
}

export interface TimerState {
  status: TimerStatus;
  presetId: PresetId;
  courseId: string | null;
  phaseIndex: number;
  remainingMs: number;
  focusedMs: number;
  isRunning: boolean;
  lastUpdatedAt: number | null;
  startedAt: number | null;
  completedFocusBlocks: number;
  completionType: CompletionType | null;
}

export interface Course {
  id: string;
  name: string;
  totalFocusedSeconds: number;
  sessionsCompleted: number;
  createdAt: string;
}

export interface StudySession {
  id: string;
  courseId: string;
  courseName: string;
  presetId: PresetId;
  type: CompletionType;
  focusedSeconds: number;
  completedAt: string;
  note: string;
}

export interface AppData {
  version: 1;
  courses: Course[];
  sessions: StudySession[];
  selectedCourseId: string | null;
  timer: TimerState;
}
