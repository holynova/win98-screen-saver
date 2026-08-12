import type { SaverSettings } from "./types";

export const numberSetting = (settings: SaverSettings, key: string, fallback: number): number => {
  const value = settings[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

export const stringSetting = (settings: SaverSettings, key: string, fallback: string): string => {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
};

export const booleanSetting = (settings: SaverSettings, key: string, fallback: boolean): boolean => {
  const value = settings[key];
  return typeof value === "boolean" ? value : fallback;
};
