import { SaverEngine } from "../core/engine";
import type { ControlDefinition, SaverDefinition, SaverSettings } from "../core/types";
import { savers } from "../savers";
import { loadSelectedSaver, loadSettings, saveSelectedSaver, saveSettings } from "../storage";
import { computerIcon } from "./icons";

export class ScreenSaverApp {
  private selected: SaverDefinition;
  private settings: SaverSettings;
  private previewEngine: SaverEngine | null = null;
  private fullscreenEngine: SaverEngine | null = null;
  private settingsDialog: HTMLDialogElement | null = null;
  private fullscreenLayer: HTMLElement | null = null;
  private seed = Date.now();
  private pointerStart: { x: number; y: number } | null = null;
  private fullscreenStartedAt = 0;
  private previewRestartTimer = 0;

  constructor(private readonly root: HTMLElement) {
    this.selected = savers.find((saver) => saver.id === loadSelectedSaver()) ?? savers[0]!;
    this.settings = loadSettings(this.selected.id, this.selected.defaults);
  }

  mount(): void {
    this.root.innerHTML = this.shellMarkup();
    this.bindShell();
    this.startPreview();
  }

  private shellMarkup(): string {
    return `
      <a class="skip-link" href="#main-window">跳到屏幕保护程序</a>
      <main class="app-shell" id="main-window" aria-labelledby="app-title">
        <header class="app-header">
          <div class="app-identity">${computerIcon}<div><span class="eyebrow">WINDOWS 95 / 98 COLLECTION</span><h1 id="app-title">屏幕保护程序</h1></div></div>
          <div class="header-actions"><span class="web-badge">纯网页版</span><a class="repo-link" href="https://github.com/holynova/win98-screen-saver" target="_blank" rel="noreferrer">GitHub</a><button id="about-button" type="button">关于</button></div>
        </header>
        <div class="workspace">
          <section class="preview-panel" aria-labelledby="preview-title">
            <div class="preview-heading"><div><span class="section-index">01</span><h2 id="preview-title">实时预览</h2></div><span class="resolution-status"><i aria-hidden="true"></i>自适应当前屏幕</span></div>
            <div class="monitor-shell">
              <div class="preview-screen" aria-label="当前屏幕保护程序预览"><canvas id="preview-canvas"></canvas></div>
              <div class="monitor-mark"><span>COLOR DISPLAY</span><i aria-hidden="true"></i></div>
            </div>
            <div class="preview-toolbar">
              <button id="fullscreen-button" type="button" class="primary-action"><span aria-hidden="true">⛶</span> 全屏欣赏</button>
            </div>
          </section>
          <aside class="options-panel" aria-labelledby="options-title">
            <div class="options-heading"><div><span class="section-index">02</span><h2 id="options-title">显示选项</h2></div><button id="reset-button" type="button">恢复默认</button></div>
            <div class="saver-control">
              <label class="saver-picker" for="saver-select"><span>屏幕保护程序</span><select id="saver-select">${savers.map((saver) => `<option value="${saver.id}"${saver.id === this.selected.id ? " selected" : ""}>${saver.name}</option>`).join("")}</select></label>
              <p id="saver-description" class="saver-description">${this.selected.description}</p>
            </div>
            <div id="inline-controls" class="inline-controls">${this.inlineControlsMarkup()}</div>
            <div class="options-footnote"><strong>即时生效</strong><span>参数会自动保存。预览与全屏使用同一套画面设置。</span></div>
          </aside>
        </div>
        <footer class="app-footer"><span>11 个经典动画</span><span>Canvas + WebGL</span><span>适配 4:3、宽屏和超宽屏</span></footer>
      </main>
    `;
  }

  private bindShell(): void {
    const select = this.element<HTMLSelectElement>("#saver-select");
    select.addEventListener("change", () => this.chooseSaver(select.value));
    this.element("#fullscreen-button").addEventListener("click", () => void this.enterFullscreen());
    this.element("#reset-button").addEventListener("click", () => {
      this.settings = { ...this.selected.defaults };
      this.renderInlineControls();
      this.restartPreview();
    });
    this.element("#about-button").addEventListener("click", () => this.openAbout());
    this.bindInlineControls();
  }

  private chooseSaver(id: string): void {
    const saver = savers.find((item) => item.id === id);
    if (!saver) return;
    this.selected = saver;
    this.settings = loadSettings(saver.id, saver.defaults);
    saveSelectedSaver(saver.id);
    this.element("#saver-description").textContent = saver.description;
    this.renderInlineControls();
    this.restartPreview();
  }

  private startPreview(): void {
    this.previewEngine?.destroy();
    this.previewEngine = new SaverEngine(this.element<HTMLCanvasElement>("#preview-canvas"), 1.5);
    this.previewEngine.setSaver(this.selected, this.settings, this.seed);
    this.previewEngine.start();
  }

  private restartPreview(): void {
    this.seed = Date.now();
    saveSettings(this.selected.id, this.settings);
    this.previewEngine?.setSaver(this.selected, this.settings, this.seed);
  }

  private schedulePreviewRestart(): void {
    window.clearTimeout(this.previewRestartTimer);
    this.previewRestartTimer = window.setTimeout(() => this.restartPreview(), 120);
  }

  private inlineControlsMarkup(): string {
    if (!this.selected.controls.length) return `<p class="empty-settings">这个屏幕保护程序没有可调整的选项。</p>`;
    return this.selected.controls.map((control) => this.controlMarkup(control, this.settings)).join("");
  }

  private renderInlineControls(): void {
    this.element("#inline-controls").innerHTML = this.inlineControlsMarkup();
    this.bindInlineControls();
  }

  private bindInlineControls(): void {
    this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement>("#inline-controls [data-setting]").forEach((input) => {
      input.addEventListener("input", () => {
        const key = input.dataset.setting!;
        if (input instanceof HTMLInputElement && input.type === "checkbox") this.settings[key] = input.checked;
        else if (input instanceof HTMLInputElement && input.type === "range") this.settings[key] = Number(input.value);
        else this.settings[key] = input.value;
        const output = this.root.querySelector<HTMLOutputElement>(`#inline-controls output[data-for="${key}"]`);
        if (output) output.value = input.value;
        this.schedulePreviewRestart();
      });
    });
  }

  private controlMarkup(control: ControlDefinition, settings: SaverSettings): string {
    const value = settings[control.key];
    if (control.type === "range") return `<div class="control range-control"><div class="control-label"><label for="setting-${control.key}">${control.label}</label><output data-for="${control.key}">${value}</output></div><input id="setting-${control.key}" data-setting="${control.key}" type="range" min="${control.min}" max="${control.max}" step="${control.step ?? 1}" value="${value}"><div class="range-labels"><span>${control.minLabel ?? control.min}</span><span>${control.maxLabel ?? control.max}</span></div></div>`;
    if (control.type === "select") return `<label class="control select-control"><span>${control.label}</span><select data-setting="${control.key}">${control.options.map((option) => `<option value="${option.value}"${option.value === value ? " selected" : ""}>${option.label}</option>`).join("")}</select></label>`;
    if (control.type === "toggle") return `<label class="control check-control"><input data-setting="${control.key}" type="checkbox"${value ? " checked" : ""}><span>${control.label}</span></label>`;
    if (control.type === "color") return `<label class="control color-control"><span>${control.label}</span><input data-setting="${control.key}" type="color" value="${value}"></label>`;
    return `<label class="control text-control"><span>${control.label}</span><input data-setting="${control.key}" type="text" value="${this.escapeAttribute(String(value ?? ""))}" maxlength="${control.maxLength ?? 120}"></label>`;
  }

  private async enterFullscreen(): Promise<void> {
    if (this.fullscreenLayer) return;
    const layer = document.createElement("section");
    layer.className = "fullscreen-saver";
    layer.setAttribute("aria-label", `${this.selected.name} 全屏播放`);
    layer.innerHTML = `<canvas></canvas><div class="fullscreen-hint"><strong>${this.selected.name}</strong><span>移动鼠标、点击或按任意键退出</span></div><button class="fullscreen-exit" type="button">退出全屏</button>`;
    document.body.append(layer);
    this.fullscreenLayer = layer;
    this.fullscreenStartedAt = performance.now();
    this.pointerStart = null;
    this.fullscreenEngine = new SaverEngine(layer.querySelector("canvas")!, 2);
    this.fullscreenEngine.setSaver(this.selected, this.settings, Date.now());
    this.fullscreenEngine.start();
    layer.querySelector(".fullscreen-exit")?.addEventListener("click", () => this.exitFullscreen());
    layer.addEventListener("pointerdown", this.onFullscreenPointerDown);
    layer.addEventListener("pointermove", this.onFullscreenPointerMove);
    window.addEventListener("keydown", this.onFullscreenKeyDown);
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
    try {
      await layer.requestFullscreen({ navigationUI: "hide" });
    } catch {
      layer.classList.add("browser-fullscreen-fallback");
    }
  }

  private onFullscreenPointerDown = (event: PointerEvent): void => {
    if ((event.target as HTMLElement).closest(".fullscreen-exit")) return;
    if (performance.now() - this.fullscreenStartedAt > 650) this.exitFullscreen();
  };

  private onFullscreenPointerMove = (event: PointerEvent): void => {
    if (performance.now() - this.fullscreenStartedAt < 800) {
      this.pointerStart = { x: event.clientX, y: event.clientY };
      return;
    }
    this.pointerStart ??= { x: event.clientX, y: event.clientY };
    if (Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) > 18) this.exitFullscreen();
  };

  private onFullscreenKeyDown = (): void => this.exitFullscreen();

  private onFullscreenChange = (): void => {
    if (!document.fullscreenElement && this.fullscreenLayer) this.cleanupFullscreen();
  };

  private exitFullscreen(): void {
    if (document.fullscreenElement) void document.exitFullscreen().finally(() => this.cleanupFullscreen());
    else this.cleanupFullscreen();
  }

  private cleanupFullscreen(): void {
    if (!this.fullscreenLayer) return;
    this.fullscreenEngine?.destroy();
    this.fullscreenEngine = null;
    this.fullscreenLayer.removeEventListener("pointerdown", this.onFullscreenPointerDown);
    this.fullscreenLayer.removeEventListener("pointermove", this.onFullscreenPointerMove);
    window.removeEventListener("keydown", this.onFullscreenKeyDown);
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
    this.fullscreenLayer.remove();
    this.fullscreenLayer = null;
  }

  private openAbout(): void {
    this.closeDialog();
    const dialog = document.createElement("dialog");
    dialog.className = "window about-dialog";
    dialog.innerHTML = `<header class="title-bar"><span>关于本项目</span><button class="title-close" type="button" aria-label="关闭">×</button></header><div class="about-content">${computerIcon}<div><strong>Windows 98 屏幕保护程序</strong><p>使用纯前端技术重新创作经典动画。没有系统镜像、原始 SCR 文件或后端服务。</p><p>版本 0.1.0</p></div></div><footer class="dialog-actions"><button type="button" class="about-ok">确定</button></footer>`;
    document.body.append(dialog);
    this.settingsDialog = dialog;
    const close = (): void => dialog.close();
    dialog.querySelector(".title-close")?.addEventListener("click", close);
    dialog.querySelector(".about-ok")?.addEventListener("click", close);
    dialog.addEventListener("close", () => { dialog.remove(); this.settingsDialog = null; });
    dialog.showModal();
  }

  private closeDialog(): void {
    this.settingsDialog?.close();
  }

  private element<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing element: ${selector}`);
    return element;
  }

  private escapeAttribute(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }
}
