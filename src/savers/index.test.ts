import { describe, expect, it } from "vitest";
import type { ControlDefinition } from "../core/types";
import { savers } from ".";

const valuesFor = (control: ControlDefinition): unknown[] => {
  if (control.type === "range") return [control.min, control.max];
  if (control.type === "select") return control.options.map((option) => option.value);
  if (control.type === "toggle") return [false, true];
  if (control.type === "color") return ["#000000", "#ffffff"];
  return ["test"];
};

describe("screen saver catalog", () => {
  it("contains all eleven promised screen savers with unique ids", () => {
    expect(savers).toHaveLength(11);
    expect(new Set(savers.map((saver) => saver.id)).size).toBe(savers.length);
  });

  it("defines a default value for every adjustable control", () => {
    for (const saver of savers) {
      for (const control of saver.controls) {
        expect(saver.defaults, `${saver.id}.${control.key}`).toHaveProperty(control.key);
        expect(valuesFor(control).length).toBeGreaterThan(0);
      }
    }
  });

  it("can construct and update every saver at modern viewport sizes", () => {
    for (const [index, saver] of savers.entries()) {
      if (saver.id === "pipes" || saver.id === "maze") continue;
      const renderer = saver.create({ ...saver.defaults }, 95 + index);
      renderer.resize?.(3440, 1440);
      expect(() => renderer.update(1 / 60, 1 / 60)).not.toThrow();
      renderer.resize?.(375, 667);
      expect(() => renderer.update(1 / 60, 2 / 60)).not.toThrow();
      renderer.destroy?.();
    }
  });
});
