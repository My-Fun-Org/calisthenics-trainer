import { describe, expect, it } from "vitest";
import { canToggleSet } from "./sets";

describe("set order", () => {
  it("only allows the next unfinished set to be checked", () => {
    expect(canToggleSet([false, false, false], 0)).toBe(true);
    expect(canToggleSet([false, false, false], 2)).toBe(false);
    expect(canToggleSet([true, false, false], 1)).toBe(true);
    expect(canToggleSet([true, false, false], 2)).toBe(false);
  });

  it("only allows the latest finished set to be unchecked", () => {
    expect(canToggleSet([true, true, false], 1)).toBe(true);
    expect(canToggleSet([true, true, false], 0)).toBe(false);
    expect(canToggleSet([true, true, true], 2)).toBe(true);
    expect(canToggleSet([true, true, true], 0)).toBe(false);
  });
});
