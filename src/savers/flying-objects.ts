import { Random } from "../core/math";
import { booleanSetting, numberSetting, stringSetting } from "../core/settings";
import type { SaverDefinition, SaverSettings, ScreenSaver } from "../core/types";

interface Particle { angle: number; speed: number; radius: number; color: string }
const COLORS = ["#e84a38", "#e9c92e", "#49a650", "#337ec8", "#b04fc0", "#46b9b4"];

class FlyingObjectsSaver implements ScreenSaver {
  private time = 0;
  private x = 0;
  private y = 0;
  private vx = 0.16;
  private vy = 0.12;
  private readonly type: string;
  private readonly size: number;
  private readonly speed: number;
  private readonly smooth: boolean;
  private readonly cycle: boolean;
  private readonly particles: Particle[];
  private readonly random: Random;

  constructor(settings: SaverSettings, seed: number) {
    this.random = new Random(seed);
    this.type = stringSetting(settings, "type", "logo");
    this.size = numberSetting(settings, "size", 1);
    this.speed = numberSetting(settings, "speed", 1);
    this.smooth = booleanSetting(settings, "smooth", true);
    this.cycle = booleanSetting(settings, "cycle", true);
    this.particles = Array.from({ length: 90 }, (_, index) => ({
      angle: this.random.range(0, Math.PI * 2), speed: this.random.range(0.4, 1.5), radius: this.random.range(0.1, 1), color: COLORS[index % COLORS.length]!,
    }));
  }

  update(dt: number): void {
    this.time += dt * this.speed;
    this.x += this.vx * dt * this.speed;
    this.y += this.vy * dt * this.speed;
    if (Math.abs(this.x) > 0.65) this.vx *= -1;
    if (Math.abs(this.y) > 0.5) this.vy *= -1;
  }

  render(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    const scale = Math.min(width, height) * 0.22 * this.size;
    context.save();
    context.translate(width / 2 + this.x * width * 0.4, height / 2 + this.y * height * 0.45);
    if (this.type === "explode") this.drawExplosion(context, scale);
    else if (this.type === "ribbon" || this.type === "double-ribbon") this.drawRibbon(context, scale, this.type === "double-ribbon");
    else if (this.type === "splash") this.drawSplash(context, scale);
    else if (this.type === "twist") this.drawTwist(context, scale);
    else if (this.type === "flag") this.drawFlag(context, scale);
    else this.drawLogo(context, scale);
    context.restore();
  }

  private drawLogo(context: CanvasRenderingContext2D, scale: number): void {
    context.rotate(Math.sin(this.time * 0.7) * 0.38);
    context.transform(1, -0.16, Math.sin(this.time) * 0.15, 1, 0, 0);
    const size = scale * 0.55;
    const gap = size * 0.12;
    COLORS.slice(0, 4).forEach((color, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      context.fillStyle = color;
      context.fillRect((column - 1) * gap / 2 + (column - 0.5) * size, (row - 1) * gap / 2 + (row - 0.5) * size, size, size);
      context.strokeStyle = "rgba(255,255,255,0.45)";
      context.strokeRect((column - 1) * gap / 2 + (column - 0.5) * size, (row - 1) * gap / 2 + (row - 0.5) * size, size, size);
    });
  }

  private drawExplosion(context: CanvasRenderingContext2D, scale: number): void {
    const phase = (this.time * 0.35) % 1;
    for (const particle of this.particles) {
      const distance = scale * particle.radius * phase * 1.45;
      const x = Math.cos(particle.angle) * distance;
      const y = Math.sin(particle.angle) * distance;
      context.fillStyle = particle.color;
      const size = Math.max(1, scale * 0.12 * (1 - phase) * particle.speed);
      context.fillRect(x - size / 2, y - size / 2, size, size);
    }
  }

  private drawRibbon(context: CanvasRenderingContext2D, scale: number, double: boolean): void {
    const count = double ? 2 : 1;
    for (let ribbon = 0; ribbon < count; ribbon += 1) {
      context.beginPath();
      for (let index = 0; index <= 56; index += 1) {
        const t = index / 56;
        const x = (t - 0.5) * scale * 2.6;
        const y = Math.sin(t * Math.PI * 6 + this.time * 2 + ribbon * Math.PI) * scale * 0.42 + (ribbon - 0.5) * scale * 0.45;
        if (!index) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = COLORS[(ribbon + Math.floor(this.cycle ? this.time : 0)) % COLORS.length]!;
      context.lineWidth = scale * 0.22;
      context.lineCap = this.smooth ? "round" : "butt";
      context.stroke();
      context.strokeStyle = "rgba(255,255,255,0.4)";
      context.lineWidth = Math.max(1, scale * 0.025);
      context.stroke();
    }
  }

  private drawSplash(context: CanvasRenderingContext2D, scale: number): void {
    const phase = (this.time * 0.55) % 1;
    context.fillStyle = "#358bd2";
    context.beginPath();
    context.ellipse(0, scale * 0.35, scale * (0.25 + phase * 0.7), scale * 0.16, 0, 0, Math.PI * 2);
    context.fill();
    for (const particle of this.particles.slice(0, 28)) {
      const distance = scale * phase * particle.radius;
      const x = Math.cos(particle.angle) * distance;
      const y = scale * 0.2 - Math.sin(phase * Math.PI) * scale * particle.speed + Math.sin(particle.angle) * distance * 0.28;
      context.fillStyle = particle.color === COLORS[3] ? "#7bc8ef" : "#2d79bb";
      context.beginPath();
      context.arc(x, y, Math.max(1.5, scale * 0.03 * (1 - phase)), 0, Math.PI * 2);
      context.fill();
    }
  }

  private drawTwist(context: CanvasRenderingContext2D, scale: number): void {
    context.rotate(this.time * 0.3);
    for (let index = 0; index < 40; index += 1) {
      const angle = index / 40 * Math.PI * 2;
      const next = (index + 1) / 40 * Math.PI * 2;
      const thickness = Math.cos(angle * 1.5 + this.time) * scale * 0.2;
      context.strokeStyle = COLORS[(index + Math.floor(this.cycle ? this.time * 2 : 0)) % COLORS.length]!;
      context.lineWidth = Math.max(2, Math.abs(thickness));
      context.beginPath();
      context.moveTo(Math.cos(angle) * scale, Math.sin(angle) * scale * 0.58);
      context.lineTo(Math.cos(next) * scale, Math.sin(next) * scale * 0.58);
      context.stroke();
    }
  }

  private drawFlag(context: CanvasRenderingContext2D, scale: number): void {
    const columns = 12;
    const rows = 8;
    const width = scale * 1.7;
    const height = scale * 1.05;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const wave = Math.sin(column * 0.7 + this.time * 2.2) * scale * 0.09;
        const nextWave = Math.sin((column + 1) * 0.7 + this.time * 2.2) * scale * 0.09;
        const x = -width / 2 + column / columns * width;
        const y = -height / 2 + row / rows * height + wave;
        context.fillStyle = COLORS[(Math.floor(column / 3) + Math.floor(row / 2)) % 4]!;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + width / columns, y + nextWave - wave);
        context.lineTo(x + width / columns, y + height / rows + nextWave - wave);
        context.lineTo(x, y + height / rows);
        context.fill();
      }
    }
  }
}

export const flyingObjectsSaver: SaverDefinition = {
  id: "flying-objects",
  name: "3D 飞行物体",
  description: "Windows 标志、爆炸、丝带、飞溅和纹理旗帜在屏幕中悬浮变化。",
  defaults: { type: "logo", size: 1, speed: 1, smooth: true, cycle: true },
  controls: [
    { type: "select", key: "type", label: "物体", options: [{ value: "logo", label: "Windows 标志" }, { value: "explode", label: "爆炸" }, { value: "ribbon", label: "丝带" }, { value: "double-ribbon", label: "双丝带" }, { value: "splash", label: "飞溅" }, { value: "twist", label: "扭曲" }, { value: "flag", label: "纹理旗帜" }] },
    { type: "range", key: "size", label: "尺寸", min: 0.55, max: 1.45, step: 0.05, minLabel: "小", maxLabel: "大" },
    { type: "range", key: "speed", label: "速度", min: 0.35, max: 2.2, step: 0.05, minLabel: "慢", maxLabel: "快" },
    { type: "toggle", key: "smooth", label: "平滑" },
    { type: "toggle", key: "cycle", label: "循环颜色" },
  ],
  create: (settings, seed) => new FlyingObjectsSaver(settings, seed),
};
