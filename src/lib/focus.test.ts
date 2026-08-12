import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOCUS_SYNC_SETTINGS,
  getFocusShortcutUrl,
  normalizeFocusSyncSettings,
  shouldUseStudyFocus,
} from "./focus";
import { advanceTimer, pauseTimer, startTimer } from "./timer";

describe("Study Focus synchronization", () => {
  it("uses a disabled-by-default local preference", () => {
    expect(normalizeFocusSyncSettings(null)).toEqual(DEFAULT_FOCUS_SYNC_SETTINGS);
    expect(normalizeFocusSyncSettings({ enabled: "yes" })).toEqual(
      DEFAULT_FOCUS_SYNC_SETTINGS,
    );
    expect(normalizeFocusSyncSettings({ enabled: true })).toEqual({ enabled: true });
  });

  it("builds encoded Shortcuts URLs and gives focus blocks an expiry", () => {
    expect(getFocusShortcutUrl("off")).toBe(
      "shortcuts://run-shortcut?name=Pomodoro%20Study%20Off",
    );
    expect(getFocusShortcutUrl("on", new Date("2026-08-11T18:30:00.000Z"))).toBe(
      "shortcuts://run-shortcut?name=Pomodoro%20Study%20On&input=text&text=2026-08-11T18%3A30%3A00.000Z",
    );
  });

  it("requests Study only while a focus phase is actively running", () => {
    const started = startTimer("short", "course-1", 0);
    expect(shouldUseStudyFocus(started)).toBe(true);
    expect(shouldUseStudyFocus(pauseTimer(started, 1_000))).toBe(false);

    const onBreak = advanceTimer(started, 30 * 60 * 1_000);
    expect(shouldUseStudyFocus(onBreak)).toBe(false);

    const completed = advanceTimer(onBreak, 65 * 60 * 1_000);
    expect(shouldUseStudyFocus(completed)).toBe(false);
  });
});
