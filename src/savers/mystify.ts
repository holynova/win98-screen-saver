import { Random, wrap } from "../core/math";
import { booleanSetting, numberSetting } from "../core/settings";
import type { SaverDefinition, SaverSettings, ScreenSaver } from "../core/types";

interface MovingPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

class MystifySaver implements ScreenSaver {
  private readonly random: Random;
  private readonly shapes: MovingPoint[][] = [];
  private readonly history: Array<Array<Array<{ x: number; y: number }>>> = [];
  private readonly trailCount: number;
  private readonly speed: number;
  private width = 640;
  private height = 480;
  private hue = 0;

  constructor(settings: SaverSettings, seed: number) {
    this.random = new Random(seed);
    this.trailCount = numberSetting(settings, "trails", 8);
    this.speed = numberSetting(settings, "speed", 1);
    const count = booleanSetting(settings, "secondShape", true) ? 2 : 1;
    for (let shapeIndex = 0; shapeIndex < count; shapeIndex += 1) {
      this.shapes.push(Array.from({ length: 4 }, () => this.makePoint()));
      this.history.push([]);
    }
  }

  resize(width: number, height: number): void {
    const scaleX = width / this.width;
    const scaleY = height / this.height;
    for (const shape of this.shapes) {
      for (const point of shape) {
        point.x *= scaleX;
        point.y *= scaleY;
      }
    }
    this.width = width;
    this.height = height;
  }

  update(dt: number): void {
    const velocity = Math.min(this.width, this.height) * 0.115 * this.speed;
    this.hue = wrap(this.hue + dt * 42, 360);
    for (let shapeIndex = 0; shapeIndex < this.shapes.length; shapeIndex += 1) {
      const shape = this.shapes[shapeIndex]!;
      for (const point of shape) {
        point.x += point.vx * velocity * dt;
        point.y += point.vy * velocity * dt;
        if (point.x < 0 || point.x > this.width) {
          point.x = Math.max(0, Math.min(this.width, point.x));
          point.vx *= -1;
        }
        if (point.y < 0 || point.y > this.height) {
          point.y = Math.max(0, Math.min(this.height, point.y));
          point.vy *= -1;
        }
      }
      const snapshots = this.history[shapeIndex]!;
      snapshots.unshift(shape.map(({ x, y }) => ({ x, y })));
      snapshots.length = Math.min(snapshots.length, this.trailCount);
    }
  }

  render(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    context.lineWidth = Math.max(1, Math.min(width, height) / 520);
    for (let shapeIndex = 0; shapeIndex < this.history.length; shapeIndex += 1) {
      const snapshots = this.history[shapeIndex]!;
      snapshots.forEach((shape, trailIndex) => {
        const alpha = 1 - trailIndex / Math.max(1, snapshots.length + 2);
        const hue = wrap(this.hue + shapeIndex * 155 + trailIndex * 7, 360);
        context.strokeStyle = `hsla(${hue},100%,62%,${alpha})`;
        context.beginPath();
        shape.forEach((point, index) => {
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.closePath();
        context.stroke();
      });
    }
  }

  private makePoint(): MovingPoint {
    const angle = this.random.range(0, Math.PI * 2);
    return {
      x: this.random.range(0, this.width),
      y: this.random.range(0, this.height),
      vx: Math.cos(angle) * this.random.range(0.55, 1),
      vy: Math.sin(angle) * this.random.range(0.55, 1),
    };
  }
}

export const mystifySaver: SaverDefinition = {
  id: "mystify",
  name: "变幻线",
  description: "彩色多边形在黑色空间反弹，并留下层层叠加的霓虹轨迹。",
  defaults: { trails: 8, speed: 1, secondShape: true },
  controls: [
    { type: "range", key: "trails", label: "轨迹数量", min: 2, max: 18, step: 1, minLabel: "短", maxLabel: "长" },
    { type: "range", key: "speed", label: "移动速度", min: 0.35, max: 2.4, step: 0.05, minLabel: "慢", maxLabel: "快" },
    { type: "toggle", key: "secondShape", label: "显示第二组图形" },
  ],
  create: (settings, seed) => new MystifySaver(settings, seed),
};
