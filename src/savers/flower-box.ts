import { Random, projectPoint, rotatePoint, type Point3 } from "../core/math";
import { booleanSetting, numberSetting, stringSetting } from "../core/settings";
import type { SaverDefinition, SaverSettings, ScreenSaver } from "../core/types";

interface Face {
  points: Point3[];
  depth: number;
  color: string;
}

const PALETTE = ["#e94b35", "#eec944", "#51ad55", "#3b83d1", "#b05acb", "#42b8af"];

class FlowerBoxSaver implements ScreenSaver {
  private readonly random: Random;
  private readonly geometry: string;
  private readonly subdivisions: number;
  private readonly smooth: boolean;
  private readonly bloom: boolean;
  private readonly cycle: boolean;
  private readonly spin: boolean;
  private readonly size: number;
  private time = 0;
  private centerX = 0;
  private centerY = 0;
  private vx = 0.12;
  private vy = 0.095;
  private width = 640;
  private height = 480;

  constructor(settings: SaverSettings, seed: number) {
    this.random = new Random(seed);
    this.geometry = stringSetting(settings, "geometry", "flower");
    this.subdivisions = numberSetting(settings, "subdivisions", 8);
    this.smooth = booleanSetting(settings, "smooth", true);
    this.bloom = booleanSetting(settings, "bloom", true);
    this.cycle = booleanSetting(settings, "cycle", true);
    this.spin = booleanSetting(settings, "spin", true);
    this.size = numberSetting(settings, "size", 1);
    this.centerX = this.random.range(-0.3, 0.3);
    this.centerY = this.random.range(-0.2, 0.2);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(dt: number): void {
    this.time += dt;
    this.centerX += this.vx * dt;
    this.centerY += this.vy * dt;
    const aspect = this.width / this.height;
    const limitX = Math.max(0.45, aspect * 0.72);
    if (Math.abs(this.centerX) > limitX) this.vx *= -1;
    if (Math.abs(this.centerY) > 0.55) this.vy *= -1;
  }

  render(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    const faces = this.buildFaces();
    faces.sort((a, b) => a.depth - b.depth);
    for (const face of faces) {
      const projected = face.points.map((point) => {
        const projection = projectPoint(point, width, height, 6.2);
        return {
          x: projection.x + this.centerX * Math.min(width, height),
          y: projection.y + this.centerY * Math.min(width, height),
        };
      });
      context.beginPath();
      projected.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
      context.closePath();
      context.fillStyle = face.color;
      context.fill();
      context.strokeStyle = this.smooth ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.48)";
      context.lineWidth = 1;
      context.stroke();
    }
  }

  private buildFaces(): Face[] {
    const faces: Face[] = [];
    const rings = Math.max(4, Math.round(this.subdivisions));
    const slices = Math.max(8, rings * 2);
    const bloom = this.bloom ? 0.76 + Math.sin(this.time * 0.72) * 0.22 : 1;
    const rotationY = this.spin ? this.time * 0.34 : 0.4;
    const rotationX = this.spin ? this.time * 0.23 : -0.45;
    const paletteOffset = this.cycle ? Math.floor(this.time * 2.4) : 0;
    const vertices: Point3[][] = [];
    for (let ring = 0; ring <= rings; ring += 1) {
      const v = ring / rings;
      const theta = v * Math.PI;
      const row: Point3[] = [];
      for (let slice = 0; slice <= slices; slice += 1) {
        const u = slice / slices;
        const phi = u * Math.PI * 2;
        let radius = Math.sin(theta);
        let y = Math.cos(theta);
        if (this.geometry === "flower") radius *= 0.65 + 0.36 * Math.cos(phi * 6) * bloom;
        if (this.geometry === "cube") {
          const px = Math.sin(theta) * Math.cos(phi);
          const py = Math.cos(theta);
          const pz = Math.sin(theta) * Math.sin(phi);
          const max = Math.max(Math.abs(px), Math.abs(py), Math.abs(pz));
          radius = Math.sin(theta) / Math.max(0.42, max);
          y = py / Math.max(0.42, max);
        }
        if (this.geometry === "pyramid") radius *= 0.18 + v * 1.15;
        if (this.geometry === "cylinder") {
          radius = 0.82;
          y = 1 - v * 2;
        }
        if (this.geometry === "spring") {
          const turns = 3.4;
          const angle = u * Math.PI * 2 * turns;
          const tubeAngle = theta * 2;
          const tube = 0.2;
          const point = {
            x: (0.72 + Math.cos(tubeAngle) * tube) * Math.cos(angle),
            y: (u - 0.5) * 2.3 + Math.sin(tubeAngle) * tube,
            z: (0.72 + Math.cos(tubeAngle) * tube) * Math.sin(angle),
          };
          row.push(rotatePoint({ x: point.x * this.size, y: point.y * this.size, z: point.z * this.size }, rotationX, rotationY));
          continue;
        }
        const point = { x: radius * Math.cos(phi) * this.size, y: y * this.size, z: radius * Math.sin(phi) * this.size };
        row.push(rotatePoint(point, rotationX, rotationY));
      }
      vertices.push(row);
    }
    for (let ring = 0; ring < rings; ring += 1) {
      for (let slice = 0; slice < slices; slice += 1) {
        const points = [vertices[ring]![slice]!, vertices[ring]![slice + 1]!, vertices[ring + 1]![slice + 1]!, vertices[ring + 1]![slice]!];
        const depth = points.reduce((sum, point) => sum + point.z, 0) / points.length;
        const shade = Math.max(0.35, Math.min(1, 0.65 + depth * 0.2));
        const base = PALETTE[(slice + ring + paletteOffset) % PALETTE.length]!;
        faces.push({ points, depth, color: this.tint(base, shade) });
      }
    }
    return faces;
  }

  private tint(hex: string, shade: number): string {
    const color = Number.parseInt(hex.slice(1), 16);
    const red = (color >> 16) & 255;
    const green = (color >> 8) & 255;
    const blue = color & 255;
    return `rgb(${Math.round(red * shade)},${Math.round(green * shade)},${Math.round(blue * shade)})`;
  }
}

export const flowerBoxSaver: SaverDefinition = {
  id: "flower-box",
  name: "3D 花盒",
  description: "低多边形彩色几何体缓慢旋转、反弹，并像机械花朵一样呼吸开合。",
  defaults: { geometry: "flower", subdivisions: 8, size: 1, smooth: true, bloom: true, cycle: true, spin: true },
  controls: [
    { type: "select", key: "geometry", label: "几何体", options: [{ value: "flower", label: "花朵" }, { value: "cube", label: "立方体" }, { value: "pyramid", label: "金字塔" }, { value: "cylinder", label: "圆柱体" }, { value: "spring", label: "弹簧" }] },
    { type: "range", key: "subdivisions", label: "细分", min: 4, max: 14, step: 1, minLabel: "粗糙", maxLabel: "细腻" },
    { type: "range", key: "size", label: "尺寸", min: 0.55, max: 1.45, step: 0.05, minLabel: "小", maxLabel: "大" },
    { type: "toggle", key: "smooth", label: "平滑着色" },
    { type: "toggle", key: "bloom", label: "开花" },
    { type: "toggle", key: "cycle", label: "循环颜色" },
    { type: "toggle", key: "spin", label: "旋转" },
  ],
  create: (settings, seed) => new FlowerBoxSaver(settings, seed),
};
