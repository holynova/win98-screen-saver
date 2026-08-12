import { Random } from "../core/math";
import { numberSetting, stringSetting } from "../core/settings";
import type { SaverDefinition, SaverSettings, ScreenSaver } from "../core/types";

class MarqueeSaver implements ScreenSaver {
  private x = 0;
  private y = 0;
  private measuredWidth = 0;
  private width = 640;
  private height = 480;
  private readonly random: Random;
  private readonly text: string;
  private readonly size: number;
  private readonly speed: number;
  private readonly position: string;
  private readonly foreground: string;
  private readonly background: string;

  constructor(settings: SaverSettings, seed: number) {
    this.random = new Random(seed);
    this.text = stringSetting(settings, "text", "Windows 98");
    this.size = numberSetting(settings, "size", 44);
    this.speed = numberSetting(settings, "speed", 1);
    this.position = stringSetting(settings, "position", "random");
    this.foreground = stringSetting(settings, "foreground", "#ffff00");
    this.background = stringSetting(settings, "background", "#000080");
    this.x = this.width;
    this.chooseY();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    if (!this.x) this.x = width;
    this.chooseY();
  }

  update(dt: number): void {
    this.x -= dt * 96 * this.speed;
    if (this.x + this.measuredWidth < -8) {
      this.x = this.width + 8;
      this.chooseY();
    }
  }

  render(context: CanvasRenderingContext2D, width: number, height: number): void {
    context.fillStyle = this.background;
    context.fillRect(0, 0, width, height);
    const scale = Math.max(0.75, Math.min(2.2, Math.min(width, height) / 480));
    const fontSize = this.size * scale;
    context.font = `bold ${fontSize}px "Times New Roman", "Songti SC", serif`;
    context.textBaseline = "middle";
    context.fillStyle = this.foreground;
    this.measuredWidth = context.measureText(this.text).width;
    context.fillText(this.text, this.x, this.y);
  }

  private chooseY(): void {
    this.y = this.position === "center" ? this.height / 2 : this.random.range(this.height * 0.16, this.height * 0.84);
  }
}

export const marqueeSaver: SaverDefinition = {
  id: "marquee",
  name: "滚动字幕",
  description: "在纯色背景上滚动自定义文字，支持经典的随机位置模式。",
  defaults: { text: "Windows 98", size: 44, speed: 1, position: "random", foreground: "#ffff00", background: "#000080" },
  controls: [
    { type: "text", key: "text", label: "文字", maxLength: 80 },
    { type: "range", key: "size", label: "字号", min: 16, max: 96, step: 2, minLabel: "小", maxLabel: "大" },
    { type: "range", key: "speed", label: "速度", min: 0.25, max: 3, step: 0.05, minLabel: "慢", maxLabel: "快" },
    { type: "select", key: "position", label: "位置", options: [{ value: "center", label: "居中" }, { value: "random", label: "随机" }] },
    { type: "color", key: "foreground", label: "文字颜色" },
    { type: "color", key: "background", label: "背景颜色" },
  ],
  create: (settings, seed) => new MarqueeSaver(settings, seed),
};
