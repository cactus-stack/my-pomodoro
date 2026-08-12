import { describe, expect, it } from "vitest";
import { getOrbitPoint, getSegmentFillLength } from "./orbit";

describe("orbit geometry", () => {
  it("does not create a stray progress cap at zero", () => {
    expect(getSegmentFillLength(200, 7, 0)).toBe(0);
    expect(getSegmentFillLength(200, 7, 1)).toBe(193);
  });

  it("moves one playhead around the orbit", () => {
    expect(getOrbitPoint(0, 10, 20, 20)).toEqual({ x: 30, y: 20 });
    const quarter = getOrbitPoint(0.25, 10, 20, 20);
    expect(quarter.x).toBeCloseTo(20);
    expect(quarter.y).toBeCloseTo(30);
  });
});
