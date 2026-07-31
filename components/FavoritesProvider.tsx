"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createFavoritesService,
  toggleFavorite,
  type FavoritesService,
} from "@/lib/favorites";

interface FavoritesContextValue {
  ids: string[];
  ready: boolean;
  toggle: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const service = useRef<FavoritesService>(
    createFavoritesService(null),
  );
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const browserService = createFavoritesService(window.localStorage);
    service.current = browserService;
    queueMicrotask(() => {
      setIds(browserService.read());
      setReady(true);
    });
  }, []);

  const toggle = useCallback(
    (productId: string) => {
      setIds((current) => {
        const next = toggleFavorite(current, productId);
        service.current.write(next);
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      ids,
      ready,
      toggle,
      isFavorite: (productId: string) => ids.includes(productId),
    }),
    [ids, ready, toggle],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites must be used inside FavoritesProvider");
  return value;
}
