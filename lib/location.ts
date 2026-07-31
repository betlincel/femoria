import type { Locale } from "./types";

const LOCATION_KEY = "femoria-demo-location";

export type LocationStatus =
  | "idle"
  | "pending"
  | "loading"
  | "found"
  | "denied"
  | "error"
  | "manual";

export interface SavedLocation {
  city: string;
  district: string;
  label: string;
  source: "browser" | "manual";
}

export interface LocationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function fallbackLocationStatus(
  errorCode: number | undefined,
): LocationStatus {
  return errorCode === 1 ? "denied" : "error";
}

export function readLocation(storage: LocationStorage | null): SavedLocation | null {
  if (!storage) return null;
  try {
    const parsed: unknown = JSON.parse(storage.getItem(LOCATION_KEY) ?? "null");
    if (
      parsed &&
      typeof parsed === "object" &&
      "city" in parsed &&
      "district" in parsed &&
      "label" in parsed &&
      "source" in parsed &&
      typeof parsed.city === "string" &&
      typeof parsed.district === "string" &&
      typeof parsed.label === "string" &&
      (parsed.source === "browser" || parsed.source === "manual")
    ) {
      return parsed as SavedLocation;
    }
  } catch {
    return null;
  }
  return null;
}

export function writeLocation(
  storage: LocationStorage | null,
  location: SavedLocation,
): void {
  storage?.setItem(LOCATION_KEY, JSON.stringify(location));
}

export function approximateBrowserLocation(locale: Locale): SavedLocation {
  return {
    city: locale === "tr" ? "Yakınım" : "Nearby",
    district: locale === "tr" ? "Yaklaşık bölge" : "Approximate area",
    label: locale === "tr" ? "Yaklaşık konum" : "Approximate location",
    source: "browser",
  };
}
