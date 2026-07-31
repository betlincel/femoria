"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  readLocation,
  writeLocation,
  type SavedLocation,
} from "@/lib/location";

interface LocationContextValue {
  location: SavedLocation | null;
  save: (location: SavedLocation) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<SavedLocation | null>(null);

  useEffect(() => {
    queueMicrotask(() => setLocation(readLocation(window.localStorage)));
  }, []);

  const save = useCallback((next: SavedLocation) => {
    writeLocation(window.localStorage, next);
    setLocation(next);
  }, []);

  const value = useMemo(() => ({ location, save }), [location, save]);

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useLocationSelection(): LocationContextValue {
  const value = useContext(LocationContext);
  if (!value) {
    throw new Error("useLocationSelection must be used inside LocationProvider");
  }
  return value;
}
