export type SoundCue =
  | "start"
  | "pause"
  | "resume"
  | "focus"
  | "break"
  | "complete"
  | "save"
  | "tick";

export interface SoundSettings {
  enabled: boolean;
  volume: number;
}

interface Tone {
  frequency: number;
  delay: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
}

const SOUND_STORAGE_KEY = "study-pomodoro:sound:v1";

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.52,
};

const patterns: Record<SoundCue, Tone[]> = {
  start: [
    { frequency: 392, delay: 0, duration: 0.15, gain: 0.42, type: "sine" },
    { frequency: 523.25, delay: 0.09, duration: 0.24, gain: 0.34, type: "sine" },
  ],
  pause: [
    { frequency: 440, delay: 0, duration: 0.13, gain: 0.3, type: "triangle" },
    { frequency: 329.63, delay: 0.08, duration: 0.18, gain: 0.24, type: "sine" },
  ],
  resume: [
    { frequency: 329.63, delay: 0, duration: 0.12, gain: 0.27, type: "triangle" },
    { frequency: 440, delay: 0.08, duration: 0.2, gain: 0.3, type: "sine" },
  ],
  focus: [
    { frequency: 392, delay: 0, duration: 0.17, gain: 0.34, type: "sine" },
    { frequency: 523.25, delay: 0.11, duration: 0.26, gain: 0.38, type: "sine" },
    { frequency: 659.25, delay: 0.23, duration: 0.36, gain: 0.24, type: "triangle" },
  ],
  break: [
    { frequency: 659.25, delay: 0, duration: 0.2, gain: 0.25, type: "sine" },
    { frequency: 523.25, delay: 0.14, duration: 0.32, gain: 0.28, type: "sine" },
  ],
  complete: [
    { frequency: 523.25, delay: 0, duration: 0.3, gain: 0.32, type: "sine" },
    { frequency: 659.25, delay: 0.13, duration: 0.38, gain: 0.3, type: "sine" },
    { frequency: 783.99, delay: 0.27, duration: 0.5, gain: 0.28, type: "sine" },
    { frequency: 1046.5, delay: 0.48, duration: 0.72, gain: 0.2, type: "triangle" },
  ],
  save: [
    { frequency: 523.25, delay: 0, duration: 0.11, gain: 0.26, type: "sine" },
    { frequency: 783.99, delay: 0.07, duration: 0.2, gain: 0.24, type: "sine" },
  ],
  tick: [{ frequency: 587.33, delay: 0, duration: 0.075, gain: 0.18, type: "sine" }],
};

export function normalizeSoundSettings(value: unknown): SoundSettings {
  if (!value || typeof value !== "object") return DEFAULT_SOUND_SETTINGS;
  const candidate = value as Partial<SoundSettings>;
  return {
    enabled: typeof candidate.enabled === "boolean" ? candidate.enabled : DEFAULT_SOUND_SETTINGS.enabled,
    volume:
      typeof candidate.volume === "number" && Number.isFinite(candidate.volume)
        ? Math.min(1, Math.max(0, candidate.volume))
        : DEFAULT_SOUND_SETTINGS.volume,
  };
}

export function loadSoundSettings(): SoundSettings {
  try {
    const stored = localStorage.getItem(SOUND_STORAGE_KEY);
    return stored ? normalizeSoundSettings(JSON.parse(stored)) : DEFAULT_SOUND_SETTINGS;
  } catch {
    return DEFAULT_SOUND_SETTINGS;
  }
}

export function saveSoundSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(normalizeSoundSettings(settings)));
  } catch {
    // Sound preferences are non-critical; the timer remains fully usable.
  }
}

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

export class StudyAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private settings: SoundSettings;

  constructor(settings: SoundSettings = DEFAULT_SOUND_SETTINGS) {
    this.settings = normalizeSoundSettings(settings);
  }

  configure(settings: SoundSettings): void {
    this.settings = normalizeSoundSettings(settings);
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(this.settings.volume, this.context.currentTime, 0.025);
    }
  }

  play(cue: SoundCue): void {
    if (!this.settings.enabled || this.settings.volume <= 0) return;
    const context = this.ensureContext();
    if (!context || !this.master) return;

    if (context.state === "suspended") {
      void context.resume();
    }

    const startAt = context.currentTime + 0.012;
    for (const tone of patterns[cue]) {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const toneStart = startAt + tone.delay;
      const toneEnd = toneStart + tone.duration;

      oscillator.type = tone.type ?? "sine";
      oscillator.frequency.setValueAtTime(tone.frequency, toneStart);
      envelope.gain.setValueAtTime(0.0001, toneStart);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, tone.gain), toneStart + 0.018);
      envelope.gain.exponentialRampToValueAtTime(0.0001, toneEnd);

      oscillator.connect(envelope);
      envelope.connect(this.master);
      oscillator.start(toneStart);
      oscillator.stop(toneEnd + 0.025);
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.context && this.master) return this.context;

    const AudioContextConstructor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!AudioContextConstructor) return null;

    this.context = new AudioContextConstructor();
    this.master = this.context.createGain();
    this.master.gain.value = this.settings.volume;
    this.master.connect(this.context.destination);
    return this.context;
  }
}
