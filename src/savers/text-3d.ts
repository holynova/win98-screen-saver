import { clamp } from "../core/math";
import { booleanSetting, numberSetting, stringSetting } from "../core/settings";
import type { SaverDefinition, SaverSettings, ScreenSaver } from "../core/types";

class Text3DSaver implements ScreenSaver {
  private time = 0;
  private x = 0;
  private y = 0;
  private vx = 0.18;
  private vy = 0.14;
  private readonly text: string;
  private readonly clock: boolean;
  private readonly size: number;
  private readonly speed: number;
  private readonly rotation: string;
  private readonly color: string;
  private readonly textured: boolean;

  constructor(settings: SaverSettings) {
    this.text = stringSetting(settings, "text", "OpenGL");
    this.clock = booleanSetting(settings, "clock", false);
    this.size = numberSetting(settings, "size", 1);
    this.speed = numberSetting(settings, "speed", 1);
    this.rotation = stringSetting(settings, "rotation", "random");
    this.color = stringSetting(settings, "color", "#b74dce");
    this.textured = booleanSetting(settings, "textured", false);
  }

  update(dt: number): void {
    this.time += dt * this.speed;
    this.x += this.vx * dt * this.speed;
    this.y += this.vy * dt * this.speed;
    if (Math.abs(this.x) > 0.54) this.vx *= -1;
    if (Math.abs(this.y) > 0.42) this.vy *= -1;
  }

  render(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    const label = this.clock ? new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date()) : this.magicText();
    const baseSize = clamp(Math.min(width, height) * 0.19 * this.size, 30, Math.min(width * 0.34, 230));
    context.save();
    context.translate(width / 2 + this.x * width * 0.56, height / 2 + this.y * height * 0.52);
    const { sx, sy, skew } = this.rotationTransform();
    context.transform(sx, skew, -skew * 0.22, sy, 0, 0);
    context.font = `900 ${baseSize}px Arial Black, Arial, "Microsoft YaHei", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const depth = Math.max(8, Math.round(baseSize * 0.15));
    for (let layer = depth; layer >= 1; layer -= 1) {
      const shade = Math.round(24 + 66 * layer / depth);
      context.fillStyle = `rgb(${shade},${Math.round(shade * 0.45)},${Math.round(shade * 0.72)})`;
      context.fillText(label, layer * 0.72, layer * 0.72);
    }
    if (this.textured) {
      const gradient = context.createLinearGradient(-baseSize, -baseSize / 2, baseSize, baseSize / 2);
      gradient.addColorStop(0, "#f0c83d");
      gradient.addColorStop(0.25, "#4bb7d4");
      gradient.addColorStop(0.5, "#d34d99");
      gradient.addColorStop(0.75, "#57ad50");
      gradient.addColorStop(1, "#f0c83d");
      context.fillStyle = gradient;
    } else context.fillStyle = this.color;
    context.fillText(label, 0, 0);
    context.strokeStyle = "rgba(255,255,255,0.72)";
    context.lineWidth = Math.max(1, baseSize * 0.018);
    context.strokeText(label, 0, 0);
    context.restore();
  }

  private rotationTransform(): { sx: number; sy: number; skew: number } {
    if (this.rotation === "none") return { sx: 1, sy: 1, skew: 0 };
    if (this.rotation === "see-saw") return { sx: Math.cos(this.time * 0.72), sy: 1, skew: Math.sin(this.time * 0.72) * 0.15 };
    if (this.rotation === "wobble") return { sx: 1, sy: 0.72 + Math.cos(this.time * 1.15) * 0.28, skew: Math.sin(this.time) * 0.18 };
    return { sx: Math.cos(this.time * 0.62), sy: 0.72 + Math.sin(this.time * 0.47) * 0.28, skew: Math.sin(this.time * 0.73) * 0.25 };
  }

  private magicText(): string {
    const key = this.text.trim().toLowerCase();
    if (key === "volcano") {
      const volcanoes = ["ETNA", "FUJI", "KRAKATOA", "VESUVIUS", "ST. HELENS"];
      return volcanoes[Math.floor(this.time / 2.5) % volcanoes.length]!;
    }
    return this.text || "OpenGL";
  }
}

export const text3DSaver: SaverDefinition = {
  id: "3d-text",
  name: "3D 文字",
  description: "厚重、闪亮的立体文字在黑色空间中反弹，输入 volcano 可触发隐藏文字。",
  defaults: { text: "OpenGL", clock: false, size: 1, speed: 1, rotation: "random", color: "#b74dce", textured: false },
  controls: [
    { type: "text", key: "text", label: "自定义文字", maxLength: 28 },
    { type: "toggle", key: "clock", label: "显示当前时间" },
    { type: "range", key: "size", label: "尺寸", min: 0.55, max: 1.35, step: 0.05, minLabel: "小", maxLabel: "大" },
    { type: "range", key: "speed", label: "旋转速度", min: 0.25, max: 2.2, step: 0.05, minLabel: "慢", maxLabel: "快" },
    { type: "select", key: "rotation", label: "旋转方式", options: [{ value: "none", label: "无" }, { value: "see-saw", label: "跷跷板" }, { value: "wobble", label: "摇摆" }, { value: "random", label: "随机" }] },
    { type: "color", key: "color", label: "实体颜色" },
    { type: "toggle", key: "textured", label: "彩色纹理" },
  ],
  create: (settings) => new Text3DSaver(settings),
};
