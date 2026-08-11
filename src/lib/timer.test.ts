import { describe, expect, it } from "vitest";
import {
  advanceTimer,
  canFinishEarly,
  createIdleTimer,
  finishEarly,
  pauseTimer,
  resumeTimer,
  skipBreak,
  startTimer,
} from "./timer";

describe("study timer", () => {
  it("moves through a full Standard session and counts only focus time", () => {
    const started = startTimer("standard", "course-1", 0);
    const afterFirstFocus = advanceTimer(started, 45 * 60 * 1000);
    expect(afterFirstFocus.phaseIndex).toBe(1);
    expect(afterFirstFocus.completedFocusBlocks).toBe(1);
    expect(afterFirstFocus.focusedMs).toBe(45 * 60 * 1000);

    const completed = advanceTimer(afterFirstFocus, 100 * 60 * 1000);
    expect(completed.status).toBe("complete");
    expect(completed.completionType).toBe("Standard");
    expect(completed.focusedMs).toBe(90 * 60 * 1000);
  });

  it("does not count time while paused", () => {
    const started = startTimer("short", "course-1", 0);
    const paused = pauseTimer(started, 5 * 60 * 1000);
    const stillPaused = advanceTimer(paused, 25 * 60 * 1000);
    expect(stillPaused.focusedMs).toBe(5 * 60 * 1000);

    const resumed = resumeTimer(stillPaused, 25 * 60 * 1000);
    const advanced = advanceTimer(resumed, 30 * 60 * 1000);
    expect(advanced.focusedMs).toBe(10 * 60 * 1000);
  });

  it("skips a break without adding focused minutes", () => {
    const started = startTimer("short", "course-1", 0);
    const onBreak = advanceTimer(started, 30 * 60 * 1000);
    const skipped = skipBreak(onBreak, 30 * 60 * 1000);
    expect(skipped.phaseIndex).toBe(2);
    expect(skipped.focusedMs).toBe(30 * 60 * 1000);
  });

  it("allows a partial session only after the first focus block", () => {
    const started = startTimer("standard", "course-1", 0);
    expect(canFinishEarly(started)).toBe(false);
    expect(finishEarly(started, 20 * 60 * 1000).status).toBe("active");

    const onBreak = advanceTimer(started, 45 * 60 * 1000);
    expect(canFinishEarly(onBreak)).toBe(true);
    const completed = finishEarly(onBreak, 46 * 60 * 1000);
    expect(completed.status).toBe("complete");
    expect(completed.completionType).toBe("Partial");
    expect(completed.focusedMs).toBe(45 * 60 * 1000);
  });

  it("creates a clean idle state for a selected preset", () => {
    const idle = createIdleTimer("short");
    expect(idle.status).toBe("idle");
    expect(idle.remainingMs).toBe(30 * 60 * 1000);
  });
});
