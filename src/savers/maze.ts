import * as THREE from "three";
import { Random } from "../core/math";
import { booleanSetting, numberSetting, stringSetting } from "../core/settings";
import { ThreeSaver } from "../core/three-saver";
import type { SaverDefinition, SaverSettings } from "../core/types";

interface MazeCell {
  visited: boolean;
  walls: [boolean, boolean, boolean, boolean];
}

interface MazePoint { x: number; y: number }
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

class MazeSaver extends ThreeSaver {
  private readonly random: Random;
  private readonly size = 13;
  private cells: MazeCell[] = [];
  private route: MazePoint[] = [];
  private routeIndex = 0;
  private x = 0.5;
  private z = 0.5;
  private angle = 0;
  private targetAngle = 0;
  private readonly speed: number;
  private readonly showMap: boolean;
  private readonly rats: boolean;
  private readonly textureName: string;
  private readonly world = new THREE.Group();
  private mapCanvas: HTMLCanvasElement | null = null;
  private mapContext: CanvasRenderingContext2D | null = null;
  private rat: THREE.Group | null = null;
  private pause = 0;

  constructor(canvas: HTMLCanvasElement, settings: SaverSettings, seed: number) {
    super(canvas, 68);
    this.random = new Random(seed);
    this.speed = numberSetting(settings, "speed", 1);
    this.showMap = booleanSetting(settings, "map", false);
    this.rats = booleanSetting(settings, "rats", true);
    this.textureName = stringSetting(settings, "texture", "brick");
    this.scene.fog = new THREE.FogExp2(0x121212, 0.074);
    this.scene.add(this.world);
    this.scene.add(new THREE.HemisphereLight(0xdbe2e5, 0x5b4531, 1.25));
    const headlight = new THREE.PointLight(0xfff2d2, 2.2, 11, 1.4);
    this.camera.add(headlight);
    this.scene.add(this.camera);
    this.generate();
  }

  update(dt: number): void {
    if (this.pause > 0) {
      this.pause -= dt;
      if (this.pause <= 0) this.generate();
      this.updateCamera();
      return;
    }
    const target = this.route[this.routeIndex + 1];
    if (!target) {
      this.pause = 1.35;
      this.updateCamera();
      return;
    }
    const tx = target.x + 0.5;
    const tz = target.y + 0.5;
    const dx = tx - this.x;
    const dz = tz - this.z;
    const distance = Math.hypot(dx, dz);
    this.targetAngle = Math.atan2(dz, dx);
    const delta = this.normalizeAngle(this.targetAngle - this.angle);
    const turn = Math.min(Math.abs(delta), dt * 2.15 * this.speed);
    this.angle += Math.sign(delta) * turn;
    if (Math.abs(delta) < 0.18) {
      const movement = Math.min(distance, dt * 0.82 * this.speed);
      this.x += Math.cos(this.angle) * movement;
      this.z += Math.sin(this.angle) * movement;
      if (distance < 0.03) {
        this.x = tx;
        this.z = tz;
        this.routeIndex += 1;
      }
    }
    if (this.rat) {
      this.rat.position.y = -0.4 + Math.sin(performance.now() * 0.01) * 0.025;
      this.rat.rotation.y += dt * 0.8;
    }
    this.updateCamera();
    this.updateMap();
  }

  override render(): void {
    super.render();
    if (this.showMap && this.mapCanvas) {
      const scale = this.targetContext.canvas.width / Math.max(1, this.viewport.width);
      const size = Math.min(this.viewport.width, this.viewport.height) * 0.27 * scale;
      const margin = 16 * scale;
      this.targetContext.drawImage(this.mapCanvas, margin, margin, size, size);
    }
  }

  override resize(width: number, height: number): void {
    super.resize(width, height);
    if (this.showMap) this.rebuildMapOverlay(width, height);
  }

  private generate(): void {
    this.disposeWorld();
    this.cells = Array.from({ length: this.size * this.size }, () => ({ visited: false, walls: [true, true, true, true] }));
    const stack: MazePoint[] = [{ x: 0, y: 0 }];
    this.cell(0, 0).visited = true;
    while (stack.length) {
      const current = stack.at(-1)!;
      const options: number[] = [];
      for (let direction = 0; direction < 4; direction += 1) {
        const nx = current.x + DX[direction]!;
        const ny = current.y + DY[direction]!;
        if (nx >= 0 && ny >= 0 && nx < this.size && ny < this.size && !this.cell(nx, ny).visited) options.push(direction);
      }
      if (!options.length) {
        stack.pop();
        continue;
      }
      const direction = this.random.pick(options);
      const nx = current.x + DX[direction]!;
      const ny = current.y + DY[direction]!;
      this.cell(current.x, current.y).walls[direction] = false;
      this.cell(nx, ny).walls[(direction + 2) % 4] = false;
      this.cell(nx, ny).visited = true;
      stack.push({ x: nx, y: ny });
    }
    this.route = this.solve({ x: 0, y: 0 }, { x: this.size - 1, y: this.size - 1 });
    this.routeIndex = 0;
    this.x = 0.5;
    this.z = 0.5;
    const next = this.route[1] ?? { x: 1, y: 0 };
    this.angle = Math.atan2(next.y, next.x);
    this.targetAngle = this.angle;
    this.buildWorld();
    this.updateCamera();
  }

  private buildWorld(): void {
    const wallTexture = this.textureName === "stone" ? this.createStoneTexture() : this.textureName === "rainbow" ? this.createRainbowTexture() : this.createBrickTexture();
    const floorTexture = this.createFloorTexture();
    const ceilingTexture = this.createCeilingTexture();
    wallTexture.colorSpace = THREE.SRGBColorSpace;
    floorTexture.colorSpace = THREE.SRGBColorSpace;
    ceilingTexture.colorSpace = THREE.SRGBColorSpace;
    const wallMaterial = new THREE.MeshLambertMaterial({ map: wallTexture });
    const floorMaterial = new THREE.MeshLambertMaterial({ map: floorTexture });
    const ceilingMaterial = new THREE.MeshLambertMaterial({ map: ceilingTexture, side: THREE.DoubleSide });
    const wallHorizontal = new THREE.BoxGeometry(1.06, 1.68, 0.10);
    const wallVertical = new THREE.BoxGeometry(0.10, 1.68, 1.06);

    for (let z = 0; z < this.size; z += 1) {
      for (let x = 0; x < this.size; x += 1) {
        const cell = this.cell(x, z);
        if (cell.walls[0]) this.addWall(wallHorizontal, wallMaterial, x + 0.5, z);
        if (cell.walls[3]) this.addWall(wallVertical, wallMaterial, x, z + 0.5);
        if (z === this.size - 1 && cell.walls[2]) this.addWall(wallHorizontal, wallMaterial, x + 0.5, z + 1);
        if (x === this.size - 1 && cell.walls[1]) this.addWall(wallVertical, wallMaterial, x + 1, z + 0.5);
      }
    }

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(this.size / 2, -0.84, this.size / 2);
    this.world.add(floor);
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size), ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(this.size / 2, 0.84, this.size / 2);
    this.world.add(ceiling);
    this.addStartFlag();
    this.addExitSmiley();
    if (this.rats) this.addRat();
    if (this.showMap) this.rebuildMapOverlay(this.viewport.width, this.viewport.height);
  }

  private addWall(geometry: THREE.BoxGeometry, material: THREE.Material, x: number, z: number): void {
    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(x, 0, z);
    this.world.add(wall);
  }

  private addStartFlag(): void {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.84, 8), new THREE.MeshLambertMaterial({ color: 0xd0d0d0 }));
    pole.position.y = -0.3;
    group.add(pole);
    const colors = [0xf04431, 0x45a54d, 0x2d78c3, 0xf1c52d];
    for (let index = 0; index < 4; index += 1) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.15), new THREE.MeshBasicMaterial({ color: colors[index]!, side: THREE.DoubleSide }));
      pane.position.set(index % 2 * 0.19 + 0.1, 0.16 - Math.floor(index / 2) * 0.16, 0);
      group.add(pane);
    }
    group.position.set(0.5, 0.15, 1.35);
    group.rotation.y = Math.PI;
    this.world.add(group);
  }

  private addExitSmiley(): void {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "rgba(255,245,0,0.78)";
    context.beginPath(); context.arc(64, 64, 56, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#111";
    context.beginPath(); context.arc(43, 49, 8, 0, Math.PI * 2); context.arc(85, 49, 8, 0, Math.PI * 2); context.fill();
    context.lineWidth = 8; context.strokeStyle = "#111"; context.beginPath(); context.arc(64, 66, 31, 0.22, Math.PI - 0.22); context.stroke();
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, opacity: 0.82, depthWrite: false }));
    sprite.scale.set(0.62, 0.62, 0.62);
    sprite.position.set(this.size - 0.5, 0, this.size - 0.5);
    this.world.add(sprite);
  }

  private addRat(): void {
    const routePoint = this.route[Math.min(this.route.length - 1, Math.floor(this.route.length * 0.55))] ?? { x: 4, y: 4 };
    const group = new THREE.Group();
    const fur = new THREE.MeshLambertMaterial({ color: 0x88857e });
    const pink = new THREE.MeshLambertMaterial({ color: 0xc58b91 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), fur);
    body.scale.set(1.55, 0.72, 0.8);
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), fur);
    head.position.x = 0.17;
    group.add(head);
    for (const z of [-0.065, 0.065]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), pink);
      ear.position.set(0.16, 0.07, z);
      group.add(ear);
    }
    group.position.set(routePoint.x + 0.5, -0.68, routePoint.y + 0.5);
    this.world.add(group);
    this.rat = group;
  }

  private updateCamera(): void {
    this.camera.position.set(this.x, 0, this.z);
    this.camera.lookAt(this.x + Math.cos(this.angle), -0.02, this.z + Math.sin(this.angle));
  }

  private solve(start: MazePoint, end: MazePoint): MazePoint[] {
    const queue: MazePoint[] = [start];
    const parent = new Map<string, MazePoint>();
    const seen = new Set<string>([`${start.x},${start.y}`]);
    while (queue.length) {
      const current = queue.shift()!;
      if (current.x === end.x && current.y === end.y) break;
      const cell = this.cell(current.x, current.y);
      for (let direction = 0; direction < 4; direction += 1) {
        if (cell.walls[direction]) continue;
        const next = { x: current.x + DX[direction]!, y: current.y + DY[direction]! };
        const key = `${next.x},${next.y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        parent.set(key, current);
        queue.push(next);
      }
    }
    const route: MazePoint[] = [end];
    let cursor = end;
    while (cursor.x !== start.x || cursor.y !== start.y) {
      cursor = parent.get(`${cursor.x},${cursor.y}`) ?? start;
      route.push(cursor);
    }
    return route.reverse();
  }

  private createBrickTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#321512"; context.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row += 1) {
      const y = row * 32 + 2;
      for (let column = -1; column < 5; column += 1) {
        const x = column * 64 + (row % 2 ? -32 : 0) + 2;
        const shade = 105 + this.random.int(0, 34);
        context.fillStyle = `rgb(${shade + 24},${Math.round(shade * 0.42)},${Math.round(shade * 0.30)})`;
        context.fillRect(x, y, 59, 27);
        context.fillStyle = "rgba(255,185,135,0.12)"; context.fillRect(x + 2, y + 2, 55, 2);
      }
    }
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1, 1);
    texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }

  private createStoneTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#464944"; context.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) {
      context.fillStyle = `rgb(${96 + this.random.int(0, 30)},${99 + this.random.int(0, 28)},${91 + this.random.int(0, 25)})`;
      context.fillRect(x * 64 + 3, y * 64 + 3, 58, 58);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createRainbowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext("2d")!;
    for (let index = 0; index < 16; index += 1) { context.fillStyle = `hsl(${index * 22.5} 80% 48%)`; context.fillRect(index * 16, 0, 16, 256); }
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createFloorTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext("2d")!; context.fillStyle = "#5a3d24"; context.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) { context.fillStyle = x % 64 ? "#755031" : "#67462b"; context.fillRect(x + 2, 0, 28, 256); context.fillStyle = "rgba(255,215,155,.12)"; context.fillRect(x + 5, 0, 2, 256); }
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(this.size / 2, this.size);
    return texture;
  }

  private createCeilingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext("2d")!; context.fillStyle = "#a7aaa0"; context.fillRect(0, 0, 256, 256);
    context.strokeStyle = "#676a64"; context.lineWidth = 5;
    for (let value = 0; value <= 256; value += 64) { context.beginPath(); context.moveTo(value, 0); context.lineTo(value, 256); context.stroke(); context.beginPath(); context.moveTo(0, value); context.lineTo(256, value); context.stroke(); }
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(this.size / 2, this.size / 2);
    return texture;
  }

  private rebuildMapOverlay(width: number, height: number): void {
    if (!this.showMap || width <= 1 || height <= 1) return;
    this.mapCanvas ??= document.createElement("canvas");
    this.mapCanvas.width = 384; this.mapCanvas.height = 384;
    this.mapContext = this.mapCanvas.getContext("2d");
    this.updateMap();
  }

  private updateMap(): void {
    if (!this.showMap || !this.mapContext || !this.mapCanvas) return;
    const context = this.mapContext;
    const unit = this.mapCanvas.width / this.size;
    context.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
    context.fillStyle = "rgba(0,0,0,.72)"; context.fillRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);
    context.strokeStyle = "#fff"; context.lineWidth = 2;
    for (let y = 0; y < this.size; y += 1) for (let x = 0; x < this.size; x += 1) {
      const cell = this.cell(x, y);
      if (cell.walls[0]) this.mapLine(context, x * unit, y * unit, (x + 1) * unit, y * unit);
      if (cell.walls[3]) this.mapLine(context, x * unit, y * unit, x * unit, (y + 1) * unit);
    }
    context.fillStyle = "#2582ff"; context.beginPath(); context.arc(this.x * unit, this.z * unit, 6, 0, Math.PI * 2); context.fill();
  }

  private mapLine(context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
    context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
  }

  private disposeWorld(): void {
    this.rat = null;
    while (this.world.children.length) {
      const child = this.world.children.pop()!;
      child.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const material of materials) {
          const map = (material as THREE.MeshBasicMaterial).map;
          map?.dispose();
          material.dispose();
        }
      });
    }
  }

  private cell(x: number, y: number): MazeCell {
    return this.cells[y * this.size + x]!;
  }

  private normalizeAngle(value: number): number {
    return Math.atan2(Math.sin(value), Math.cos(value));
  }
}

export const mazeSaver: SaverDefinition = {
  id: "maze",
  name: "3D 迷宫",
  description: "在连续的红砖墙、木地板和方格天花板之间自动寻找黄色笑脸出口。",
  defaults: { speed: 1, map: false, rats: true, texture: "brick" },
  controls: [
    { type: "range", key: "speed", label: "移动速度", min: 0.45, max: 2, step: 0.05, minLabel: "慢", maxLabel: "快" },
    { type: "select", key: "texture", label: "墙壁纹理", options: [{ value: "brick", label: "红砖" }, { value: "stone", label: "石块" }, { value: "rainbow", label: "彩色" }] },
    { type: "toggle", key: "map", label: "显示迷宫地图" },
    { type: "toggle", key: "rats", label: "显示老鼠" },
  ],
  create: (settings, seed, canvas) => {
    if (!canvas) throw new Error("3D Maze requires a canvas");
    return new MazeSaver(canvas, settings, seed);
  },
};
