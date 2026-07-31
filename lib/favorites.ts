import { z } from "zod";

const FAVORITES_KEY = "femoria-demo-favorites";
const productIdSchema = z.string().uuid();

export interface FavoritesService {
  read(): string[];
  write(ids: string[]): void;
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function toggleFavorite(ids: string[], productId: string): string[] {
  return ids.includes(productId)
    ? ids.filter((id) => id !== productId)
    : [...ids, productId];
}

export function isDatabaseProductId(productId: string): boolean {
  return productIdSchema.safeParse(productId).success;
}

export function mergeFavoriteIds(
  localIds: string[],
  remoteIds: string[],
  existingDatabaseProductIds: string[],
): string[] {
  const allowedLocal = new Set(existingDatabaseProductIds);
  return [...new Set([
    ...remoteIds.filter(isDatabaseProductId),
    ...localIds.filter((id) => isDatabaseProductId(id) && allowedLocal.has(id)),
  ])];
}

export function createFavoritesService(
  storage: StorageAdapter | null,
): FavoritesService {
  return {
    read() {
      if (!storage) return [];
      try {
        const value: unknown = JSON.parse(storage.getItem(FAVORITES_KEY) ?? "[]");
        return Array.isArray(value)
          ? [...new Set(value.filter((item): item is string => typeof item === "string"))]
          : [];
      } catch {
        return [];
      }
    },
    write(ids) {
      if (!storage) return;
      storage.setItem(FAVORITES_KEY, JSON.stringify([...new Set(ids)]));
    },
  };
}
