import { describe, expect, it } from "vitest";
import { formatRestClock, restSecondsFor, tickRest } from "./rest";

describe("set rest countdown", () => {
  it("gives a longer rest as difficulty goes up", () => {
    expect(restSecondsFor("beginner")).toBe(60);
    expect(restSecondsFor("intermediate")).toBe(90);
    expect(restSecondsFor("advanced")).toBe(120);
  });

  it("uses a settings override when one is saved", () => {
    expect(restSecondsFor("beginner", 45)).toBe(45);
    expect(restSecondsFor("advanced", 30)).toBe(30);
  });

  it("clamps a saved rest into a usable window", () => {
    expect(restSecondsFor("beginner", 5)).toBe(30);
    expect(restSecondsFor("beginner", 400)).toBe(180);
  });

  it("formats remaining seconds as m:ss", () => {
    expect(formatRestClock(90)).toBe("1:30");
    expect(formatRestClock(9)).toBe("0:09");
    expect(formatRestClock(0)).toBe("0:00");
  });

  it("ticks down to zero and does not go negative", () => {
    expect(tickRest(1)).toBe(0);
    expect(tickRest(0)).toBe(0);
  });
});
