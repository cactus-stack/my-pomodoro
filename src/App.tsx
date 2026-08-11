import { useEffect, useMemo, useState } from "react";
import { OrbitTimer } from "./components/OrbitTimer";
import { ArrowIcon, CheckIcon, CourseIcon, PauseIcon, PlayIcon, PlusIcon, SkipIcon } from "./components/Icons";
import { formatDuration, formatSessionDate, getTodaySeconds } from "./lib/format";
import { loadData, makeId, saveData } from "./lib/storage";
import {
  PRESETS,
  advanceTimer,
  canFinishEarly,
  createIdleTimer,
  finishEarly,
  pauseTimer,
  resumeTimer,
  skipBreak,
  startTimer,
} from "./lib/timer";
import type { AppData, Course, PresetId, StudySession } from "./types";

function App() {
  const [data, setData] = useState<AppData>(() => {
    const stored = loadData();
    return stored.timer.status === "active" && stored.timer.isRunning
      ? { ...stored, timer: advanceTimer(stored.timer, Date.now()) }
      : stored;
  });
  const [newCourseName, setNewCourseName] = useState("");
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const preset = PRESETS[data.timer.presetId];
  const phase = preset.phases[data.timer.phaseIndex];
  const selectedCourse = data.courses.find((course) => course.id === data.selectedCourseId) ?? null;
  const timerCourse = data.courses.find((course) => course.id === data.timer.courseId) ?? selectedCourse;
  const todaySeconds = getTodaySeconds(data.sessions);
  const allTimeSeconds = data.courses.reduce((sum, course) => sum + course.totalFocusedSeconds, 0);
  const isIdle = data.timer.status === "idle";

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    if (data.timer.status !== "active" || !data.timer.isRunning) return;
    const timerId = window.setInterval(() => {
      setData((current) => ({ ...current, timer: advanceTimer(current.timer, Date.now()) }));
    }, 500);
    return () => window.clearInterval(timerId);
  }, [data.timer.isRunning, data.timer.status]);

  useEffect(() => {
    if (data.timer.status === "active") {
      const totalSeconds = Math.max(0, Math.ceil(data.timer.remainingMs / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = String(totalSeconds % 60).padStart(2, "0");
      document.title = `${minutes}:${seconds} · ${phase.kind === "focus" ? "Focus" : "Break"}`;
    } else if (data.timer.status === "complete") {
      document.title = "Session complete · Study Pomodoro";
    } else {
      document.title = "Study Pomodoro";
    }
  }, [data.timer.remainingMs, data.timer.status, phase.kind]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const courseStats = useMemo(
    () => [...data.courses].sort((a, b) => b.totalFocusedSeconds - a.totalFocusedSeconds),
    [data.courses],
  );

  function choosePreset(presetId: PresetId) {
    if (!isIdle) return;
    setData((current) => ({ ...current, timer: createIdleTimer(presetId) }));
  }

  function beginSession() {
    if (!selectedCourse) {
      setMessage("Choose a course before starting.");
      return;
    }
    setConfirmDiscard(false);
    setNote("");
    setData((current) => ({
      ...current,
      timer: startTimer(current.timer.presetId, selectedCourse.id, Date.now()),
    }));
  }

  function togglePause() {
    setData((current) => ({
      ...current,
      timer: current.timer.isRunning
        ? pauseTimer(current.timer, Date.now())
        : resumeTimer(current.timer, Date.now()),
    }));
  }

  function handleSkipBreak() {
    setData((current) => ({ ...current, timer: skipBreak(current.timer, Date.now()) }));
  }

  function handleFinishEarly() {
    setData((current) => ({ ...current, timer: finishEarly(current.timer, Date.now()) }));
  }

  function discardSession() {
    setData((current) => ({ ...current, timer: createIdleTimer(current.timer.presetId) }));
    setNote("");
    setConfirmDiscard(false);
    setMessage("Session discarded.");
  }

  function finishSession() {
    const { timer } = data;
    if (timer.status !== "complete" || !timer.courseId || !timer.completionType) return;
    const course = data.courses.find((item) => item.id === timer.courseId);
    if (!course) {
      setMessage("The course for this session could not be found.");
      return;
    }

    const focusedSeconds = Math.max(1, Math.round(timer.focusedMs / 1000));
    const session: StudySession = {
      id: makeId(),
      courseId: course.id,
      courseName: course.name,
      presetId: timer.presetId,
      type: timer.completionType,
      focusedSeconds,
      completedAt: new Date().toISOString(),
      note: note.trim(),
    };

    setData((current) => ({
      ...current,
      courses: current.courses.map((item) =>
        item.id === course.id
          ? {
              ...item,
              totalFocusedSeconds: item.totalFocusedSeconds + focusedSeconds,
              sessionsCompleted: item.sessionsCompleted + 1,
            }
          : item,
      ),
      sessions: [session, ...current.sessions].slice(0, 100),
      selectedCourseId: course.id,
      timer: createIdleTimer(timer.presetId),
    }));
    setNote("");
    setMessage("Session saved.");
  }

  function addCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCourseName.trim();
    if (!name) return;
    const existing = data.courses.find((course) => course.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setData((current) => ({ ...current, selectedCourseId: existing.id }));
      setNewCourseName("");
      setShowCourseForm(false);
      setMessage("Course selected.");
      return;
    }
    const course: Course = {
      id: makeId(),
      name,
      totalFocusedSeconds: 0,
      sessionsCompleted: 0,
      createdAt: new Date().toISOString(),
    };
    setData((current) => ({
      ...current,
      courses: [...current.courses, course],
      selectedCourseId: course.id,
    }));
    setNewCourseName("");
    setShowCourseForm(false);
    setMessage("Course added.");
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="Study Pomodoro home">
          <span className="brand__mark"><span /></span>
          <span>
            <strong>Study</strong>
            <small>Pomodoro</small>
          </span>
        </a>
        <div className="topbar__metrics" aria-label="Study totals">
          <div>
            <span>Today</span>
            <strong>{formatDuration(todaySeconds)}</strong>
          </div>
          <div>
            <span>All time</span>
            <strong>{formatDuration(allTimeSeconds)}</strong>
          </div>
          <span className="storage-state"><i /> saved locally</span>
        </div>
      </header>

      <main id="main-content" className="workspace">
        <section className="timer-panel" aria-labelledby="timer-heading">
          <div className="timer-panel__intro">
            <div>
              <p className="eyebrow">Focused minutes / not lesson counts</p>
              <h1 id="timer-heading">Make the next block count.</h1>
            </div>
            <div className="course-chip" title={timerCourse?.name ?? "No course selected"}>
              <CourseIcon />
              <span>{timerCourse?.name ?? "Choose a course"}</span>
            </div>
          </div>

          <div className="preset-switcher" aria-label="Session preset">
            {(Object.values(PRESETS) as (typeof PRESETS)[PresetId][]).map((item) => (
              <button
                key={item.id}
                type="button"
                className={data.timer.presetId === item.id ? "is-active" : ""}
                onClick={() => choosePreset(item.id)}
                disabled={!isIdle}
                aria-pressed={data.timer.presetId === item.id}
              >
                <span>{item.name}</span>
                <small>{item.phases.map((part) => part.durationSeconds / 60).join(" · ")}</small>
              </button>
            ))}
          </div>

          <div className="timer-stage">
            <div className="timer-stage__instrument">
              <OrbitTimer timer={data.timer} />
            </div>

            <div className="phase-rail" aria-label="Session phases">
              {preset.phases.map((item, index) => {
                const isCurrent = index === data.timer.phaseIndex;
                const isDone =
                  index < data.timer.phaseIndex ||
                  (data.timer.status === "complete" && data.timer.completionType !== "Partial");
                return (
                  <div
                    key={item.id}
                    className={`phase-rail__item ${isCurrent ? "is-current" : ""} ${isDone ? "is-done" : ""}`}
                  >
                    <span>{isDone ? <CheckIcon /> : item.shortLabel}</span>
                    <div>
                      <strong>{item.kind === "focus" ? `Focus ${index === 0 ? "one" : "two"}` : "Break"}</strong>
                      <small>{item.durationSeconds / 60} min</small>
                    </div>
                  </div>
                );
              })}
            </div>

            {data.timer.status !== "complete" ? (
              <div className="controls">
                {isIdle ? (
                  <button className="primary-action" type="button" onClick={beginSession}>
                    <PlayIcon />
                    Start {preset.name.toLowerCase()} session
                    <ArrowIcon className="primary-action__arrow" />
                  </button>
                ) : (
                  <>
                    <button className="primary-action primary-action--compact" type="button" onClick={togglePause}>
                      {data.timer.isRunning ? <PauseIcon /> : <PlayIcon />}
                      {data.timer.isRunning ? "Pause" : "Resume"}
                    </button>
                    {phase.kind === "break" && (
                      <button className="secondary-action" type="button" onClick={handleSkipBreak}>
                        <SkipIcon /> Skip break
                      </button>
                    )}
                    <button
                      className="text-action"
                      type="button"
                      onClick={handleFinishEarly}
                      disabled={!canFinishEarly(data.timer)}
                      title={canFinishEarly(data.timer) ? "Save this as a partial session" : "Available after one focus block"}
                    >
                      Finish early
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="completion-card">
                <div className="completion-card__heading">
                  <span><CheckIcon /></span>
                  <div>
                    <p>{data.timer.completionType} session</p>
                    <h2>{formatDuration(data.timer.focusedMs / 1000)} of clear focus.</h2>
                  </div>
                </div>
                <label htmlFor="progress-note">What did you move forward?</label>
                <div className="note-field">
                  <input
                    id="progress-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value.slice(0, 120))}
                    placeholder="VPC lessons 3–6 + demo"
                    maxLength={120}
                  />
                  <span>{note.length}/120</span>
                </div>
                <button className="primary-action" type="button" onClick={finishSession}>
                  <CheckIcon /> Finish session
                </button>
              </div>
            )}

            {data.timer.status === "active" && !data.timer.isRunning && (
              <div className="discard-row">
                {confirmDiscard ? (
                  <>
                    <span>Discard this session?</span>
                    <button type="button" onClick={discardSession}>Discard</button>
                    <button type="button" onClick={() => setConfirmDiscard(false)}>Keep it</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmDiscard(true)}>Reset session</button>
                )}
              </div>
            )}
          </div>

          <footer className="timer-panel__footer">
            <p><span>45m</span> is a valid minimum. <span>90m</span> is the target, never a punishment.</p>
            <span>{preset.focusMinutes}m focus · {preset.totalMinutes}m real time</span>
          </footer>
        </section>

        <aside className="ledger" aria-labelledby="courses-heading">
          <div className="ledger__header">
            <div>
              <p className="eyebrow">Study ledger</p>
              <h2 id="courses-heading">Your courses</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => setShowCourseForm((visible) => !visible)}
              disabled={!isIdle}
              aria-label="Add a course"
              aria-expanded={showCourseForm}
            >
              <PlusIcon />
            </button>
          </div>

          {showCourseForm && isIdle && (
            <form className="course-form" onSubmit={addCourse}>
              <label htmlFor="course-name">Course name</label>
              <div>
                <input
                  id="course-name"
                  autoFocus
                  value={newCourseName}
                  onChange={(event) => setNewCourseName(event.target.value.slice(0, 64))}
                  placeholder="AWS SAA — Cantrill"
                  maxLength={64}
                />
                <button type="submit" disabled={!newCourseName.trim()}>Add</button>
              </div>
            </form>
          )}

          <div className="course-list">
            {courseStats.map((course) => {
              const selected = course.id === data.selectedCourseId;
              return (
                <button
                  className={`course-row ${selected ? "is-selected" : ""}`}
                  key={course.id}
                  type="button"
                  onClick={() => isIdle && setData((current) => ({ ...current, selectedCourseId: course.id }))}
                  disabled={!isIdle}
                  aria-pressed={selected}
                >
                  <span className="course-row__indicator" />
                  <span className="course-row__body">
                    <strong>{course.name}</strong>
                    <small>{formatDuration(course.totalFocusedSeconds)} · {course.sessionsCompleted} {course.sessionsCompleted === 1 ? "session" : "sessions"}</small>
                  </span>
                  <span className="course-row__arrow">↗</span>
                </button>
              );
            })}
          </div>

          <section className="recent" aria-labelledby="recent-heading">
            <div className="recent__heading">
              <h3 id="recent-heading">Recent focus</h3>
              <span>{data.sessions.length} total</span>
            </div>
            {data.sessions.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__orbit"><i /></span>
                <p>Your first focused block will appear here.</p>
                <small>Time is the metric. Progress is the side effect.</small>
              </div>
            ) : (
              <ol className="session-list">
                {data.sessions.slice(0, 5).map((session) => (
                  <li key={session.id}>
                    <span className="session-list__check"><CheckIcon /></span>
                    <div>
                      <strong>{session.courseName}</strong>
                      <small>{session.note || `${session.type} session`}</small>
                    </div>
                    <div className="session-list__meta">
                      <strong>{formatDuration(session.focusedSeconds)}</strong>
                      <small>{formatSessionDate(session.completedAt)}</small>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <blockquote>
            “The timer measures how long you studied — not how much you should have finished.”
          </blockquote>
        </aside>
      </main>

      {message && <div className="toast" role="status">{message}</div>}
    </div>
  );
}

export default App;
