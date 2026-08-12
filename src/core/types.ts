export type SettingValue = string | number | boolean;
export type SaverSettings = Record<string, SettingValue>;

export type RangeControl = {
  type: "range";
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
};

export type SelectControl = {
  type: "select";
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
};

export type ToggleControl = {
  type: "toggle";
  key: string;
  label: string;
};

export type TextControl = {
  type: "text";
  key: string;
  label: string;
  maxLength?: number;
};

export type ColorControl = {
  type: "color";
  key: string;
  label: string;
};

export type ControlDefinition = RangeControl | SelectControl | ToggleControl | TextControl | ColorControl;

export interface ScreenSaver {
  update(dt: number, time: number): void;
  render(context: CanvasRenderingContext2D, width: number, height: number): void;
  resize?(width: number, height: number): void;
  destroy?(): void;
}

export interface CanvasScreenSaver {
  kind: "canvas";
  update(dt: number, time: number): void;
  render(width: number, height: number): void;
  resize?(width: number, height: number): void;
  destroy?(): void;
}

export interface SaverDefinition {
  id: string;
  name: string;
  description: string;
  defaults: SaverSettings;
  controls: ControlDefinition[];
  create(settings: SaverSettings, seed: number, canvas?: HTMLCanvasElement): ScreenSaver | CanvasScreenSaver;
}
