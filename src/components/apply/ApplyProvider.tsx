"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApplicationModal } from "./ApplicationModal";

interface ApplyContextValue {
  /** Open the application modal, optionally pre-selecting a position title. */
  openApply: (position?: string) => void;
  closeApply: () => void;
}

const ApplyContext = createContext<ApplyContextValue | null>(null);

export function ApplyProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<string | undefined>(undefined);

  const openApply = useCallback((pos?: string) => {
    setPosition(pos);
    setIsOpen(true);
  }, []);

  const closeApply = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ openApply, closeApply }), [openApply, closeApply]);

  return (
    <ApplyContext.Provider value={value}>
      {children}
      <ApplicationModal isOpen={isOpen} onClose={closeApply} position={position} />
    </ApplyContext.Provider>
  );
}

export function useApply(): ApplyContextValue {
  const ctx = useContext(ApplyContext);
  if (!ctx) {
    throw new Error("useApply must be used within an ApplyProvider");
  }
  return ctx;
}
