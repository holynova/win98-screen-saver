import * as THREE from "three";
import type { CanvasScreenSaver } from "./types";

export abstract class ThreeSaver implements CanvasScreenSaver {
  readonly kind = "canvas" as const;
  protected readonly renderer: THREE.WebGLRenderer;
  protected readonly scene = new THREE.Scene();
  protected readonly camera: THREE.PerspectiveCamera;
  protected readonly targetContext: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement, fieldOfView = 58) {
    const targetContext = canvas.getContext("2d", { alpha: false });
    if (!targetContext) throw new Error("Canvas 2D is unavailable");
    this.targetContext = targetContext;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(1);
    this.camera = new THREE.PerspectiveCamera(fieldOfView, 1, 0.045, 120);
  }

  abstract update(dt: number, time: number): void;

  render(): void {
    this.renderer.render(this.scene, this.camera);
    this.targetContext.setTransform(1, 0, 0, 1, 0, 0);
    this.targetContext.drawImage(
      this.renderer.domElement,
      0,
      0,
      this.targetContext.canvas.width,
      this.targetContext.canvas.height,
    );
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.targetContext.canvas.width, this.targetContext.canvas.height, false);
  }

  destroy(): void {
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const material of materials) {
        const record = material as THREE.Material & Record<string, unknown>;
        for (const value of Object.values(record)) if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  protected get viewport(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
