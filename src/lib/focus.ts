import { PRESETS } from "./timer";
import type { TimerState } from "../types";

export type FocusShortcutCommand = "on" | "off";

export interface FocusSyncSettings {
  enabled: boolean;
}

const FOCUS_STORAGE_KEY = "study-pomodoro:focus-sync:v1";

export const FOCUS_SHORTCUT_NAMES: Record<FocusShortcutCommand, string> = {
  on: "Pomodoro Study On",
  off: "Pomodoro Study Off",
};

export const DEFAULT_FOCUS_SYNC_SETTINGS: FocusSyncSettings = {
  enabled: false,
};

export function normalizeFocusSyncSettings(value: unknown): FocusSyncSettings {
  if (!value || typeof value !== "object") return DEFAULT_FOCUS_SYNC_SETTINGS;
  const candidate = value as Partial<FocusSyncSettings>;
  return {
    enabled:
      typeof candidate.enabled === "boolean"
        ? candidate.enabled
        : DEFAULT_FOCUS_SYNC_SETTINGS.enabled,
  };
}

export function loadFocusSyncSettings(): FocusSyncSettings {
  try {
    const stored = localStorage.getItem(FOCUS_STORAGE_KEY);
    return stored
      ? normalizeFocusSyncSettings(JSON.parse(stored))
      : DEFAULT_FOCUS_SYNC_SETTINGS;
  } catch {
    return DEFAULT_FOCUS_SYNC_SETTINGS;
  }
}

export function saveFocusSyncSettings(settings: FocusSyncSettings): void {
  try {
    localStorage.setItem(
      FOCUS_STORAGE_KEY,
      JSON.stringify(normalizeFocusSyncSettings(settings)),
    );
  } catch {
    // Focus synchronization is optional; timer behavior must remain unaffected.
  }
}

export function shouldUseStudyFocus(timer: TimerState): boolean {
  if (timer.status !== "active" || !timer.isRunning) return false;
  return PRESETS[timer.presetId].phases[timer.phaseIndex].kind === "focus";
}

export function getFocusShortcutUrl(
  command: FocusShortcutCommand,
  endsAt?: Date,
): string {
  const shortcutName = encodeURIComponent(FOCUS_SHORTCUT_NAMES[command]);
  const baseUrl = `shortcuts://run-shortcut?name=${shortcutName}`;

  if (command !== "on" || !endsAt || !Number.isFinite(endsAt.getTime())) {
    return baseUrl;
  }

  return `${baseUrl}&input=text&text=${encodeURIComponent(endsAt.toISOString())}`;
}

export function runFocusShortcut(
  command: FocusShortcutCommand,
  remainingMs?: number,
): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    const endsAt =
      command === "on" && typeof remainingMs === "number" && remainingMs > 0
        ? new Date(Date.now() + remainingMs)
        : undefined;
    const link = document.createElement("a");
    link.href = getFocusShortcutUrl(command, endsAt);
    link.hidden = true;
    link.setAttribute("aria-hidden", "true");
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch {
    return false;
  }
}
