import { describe, expect, it } from "vitest";
import { DEFAULT_SOUND_SETTINGS, normalizeSoundSettings } from "./audio";

describe("sound preferences", () => {
  it("uses safe defaults for invalid data", () => {
    expect(normalizeSoundSettings(null)).toEqual(DEFAULT_SOUND_SETTINGS);
    expect(normalizeSoundSettings({ enabled: "yes", volume: "loud" })).toEqual(DEFAULT_SOUND_SETTINGS);
  });

  it("clamps volume to the supported range", () => {
    expect(normalizeSoundSettings({ enabled: false, volume: 4 })).toEqual({ enabled: false, volume: 1 });
    expect(normalizeSoundSettings({ enabled: true, volume: -2 })).toEqual({ enabled: true, volume: 0 });
  });
});
