import { describe, expect, it } from "vitest";
import { longDate, puzzleDate } from "./date";

describe("puzzleDate", () => {
  it("turns over at 3 a.m. Eastern", () => {
    // 2:59 and 3:00 a.m. EDT on September 25, 2026.
    expect(puzzleDate(new Date("2026-09-25T06:59:00Z"))).toBe("2026-09-24");
    expect(puzzleDate(new Date("2026-09-25T07:00:00Z"))).toBe("2026-09-25");
  });

  it("follows standard time in winter", () => {
    // 3:00 a.m. EST on January 10, 2027.
    expect(puzzleDate(new Date("2027-01-10T07:59:00Z"))).toBe("2027-01-09");
    expect(puzzleDate(new Date("2027-01-10T08:00:00Z"))).toBe("2027-01-10");
  });
});

describe("puzzleDate on clock changes", () => {
  it("turns over at 3 a.m. EDT on the spring-forward day", () => {
    // 2027-03-14: 2 a.m. EST jumps to 3 a.m. EDT at 07:00Z.
    expect(puzzleDate(new Date("2027-03-14T06:59:00Z"))).toBe("2027-03-13");
    expect(puzzleDate(new Date("2027-03-14T07:00:00Z"))).toBe("2027-03-14");
  });

  it("turns over at 3 a.m. EST on the fall-back day", () => {
    // 2026-11-01: 2 a.m. EDT falls back to 1 a.m. EST at 06:00Z, so 3 a.m. EST is 08:00Z.
    expect(puzzleDate(new Date("2026-11-01T07:59:00Z"))).toBe("2026-10-31");
    expect(puzzleDate(new Date("2026-11-01T08:00:00Z"))).toBe("2026-11-01");
  });
});

describe("longDate", () => {
  it("spells out the month", () => {
    expect(longDate("2026-09-25")).toBe("September 25, 2026");
  });
});
