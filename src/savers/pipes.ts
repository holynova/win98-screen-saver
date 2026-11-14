import * as THREE from "three";
import { TeapotGeometry } from "three/addons/geometries/TeapotGeometry.js";
import { Random, type Point3 } from "../core/math";
import { booleanSetting, numberSetting, stringSetting } from "../core/settings";
import { ThreeSaver } from "../core/three-saver";
import type { SaverDefinition, SaverSettings } from "../core/types";

interface Pipe {
  color: number;
  nodes: Point3[];
  direction: Point3;
  alive: boolean;
}

const DIRECTIONS: readonly Point3[] = [
  { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 },
];

const PIPE_COLORS = [0xd52f26, 0x2176c7, 0xe8c42c, 0x30a04a, 0x23b6b5, 0xb54eb4, 0xc6c6b8];
const WORLD_SCALE = 0.82;

class PipesSaver extends ThreeSaver {
  private readonly random: Random;
  private readonly pipes: Pipe[] = [];
  private readonly occupied = new Set<string>();
  private readonly group = new THREE.Group();
  private readonly materials = new Map<number, THREE.MeshPhongMaterial>();
  private readonly speed: number;
  private readonly flex: boolean;
  private readonly striped: boolean;
  private readonly joint: string;
  private readonly pipeCount: number;
  private readonly cylinderGeometry = new THREE.CylinderGeometry(0.20, 0.20, WORLD_SCALE, 18, 1, false);
  private readonly sphereGeometry = new THREE.SphereGeometry(0.27, 18, 14);
  private readonly torusGeometry = new THREE.SphereGeometry(0.225, 16, 12);
  private accumulator = 0;
  private resetTimer = 0;
  private segmentCount = 0;

  constructor(canvas: HTMLCanvasElement, settings: SaverSettings, seed: number) {
    super(canvas, 43);
    this.random = new Random(seed);
    this.speed = numberSetting(settings, "speed", 1);
    this.flex = booleanSetting(settings, "flex", false);
    this.striped = stringSetting(settings, "surface", "solid") === "candy";
    this.joint = stringSetting(settings, "joint", "mixed");
    this.pipeCount = booleanSetting(settings, "multiple", true) ? 6 : 1;
    this.scene.add(this.group);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 1.45));
    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(-5, 8, 10);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x6ea9ff, 0.7);
    fill.position.set(6, -3, 5);
    this.scene.add(fill);
    this.camera.position.set(9.2, 6.9, 13.2);
    this.camera.lookAt(0, 0, 0);
    this.resetScene();
  }

  update(dt: number): void {
    this.accumulator += dt * this.speed;
    this.group.rotation.y += dt * 0.012;
    if (this.resetTimer > 0) {
      this.resetTimer -= dt;
      if (this.resetTimer <= 0) this.resetScene();
      return;
    }
    while (this.accumulator >= 0.12) {
      this.accumulator -= 0.12;
      for (const pipe of this.pipes) this.grow(pipe);
      if (this.pipes.every((pipe) => !pipe.alive) || this.segmentCount > 300) this.resetTimer = 1.1;
    }
  }

  private resetScene(): void {
    this.disposeGroup();
    this.pipes.length = 0;
    this.occupied.clear();
    this.segmentCount = 0;
    for (let index = 0; index < this.pipeCount; index += 1) this.addPipe(index);
  }

  private addPipe(index: number): void {
    let start: Point3;
    do {
      start = { x: this.random.int(-6, 6), y: this.random.int(-4, 4), z: this.random.int(-4, 4) };
    } while (this.occupied.has(this.key(start)));
    this.occupied.add(this.key(start));
    this.pipes.push({
      color: PIPE_COLORS[index % PIPE_COLORS.length]!,
      nodes: [start],
      direction: this.random.pick(DIRECTIONS),
      alive: true,
    });
  }

  private grow(pipe: Pipe): void {
    if (!pipe.alive) return;
    const current = pipe.nodes.at(-1)!;
    const options = DIRECTIONS.filter((direction) => {
      if (direction.x === -pipe.direction.x && direction.y === -pipe.direction.y && direction.z === -pipe.direction.z) return false;
      const next = { x: current.x + direction.x, y: current.y + direction.y, z: current.z + direction.z };
      return Math.abs(next.x) <= 7 && Math.abs(next.y) <= 5 && Math.abs(next.z) <= 5 && !this.occupied.has(this.key(next));
    });
    if (!options.length) {
      pipe.alive = false;
      return;
    }
    const straight = options.find((direction) => this.sameDirection(direction, pipe.direction));
    const direction = straight && this.random.next() < 0.62 ? straight : this.random.pick(options);
    const next = { x: current.x + direction.x, y: current.y + direction.y, z: current.z + direction.z };
    this.addSegment(current, next, pipe.color);
    if (!this.sameDirection(direction, pipe.direction)) this.addJoint(current, pipe.color, direction);
    pipe.direction = direction;
    pipe.nodes.push(next);
    this.occupied.add(this.key(next));
    this.segmentCount += 1;
  }

  private addSegment(start: Point3, end: Point3, color: number): void {
    const material = this.material(color);
    if (this.flex) {
      const startVector = this.vector(start);
      const endVector = this.vector(end);
      const midpoint = startVector.clone().lerp(endVector, 0.5).add(new THREE.Vector3(0.05, 0.04, 0.03));
      const curve = new THREE.CatmullRomCurve3([startVector, midpoint, endVector]);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.20, 16, false), material);
      this.group.add(mesh);
      return;
    }
    const startVector = this.vector(start);
    const endVector = this.vector(end);
    const mesh = new THREE.Mesh(this.cylinderGeometry, material);
    mesh.position.copy(startVector).lerp(endVector, 0.5);
    const direction = endVector.clone().sub(startVector).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    this.group.add(mesh);
    if (this.striped) this.addCandyBands(startVector, endVector, direction);
  }

  private addCandyBands(start: THREE.Vector3, end: THREE.Vector3, direction: THREE.Vector3): void {
    const bandMaterial = new THREE.MeshPhongMaterial({ color: 0xf5f1e5, shininess: 70, flatShading: false });
    for (const position of [0.25, 0.52, 0.79]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.207, 0.207, 0.075, 18), bandMaterial);
      band.position.copy(start).lerp(end, position);
      band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      this.group.add(band);
    }
  }

  private addJoint(point: Point3, color: number, direction: Point3): void {
    const jointType = this.joint === "mixed" ? (this.random.next() < 0.48 ? "ball" : "elbow") : this.joint;
    const geometry = jointType === "ball" ? this.sphereGeometry : this.torusGeometry;
    const mesh = new THREE.Mesh(geometry, this.material(color));
    mesh.position.copy(this.vector(point));
    if (jointType === "elbow") {
      mesh.scale.set(1.04, 1.04, 1.04);
      mesh.position.add(this.vectorDirection(direction).multiplyScalar(0.015));
    }
    this.group.add(mesh);
    if (this.joint === "mixed" && this.random.next() < 0.0012) this.addTeapot(point, color);
  }

  private addTeapot(point: Point3, color: number): void {
    const teapot = new THREE.Mesh(new TeapotGeometry(0.42, 6, true, true, true, false, true), this.material(color));
    teapot.position.copy(this.vector(point));
    teapot.rotation.set(-Math.PI / 2, this.random.range(0, Math.PI * 2), 0);
    this.group.add(teapot);
  }

  private material(color: number): THREE.MeshPhongMaterial {
    let material = this.materials.get(color);
    if (!material) {
      material = new THREE.MeshPhongMaterial({ color, shininess: 92, specular: 0xffffff, flatShading: false });
      this.materials.set(color, material);
    }
    return material;
  }

  private vector(point: Point3): THREE.Vector3 {
    return new THREE.Vector3(point.x * WORLD_SCALE, point.y * WORLD_SCALE, point.z * WORLD_SCALE);
  }

  private vectorDirection(point: Point3): THREE.Vector3 {
    return new THREE.Vector3(point.x, point.y, point.z);
  }

  private sameDirection(a: Point3, b: Point3): boolean {
    return a.x === b.x && a.y === b.y && a.z === b.z;
  }

  private key(point: Point3): string {
    return `${point.x},${point.y},${point.z}`;
  }

  private disposeGroup(): void {
    while (this.group.children.length) {
      const child = this.group.children.pop() as THREE.Mesh;
      if (child.geometry !== this.cylinderGeometry && child.geometry !== this.sphereGeometry && child.geometry !== this.torusGeometry) child.geometry?.dispose();
      if (child.material && !Array.from(this.materials.values()).includes(child.material as THREE.MeshPhongMaterial)) (child.material as THREE.Material).dispose();
    }
  }
}

export const pipesSaver: SaverDefinition = {
  id: "pipes",
  name: "3D 管道",
  description: "恒定半径的彩色圆管沿三维格点生长，以光亮弯管和球形接头穿过黑色空间。",
  defaults: { multiple: true, flex: false, joint: "mixed", surface: "solid", speed: 1 },
  controls: [
    { type: "toggle", key: "multiple", label: "多根管道" },
    { type: "toggle", key: "flex", label: "弯曲管道" },
    { type: "select", key: "joint", label: "接头", options: [{ value: "elbow", label: "弯头" }, { value: "ball", label: "球体" }, { value: "mixed", label: "混合" }] },
    { type: "select", key: "surface", label: "表面", options: [{ value: "solid", label: "实体" }, { value: "candy", label: "糖果条纹" }] },
    { type: "range", key: "speed", label: "生长速度", min: 0.35, max: 2.2, step: 0.05, minLabel: "慢", maxLabel: "快" },
  ],
  create: (settings, seed, canvas) => {
    if (!canvas) throw new Error("3D Pipes requires a canvas");
    return new PipesSaver(canvas, settings, seed);
  },
};
