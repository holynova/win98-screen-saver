import { describe, expect, it } from "vitest";

describe("3D saver rendering boundary", () => {
  it("keeps the original WebGL-backed savers registered", async () => {
    const { savers } = await import("./index");
    expect(savers.find((saver) => saver.id === "pipes")?.description).toContain("圆管");
    expect(savers.find((saver) => saver.id === "maze")?.description).toContain("红砖墙");
  });
});
