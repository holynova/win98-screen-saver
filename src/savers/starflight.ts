import { Random } from "../core/math";
import { numberSetting } from "../core/settings";
import type { SaverDefinition, SaverSettings, ScreenSaver } from "../core/types";

interface Star {
  x: number;
  y: number;
  z: number;
  previousZ: number;
  rotation: number;
}

class StarflightSaver implements ScreenSaver {
  private stars: Star[] = [];
  private readonly random: Random;
  private readonly speed: number;
  private readonly density: number;

  constructor(settings: SaverSettings, seed: number, private readonly logos: boolean) {
    this.random = new Random(seed);
    this.speed = numberSetting(settings, "speed", logos ? 0.72 : 1.45);
    this.density = numberSetting(settings, "density", logos ? 18 : 150);
    this.resetPopulation();
  }

  update(dt: number): void {
    for (const star of this.stars) {
      star.previousZ = star.z;
      star.z -= dt * this.speed * (this.logos ? 0.38 : 1);
      star.rotation += dt * 0.38;
      if (star.z < 0.12) this.resetStar(star, true);
    }
  }

  render(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    const focal = Math.min(width, height) * 0.63;
    const spread = this.logos ? 1.08 : 1.35;
    for (const star of this.stars) {
      const x = width / 2 + (star.x / star.z) * focal * spread;
      const y = height / 2 + (star.y / star.z) * focal;
      if (x < -80 || x > width + 80 || y < -80 || y > height + 80) {
        this.resetStar(star, true);
        continue;
      }
      if (this.logos) {
        const size = Math.max(3, Math.min(82, (1 / star.z) * Math.min(width, height) * 0.035));
        this.drawFlag(context, x, y, size, star.rotation);
      } else {
        const previousX = width / 2 + (star.x / star.previousZ) * focal * spread;
        const previousY = height / 2 + (star.y / star.previousZ) * focal;
        const brightness = Math.round(110 + (1 - Math.min(1, star.z / 4)) * 145);
        context.strokeStyle = `rgb(${brightness},${brightness},${brightness})`;
        context.lineWidth = Math.max(1, Math.min(3.5, 2.8 / star.z));
        context.beginPath();
        context.moveTo(previousX, previousY);
        context.lineTo(x, y);
        context.stroke();
      }
    }
  }

  private resetPopulation(): void {
    const count = Math.max(1, Math.round(this.density));
    this.stars = Array.from({ length: count }, () => {
      const star: Star = { x: 0, y: 0, z: 1, previousZ: 1, rotation: 0 };
      this.resetStar(star, false);
      star.z = this.random.range(0.4, 4.8);
      star.previousZ = star.z;
      return star;
    });
  }

  private resetStar(star: Star, far: boolean): void {
    star.x = this.random.range(-1.6, 1.6);
    star.y = this.random.range(-1, 1);
    star.z = far ? this.random.range(4, 5) : this.random.range(0.3, 5);
    star.previousZ = star.z;
    star.rotation = this.random.range(-0.22, 0.22);
  }

  private drawFlag(context: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number): void {
    const colors = ["#f04b32", "#54a846", "#2d78c5", "#f6c741"];
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.transform(1, -0.12, 0.18, 1, 0, 0);
    const pane = size * 0.44;
    const gap = Math.max(1, size * 0.07);
    for (let index = 0; index < 4; index += 1) {
      const column = index % 2;
      const row = Math.floor(index / 2);
      context.fillStyle = colors[index]!;
      context.fillRect((column - 1) * gap / 2 + (column - 0.5) * pane, (row - 1) * gap / 2 + (row - 0.5) * pane, pane, pane);
    }
    context.restore();
  }
}

const speedControl = { type: "range" as const, key: "speed", label: "飞行速度", min: 0.35, max: 3.5, step: 0.05, minLabel: "慢", maxLabel: "快" };

export const starfieldSaver: SaverDefinition = {
  id: "starfield",
  name: "飞越星空",
  description: "白色星点从画面中心高速掠过，自动填满任何宽高比。",
  defaults: { density: 150, speed: 1.45 },
  controls: [
    { type: "range", key: "density", label: "星星密度", min: 30, max: 320, step: 10, minLabel: "稀疏", maxLabel: "密集" },
    speedControl,
  ],
  create: (settings, seed) => new StarflightSaver(settings, seed, false),
};

export const flyingWindowsSaver: SaverDefinition = {
  id: "flying-windows",
  name: "飞行的 Windows",
  description: "彩色四格窗口从远处飞来，保留 90 年代的低多边形节奏。",
  defaults: { density: 18, speed: 0.72 },
  controls: [
    { type: "range", key: "density", label: "窗口数量", min: 6, max: 48, step: 1, minLabel: "少", maxLabel: "多" },
    speedControl,
  ],
  create: (settings, seed) => new StarflightSaver(settings, seed, true),
};
