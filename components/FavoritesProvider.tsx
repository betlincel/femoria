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
import { z } from "zod";
import {
  createFavoritesService,
  isDatabaseProductId,
  mergeFavoriteIds,
  toggleFavorite,
  type FavoritesService,
} from "@/lib/favorites";
import { createClient } from "@/lib/supabase/client";
import { isFavoritesSyncEnabled } from "@/lib/supabase/env";

interface FavoritesContextValue {
  ids: string[];
  ready: boolean;
  toggle: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
}

const favoriteRowsSchema = z.array(z.object({ product_id: z.string().uuid() }));
const productRowsSchema = z.array(z.object({ id: z.string().uuid() }));
const FavoritesContext = createContext<FavoritesContextValue | null>(null);

async function syncFavorite(userId: string, productId: string, add: boolean) {
  const supabase = createClient();
  if (add) {
    await supabase.from("favorites").upsert(
      { buyer_id: userId, product_id: productId },
      { onConflict: "buyer_id,product_id" },
    );
    return;
  }
  await supabase.from("favorites").delete().eq("buyer_id", userId).eq("product_id", productId);
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const service = useRef<FavoritesService>(createFavoritesService(null));
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const browserService = createFavoritesService(window.localStorage);
    const supabase = createClient();
    service.current = browserService;

    const hydrate = async (authenticatedUserId: string | null) => {
      const localIds = browserService.read();
      setUserId(authenticatedUserId);
      if (!authenticatedUserId || !isFavoritesSyncEnabled()) {
        setIds(localIds);
        setReady(true);
        return;
      }

      const remoteResult = await supabase
        .from("favorites")
        .select("product_id")
        .eq("buyer_id", authenticatedUserId);
      const remoteRows = favoriteRowsSchema.safeParse(remoteResult.data);
      if (remoteResult.error || !remoteRows.success) {
        setIds(localIds);
        setReady(true);
        return;
      }

      const localDatabaseIds = localIds.filter(isDatabaseProductId);
      let existingDatabaseProductIds: string[] = [];
      if (localDatabaseIds.length) {
        const productsResult = await supabase
          .from("products")
          .select("id")
          .in("id", localDatabaseIds);
        const productRows = productRowsSchema.safeParse(productsResult.data);
        if (!productsResult.error && productRows.success) {
          existingDatabaseProductIds = productRows.data.map((row) => row.id);
        }
      }

      const remoteIds = remoteRows.data.map((row) => row.product_id);
      const merged = mergeFavoriteIds(localIds, remoteIds, existingDatabaseProductIds);
      const missingRemoteIds = merged.filter((id) => !remoteIds.includes(id));
      if (missingRemoteIds.length) {
        await supabase.from("favorites").upsert(
          missingRemoteIds.map((productId) => ({
            buyer_id: authenticatedUserId,
            product_id: productId,
          })),
          { onConflict: "buyer_id,product_id" },
        );
      }
      browserService.write(merged);
      setIds(merged);
      setReady(true);
    };

    void supabase.auth.getUser().then(({ data }) => hydrate(data.user?.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void hydrate(session?.user.id ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const toggle = useCallback(
    (productId: string) => {
      setIds((current) => {
        const add = !current.includes(productId);
        const next = toggleFavorite(current, productId);
        service.current.write(next);
        if (
          userId &&
          isFavoritesSyncEnabled() &&
          isDatabaseProductId(productId)
        ) {
          void syncFavorite(userId, productId, add);
        }
        return next;
      });
    },
    [userId],
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

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("useFavorites must be used inside FavoritesProvider");
  return value;
}
