import { describe, expect, it } from "vitest";
import { Random, clamp, projectPoint, rotatePoint, wrap } from "./math";

describe("math helpers", () => {
  it("creates deterministic random sequences", () => {
    const first = new Random(98);
    const second = new Random(98);
    expect(Array.from({ length: 12 }, () => first.next())).toEqual(Array.from({ length: 12 }, () => second.next()));
  });

  it("keeps utility values inside their expected domain", () => {
    expect(clamp(12, 0, 8)).toBe(8);
    expect(clamp(-2, 0, 8)).toBe(0);
    expect(wrap(-20, 360)).toBe(340);
  });

  it("projects the center of 3D space into the canvas center", () => {
    expect(projectPoint({ x: 0, y: 0, z: 0 }, 1920, 1080)).toMatchObject({ x: 960, y: 540 });
    const rotated = rotatePoint({ x: 1, y: 0, z: 0 }, 0, Math.PI / 2);
    expect(rotated.x).toBeCloseTo(0, 8);
    expect(rotated.z).toBeCloseTo(-1, 8);
  });
});
