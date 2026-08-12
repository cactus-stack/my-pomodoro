import { useEffect, useMemo, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { OrbitTimer } from "./components/OrbitTimer";
import {
  ArrowIcon,
  CheckIcon,
  ChevronIcon,
  CourseIcon,
  FocusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SkipIcon,
  SoundOffIcon,
  SoundOnIcon,
} from "./components/Icons";
import { useWakeLock } from "./hooks/useWakeLock";
import { StudyAudio, loadSoundSettings, saveSoundSettings } from "./lib/audio";
import { formatDuration, formatSessionDate, getTodaySeconds } from "./lib/format";
import {
  loadFocusSyncSettings,
  runFocusShortcut,
  saveFocusSyncSettings,
  shouldUseStudyFocus,
} from "./lib/focus";
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

gsap.registerPlugin(useGSAP, ScrollTrigger);

const principleWords = "A good session is measured by the attention you protected, not the pages you crossed.".split(" ");
const marqueePhrases = [
  "focused minutes over lesson counts",
  "a partial session still counts",
  "pause to think",
  "review the error",
  "protect the next block",
];

function App() {
  const appRef = useRef<HTMLDivElement>(null);
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
  const [recentIndex, setRecentIndex] = useState(0);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [soundSettings, setSoundSettings] = useState(loadSoundSettings);
  const [focusSyncSettings, setFocusSyncSettings] = useState(loadFocusSyncSettings);
  const audioRef = useRef<StudyAudio | null>(null);
  const focusIntentRef = useRef<boolean | null>(null);
  const previousTimerRef = useRef({
    status: data.timer.status,
    phaseIndex: data.timer.phaseIndex,
  });

  if (!audioRef.current) {
    audioRef.current = new StudyAudio(soundSettings);
  }

  const preset = PRESETS[data.timer.presetId];
  const phase = preset.phases[data.timer.phaseIndex];
  const selectedCourse = data.courses.find((course) => course.id === data.selectedCourseId) ?? null;
  const timerCourse = data.courses.find((course) => course.id === data.timer.courseId) ?? selectedCourse;
  const todaySeconds = getTodaySeconds(data.sessions);
  const allTimeSeconds = data.courses.reduce((sum, course) => sum + course.totalFocusedSeconds, 0);
  const recentSessions = data.sessions.slice(0, 8);
  const activeRecentSession = recentSessions[recentIndex] ?? null;
  const isIdle = data.timer.status === "idle";
  const wakeLockHeld = useWakeLock(data.timer.status === "active" && data.timer.isRunning);
  const studyFocusWanted = shouldUseStudyFocus(data.timer);

  const courseStats = useMemo(
    () => [...data.courses].sort((a, b) => b.totalFocusedSeconds - a.totalFocusedSeconds),
    [data.courses],
  );

  useEffect(() => {
    setStorageAvailable(saveData(data));
  }, [data]);

  useEffect(() => {
    audioRef.current?.configure(soundSettings);
    saveSoundSettings(soundSettings);
  }, [soundSettings]);

  useEffect(() => {
    saveFocusSyncSettings(focusSyncSettings);
  }, [focusSyncSettings]);

  useEffect(() => {
    if (data.timer.status !== "active" || !data.timer.isRunning) return;
    const timerId = window.setInterval(() => {
      setData((current) => ({ ...current, timer: advanceTimer(current.timer, Date.now()) }));
    }, 500);
    return () => window.clearInterval(timerId);
  }, [data.timer.isRunning, data.timer.status]);

  useEffect(() => {
    const previous = previousTimerRef.current;
    if (previous.status === "active" && data.timer.status === "complete") {
      audioRef.current?.play("complete");
    } else if (data.timer.status === "active" && previous.phaseIndex !== data.timer.phaseIndex) {
      audioRef.current?.play(phase.kind === "break" ? "break" : "focus");
    }
    previousTimerRef.current = {
      status: data.timer.status,
      phaseIndex: data.timer.phaseIndex,
    };
  }, [data.timer.phaseIndex, data.timer.status, phase.kind]);

  useEffect(() => {
    const previousIntent = focusIntentRef.current;
    focusIntentRef.current = studyFocusWanted;

    if (!focusSyncSettings.enabled) return;

    if (previousIntent === null) {
      if (data.timer.status === "active") {
        runFocusShortcut(studyFocusWanted ? "on" : "off", data.timer.remainingMs);
      }
      return;
    }

    if (previousIntent !== studyFocusWanted) {
      runFocusShortcut(studyFocusWanted ? "on" : "off", data.timer.remainingMs);
    }
  }, [
    data.timer.phaseIndex,
    data.timer.remainingMs,
    data.timer.status,
    focusSyncSettings.enabled,
    studyFocusWanted,
  ]);

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

  useEffect(() => {
    if (recentIndex > Math.max(0, recentSessions.length - 1)) setRecentIndex(0);
  }, [recentIndex, recentSessions.length]);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from(".topbar > *", {
        y: -16,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
      });
      gsap.from(".timer-panel__intro > *", {
        y: 24,
        opacity: 0,
        duration: 0.9,
        stagger: 0.09,
        ease: "power3.out",
        delay: 0.12,
      });
      gsap.from(".ledger", {
        x: 24,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        delay: 0.2,
      });
      gsap.fromTo(
        ".timer-stage__instrument",
        { scale: 0.88, opacity: 0.45 },
        {
          scale: 1,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".timer-panel",
            start: "top 92%",
            end: "top 28%",
            scrub: 0.7,
          },
        },
      );
      gsap.fromTo(
        ".principle__word",
        { opacity: 0.12, y: 20 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.08,
          ease: "none",
          scrollTrigger: {
            trigger: ".principle",
            start: "top 78%",
            end: "bottom 74%",
            scrub: 0.8,
          },
        },
      );
    },
    { scope: appRef },
  );

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        ".orbit__content > *",
        { y: 8, opacity: 0.25 },
        { y: 0, opacity: 1, duration: 0.48, stagger: 0.045, ease: "power3.out" },
      );
    },
    {
      scope: appRef,
      dependencies: [data.timer.phaseIndex, data.timer.status],
      revertOnUpdate: true,
    },
  );

  function choosePreset(presetId: PresetId) {
    if (!isIdle) return;
    audioRef.current?.play("tick");
    setData((current) => ({ ...current, timer: createIdleTimer(presetId) }));
  }

  function selectCourse(courseId: string) {
    if (!isIdle) {
      setMessage("The course stays locked while a session is active.");
      return;
    }
    audioRef.current?.play("tick");
    setData((current) => ({ ...current, selectedCourseId: courseId }));
  }

  function beginSession() {
    if (!selectedCourse) {
      setMessage("Choose a course before starting.");
      return;
    }
    audioRef.current?.play("start");
    setConfirmDiscard(false);
    setNote("");
    const firstPhaseMs = PRESETS[data.timer.presetId].phases[0].durationSeconds * 1000;
    setData((current) => ({
      ...current,
      timer: startTimer(current.timer.presetId, selectedCourse.id, Date.now()),
    }));
    requestStudyFocus(true, firstPhaseMs);
  }

  function togglePause() {
    const nextFocusWanted = !data.timer.isRunning && phase.kind === "focus";
    audioRef.current?.play(data.timer.isRunning ? "pause" : "resume");
    setData((current) => ({
      ...current,
      timer: current.timer.isRunning
        ? pauseTimer(current.timer, Date.now())
        : resumeTimer(current.timer, Date.now()),
    }));
    if (nextFocusWanted !== studyFocusWanted) {
      requestStudyFocus(nextFocusWanted, data.timer.remainingMs);
    }
  }

  function handleSkipBreak() {
    const nextPhase = preset.phases[data.timer.phaseIndex + 1];
    setData((current) => ({ ...current, timer: skipBreak(current.timer, Date.now()) }));
    if (nextPhase?.kind === "focus") {
      requestStudyFocus(true, nextPhase.durationSeconds * 1000);
    }
  }

  function handleFinishEarly() {
    setData((current) => ({ ...current, timer: finishEarly(current.timer, Date.now()) }));
    if (canFinishEarly(data.timer) && studyFocusWanted) requestStudyFocus(false);
  }

  function discardSession() {
    audioRef.current?.play("pause");
    setData((current) => ({ ...current, timer: createIdleTimer(current.timer.presetId) }));
    setNote("");
    setConfirmDiscard(false);
    setMessage("Session discarded.");
    requestStudyFocus(false, undefined, false);
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

    audioRef.current?.play("save");
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
    setRecentIndex(0);
    setNote("");
    setMessage("Session saved.");
  }

  function addCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCourseName.trim();
    if (!name) return;
    const existing = data.courses.find((course) => course.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      selectCourse(existing.id);
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
    audioRef.current?.play("save");
    setData((current) => ({
      ...current,
      courses: [...current.courses, course],
      selectedCourseId: course.id,
    }));
    setNewCourseName("");
    setShowCourseForm(false);
    setMessage("Course added.");
  }

  function toggleSound() {
    setSoundSettings((current) => {
      const next = { ...current, enabled: !current.enabled };
      audioRef.current?.configure(next);
      if (next.enabled) audioRef.current?.play("resume");
      return next;
    });
  }

  function changeVolume(value: number) {
    setSoundSettings((current) => ({ ...current, volume: Math.min(1, Math.max(0, value)) }));
  }

  function requestStudyFocus(active: boolean, remainingMs?: number, notify = true) {
    focusIntentRef.current = active;
    if (!focusSyncSettings.enabled) return;

    const requested = runFocusShortcut(active ? "on" : "off", remainingMs);
    if (notify) {
      setMessage(
        requested
          ? `Study Focus ${active ? "activation" : "deactivation"} requested.`
          : "This browser could not open the Study Focus shortcut.",
      );
    }
  }

  function toggleFocusSync() {
    const nextEnabled = !focusSyncSettings.enabled;
    setFocusSyncSettings({ enabled: nextEnabled });
    focusIntentRef.current = studyFocusWanted;

    if (nextEnabled) {
      if (data.timer.status === "active") {
        const requested = runFocusShortcut(
          studyFocusWanted ? "on" : "off",
          data.timer.remainingMs,
        );
        setMessage(
          requested
            ? "Study Focus sync enabled and current phase requested."
            : "Focus sync enabled, but this browser could not open Shortcuts.",
        );
      } else {
        setMessage("Study Focus sync enabled.");
      }
      return;
    }

    if (studyFocusWanted) runFocusShortcut("off");
    setMessage("Study Focus sync disabled.");
  }

  function moveRecent(direction: -1 | 1) {
    if (recentSessions.length < 2) return;
    audioRef.current?.play("tick");
    setRecentIndex((current) => (current + direction + recentSessions.length) % recentSessions.length);
  }

  return (
    <div ref={appRef} className="app-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="Study Pomodoro home">
          <span className="brand__mark"><span /></span>
          <span>
            <strong>Study Pomodoro</strong>
            <small>Attention instrument</small>
          </span>
        </a>

        <div className="topbar__controls">
          <div className="topbar__metrics" aria-label="Study totals">
            <div>
              <span>Today</span>
              <strong>{formatDuration(todaySeconds)}</strong>
            </div>
            <div>
              <span>All time</span>
              <strong>{formatDuration(allTimeSeconds)}</strong>
            </div>
          </div>

          <div className="sound-mixer">
            <button
              type="button"
              className="sound-mixer__toggle"
              onClick={toggleSound}
              aria-pressed={soundSettings.enabled}
              aria-label={soundSettings.enabled ? "Mute timer sounds" : "Enable timer sounds"}
              title={soundSettings.enabled ? "Mute timer sounds" : "Enable timer sounds"}
            >
              {soundSettings.enabled ? <SoundOnIcon /> : <SoundOffIcon />}
            </button>
            <label>
              <span>Sound</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(soundSettings.volume * 100)}
                disabled={!soundSettings.enabled}
                onChange={(event) => changeVolume(Number(event.target.value) / 100)}
                onPointerUp={() => audioRef.current?.play("tick")}
                aria-label={`Sound volume ${Math.round(soundSettings.volume * 100)} percent`}
              />
            </label>
          </div>

          <span className={`storage-state ${storageAvailable ? "is-saved" : "is-error"}`}>
            <i /> {storageAvailable ? "Saved locally" : "Storage unavailable"}
          </span>
        </div>
      </header>

      <main id="main-content">
        <div className="workspace">
          <section className="timer-panel" aria-labelledby="timer-heading">
            <header className="timer-panel__intro">
              <p className="intro-line">Focused minutes, not lesson counts.</p>
              <h1 id="timer-heading">
                <span>Guard your attention.</span>
                <em>Track the minutes.</em>
              </h1>
              <div className="course-chip" title={timerCourse?.name ?? "No course selected"}>
                <CourseIcon />
                <span>{timerCourse?.name ?? "Choose a course"}</span>
              </div>
            </header>

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
              <p><span>45m</span> is valid. <span>90m</span> is the target, never a punishment.</p>
              <div className="timer-panel__states">
                <button
                  className={`focus-sync ${focusSyncSettings.enabled ? "is-enabled" : ""} ${studyFocusWanted ? "is-active" : ""}`}
                  type="button"
                  onClick={toggleFocusSync}
                  aria-pressed={focusSyncSettings.enabled}
                  title="Synchronize the macOS Study Focus through Apple Shortcuts"
                >
                  <FocusIcon />
                  <span>{focusSyncSettings.enabled ? "Study sync on" : "Study sync off"}</span>
                  <i />
                </button>
                <span className={wakeLockHeld ? "wake-state is-active" : "wake-state"}>
                  <i /> {wakeLockHeld ? "Screen awake" : `${preset.focusMinutes}m focus · ${preset.totalMinutes}m real`}
                </span>
              </div>
            </footer>
          </section>

          <aside className="ledger" aria-labelledby="courses-heading">
            <header className="ledger__header">
              <div>
                <p className="section-intro">Choose the work</p>
                <h2 id="courses-heading">Course desk</h2>
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
            </header>

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
                    onClick={() => selectCourse(course.id)}
                    aria-pressed={selected}
                    aria-disabled={!isIdle}
                  >
                    <span className="course-row__indicator" />
                    <span className="course-row__body">
                      <strong>{course.name}</strong>
                      <small>
                        {formatDuration(course.totalFocusedSeconds)} · {course.sessionsCompleted}{" "}
                        {course.sessionsCompleted === 1 ? "session" : "sessions"}
                      </small>
                    </span>
                    <ChevronIcon className="course-row__arrow" />
                    <span className="course-row__detail">
                      {selected ? "Selected for the next block" : "Select course"}
                    </span>
                  </button>
                );
              })}
            </div>

            <section className="recent" aria-labelledby="recent-heading">
              <div className="recent__heading">
                <div>
                  <p className="section-intro">What moved</p>
                  <h3 id="recent-heading">Recent focus</h3>
                </div>
                <div className="carousel-controls" aria-label="Browse recent sessions">
                  <button
                    type="button"
                    onClick={() => moveRecent(-1)}
                    disabled={recentSessions.length < 2}
                    aria-label="Previous session"
                  >
                    <ChevronIcon />
                  </button>
                  <span>{recentSessions.length ? `${recentIndex + 1} / ${recentSessions.length}` : "0 / 0"}</span>
                  <button
                    type="button"
                    onClick={() => moveRecent(1)}
                    disabled={recentSessions.length < 2}
                    aria-label="Next session"
                  >
                    <ChevronIcon />
                  </button>
                </div>
              </div>

              {activeRecentSession ? (
                <article className="session-card" key={activeRecentSession.id}>
                  <span className="session-card__check"><CheckIcon /></span>
                  <blockquote>
                    {activeRecentSession.note || `${activeRecentSession.type} session completed.`}
                  </blockquote>
                  <footer>
                    <div>
                      <strong>{activeRecentSession.courseName}</strong>
                      <small>{formatSessionDate(activeRecentSession.completedAt)}</small>
                    </div>
                    <strong>{formatDuration(activeRecentSession.focusedSeconds)}</strong>
                  </footer>
                </article>
              ) : (
                <div className="empty-state">
                  <span className="empty-state__orbit"><i /></span>
                  <p>Your first focused block will appear here.</p>
                  <small>Time is the metric. Progress is the side effect.</small>
                </div>
              )}
            </section>

            <blockquote className="ledger-quote">
              The timer measures how long you studied, not how much you should have finished.
            </blockquote>
          </aside>
        </div>

        <section className="principle" aria-labelledby="principle-heading">
          <div>
            <p className="section-intro">The rule that matters</p>
            <h2 id="principle-heading">
              {principleWords.map((word, index) => (
                <span className="principle__word" key={`${word}-${index}`}>{word}{" "}</span>
              ))}
            </h2>
          </div>
          <aside>
            <strong>45</strong>
            <span>minutes</span>
            <p>A minimum valid session. Stop turning a hard day into a failed day.</p>
          </aside>
        </section>

        <div className="principle-marquee" aria-hidden="true">
          {[0, 1].map((track) => (
            <div key={track}>
              {marqueePhrases.map((phrase) => <span key={`${track}-${phrase}`}>{phrase}<i /></span>)}
            </div>
          ))}
        </div>
      </main>

      <footer className="app-footer">
        <span>Study Pomodoro</span>
        <span>Local-first · no accounts · no lesson quotas</span>
      </footer>

      {message && <div className="toast" role="status">{message}</div>}
    </div>
  );
}

export default App;
