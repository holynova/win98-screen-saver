import type { SaverSettings } from "./core/types";

const PREFIX = "win98-screen-saver:";

export function loadSettings(id: string, defaults: SaverSettings): SaverSettings {
  try {
    const stored = localStorage.getItem(`${PREFIX}${id}`);
    if (!stored) return { ...defaults };
    const parsed = JSON.parse(stored) as SaverSettings;
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

export function saveSettings(id: string, settings: SaverSettings): void {
  localStorage.setItem(`${PREFIX}${id}`, JSON.stringify(settings));
}

export function loadSelectedSaver(): string | null {
  return localStorage.getItem(`${PREFIX}selected`);
}

export function saveSelectedSaver(id: string): void {
  localStorage.setItem(`${PREFIX}selected`, id);
}
