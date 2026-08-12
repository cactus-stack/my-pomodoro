import { describe, expect, it } from "vitest";
import { formatClock, formatElapsedClock } from "./format";

describe("timer clock formatting", () => {
  it("rounds remaining time up and elapsed time down", () => {
    expect(formatClock(2_999)).toBe("00:03");
    expect(formatElapsedClock(2_999)).toBe("00:02");
  });
});
