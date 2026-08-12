export class Random {
  private state: number;

  constructor(seed = Date.now()) {
    this.state = seed >>> 0 || 0x6d2b79f5;
  }

  next(): number {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(this.next() * items.length))]!;
  }
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (start: number, end: number, amount: number): number =>
  start + (end - start) * amount;

export const wrap = (value: number, max: number): number => ((value % max) + max) % max;

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

export function rotatePoint(point: Point3, rx: number, ry: number, rz = 0): Point3 {
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const y1 = point.y * cosX - point.z * sinX;
  const z1 = point.y * sinX + point.z * cosX;
  const x2 = point.x * cosY + z1 * sinY;
  const z2 = -point.x * sinY + z1 * cosY;
  return {
    x: x2 * cosZ - y1 * sinZ,
    y: x2 * sinZ + y1 * cosZ,
    z: z2,
  };
}

export function projectPoint(point: Point3, width: number, height: number, camera = 5): { x: number; y: number; scale: number; depth: number } {
  const depth = Math.max(0.2, camera - point.z);
  const focal = Math.min(width, height) * 0.82;
  const scale = focal / depth;
  return {
    x: width / 2 + point.x * scale,
    y: height / 2 - point.y * scale,
    scale,
    depth,
  };
}
