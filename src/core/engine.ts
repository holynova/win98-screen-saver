import type { CanvasScreenSaver, SaverDefinition, SaverSettings, ScreenSaver } from "./types";

export class SaverEngine {
  private readonly context: CanvasRenderingContext2D;
  private renderer: ScreenSaver | CanvasScreenSaver | null = null;
  private frame = 0;
  private previousTime = 0;
  private elapsed = 0;
  private resizeObserver: ResizeObserver;
  private width = 1;
  private height = 1;
  private dpr = 1;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly dprLimit = 2) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas 2D is unavailable");
    this.context = context;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  setSaver(definition: SaverDefinition, settings: SaverSettings, seed = Date.now()): void {
    this.renderer?.destroy?.();
    this.renderer = definition.create(settings, seed, this.canvas);
    this.elapsed = 0;
    this.previousTime = performance.now();
    this.renderer.resize?.(this.width, this.height);
  }

  start(): void {
    if (this.frame) return;
    this.previousTime = performance.now();
    const tick = (now: number): void => {
      const dt = Math.min(0.05, Math.max(0, (now - this.previousTime) / 1000));
      this.previousTime = now;
      this.elapsed += dt;
      this.renderer?.update(dt, this.elapsed);
      if (this.renderer && "kind" in this.renderer && this.renderer.kind === "canvas") {
        this.renderer.render(this.width, this.height);
      } else if (this.renderer && !("kind" in this.renderer)) {
        this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.context.imageSmoothingEnabled = false;
        this.renderer.render(this.context, this.width, this.height);
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  destroy(): void {
    this.stop();
    this.renderer?.destroy?.();
    this.resizeObserver.disconnect();
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, bounds.width);
    this.height = Math.max(1, bounds.height);
    this.dpr = Math.min(this.dprLimit, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(this.width * this.dpr);
    const pixelHeight = Math.round(this.height * this.dpr);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
      this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.renderer?.resize?.(this.width, this.height);
    }
  }
}
