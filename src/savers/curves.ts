import { Random, wrap } from "../core/math";
import { booleanSetting, numberSetting } from "../core/settings";
import type { SaverDefinition, SaverSettings, ScreenSaver } from "../core/types";

interface ControlPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

class CurvesSaver implements ScreenSaver {
  private readonly random: Random;
  private readonly points: ControlPoint[];
  private readonly trails: Array<Array<{ x: number; y: number }>> = [];
  private width = 640;
  private height = 480;
  private hue = 0;
  private readonly speed: number;
  private readonly trailCount: number;
  private readonly colorCycle: boolean;

  constructor(settings: SaverSettings, seed: number) {
    this.random = new Random(seed);
    this.speed = numberSetting(settings, "speed", 1);
    this.trailCount = numberSetting(settings, "trails", 18);
    this.colorCycle = booleanSetting(settings, "colorCycle", true);
    this.points = Array.from({ length: 4 }, () => this.makePoint());
  }

  resize(width: number, height: number): void {
    const sx = width / this.width;
    const sy = height / this.height;
    this.points.forEach((point) => {
      point.x *= sx;
      point.y *= sy;
    });
    this.width = width;
    this.height = height;
  }

  update(dt: number): void {
    const speed = Math.min(this.width, this.height) * 0.13 * this.speed;
    for (const point of this.points) {
      point.x += point.vx * speed * dt;
      point.y += point.vy * speed * dt;
      if (point.x <= 0 || point.x >= this.width) point.vx *= -1;
      if (point.y <= 0 || point.y >= this.height) point.vy *= -1;
      point.x = Math.max(0, Math.min(this.width, point.x));
      point.y = Math.max(0, Math.min(this.height, point.y));
    }
    this.hue = this.colorCycle ? wrap(this.hue + dt * 48, 360) : 192;
    const curve = Array.from({ length: 33 }, (_, index) => this.bezier(index / 32));
    this.trails.unshift(curve);
    this.trails.length = Math.min(this.trailCount, this.trails.length);
  }

  render(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    context.lineWidth = Math.max(1, Math.min(width, height) / 500);
    this.trails.forEach((curve, trailIndex) => {
      const alpha = 1 - trailIndex / Math.max(1, this.trails.length + 1);
      context.strokeStyle = `hsla(${wrap(this.hue - trailIndex * 6, 360)},100%,64%,${alpha})`;
      context.beginPath();
      curve.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
      context.stroke();
    });
  }

  private bezier(t: number): { x: number; y: number } {
    const mt = 1 - t;
    const [a, b, c, d] = this.points as [ControlPoint, ControlPoint, ControlPoint, ControlPoint];
    return {
      x: mt ** 3 * a.x + 3 * mt ** 2 * t * b.x + 3 * mt * t ** 2 * c.x + t ** 3 * d.x,
      y: mt ** 3 * a.y + 3 * mt ** 2 * t * b.y + 3 * mt * t ** 2 * c.y + t ** 3 * d.y,
    };
  }

  private makePoint(): ControlPoint {
    const angle = this.random.range(0, Math.PI * 2);
    return { x: this.random.range(0, this.width), y: this.random.range(0, this.height), vx: Math.cos(angle), vy: Math.sin(angle) };
  }
}

export const curvesSaver: SaverDefinition = {
  id: "curves",
  name: "曲线与色彩",
  description: "连续生成明亮的贝塞尔曲线，以老式 VGA 色彩在黑幕上堆叠。",
  defaults: { trails: 18, speed: 1, colorCycle: true },
  controls: [
    { type: "range", key: "trails", label: "曲线数量", min: 3, max: 40, step: 1, minLabel: "少", maxLabel: "多" },
    { type: "range", key: "speed", label: "速度", min: 0.25, max: 2.6, step: 0.05, minLabel: "慢", maxLabel: "快" },
    { type: "toggle", key: "colorCycle", label: "循环变化颜色" },
  ],
  create: (settings, seed) => new CurvesSaver(settings, seed),
};
