"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import type { PublicConfig } from "@/lib/types";

type PublicConfigContextValue = {
  config: PublicConfig | null;
  isLoading: boolean;
  error: string | null;
};

const PublicConfigContext = createContext<PublicConfigContextValue | undefined>(undefined);

export function PublicConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    api.publicConfig()
      .then((response) => {
        if (isActive) setConfig(response.config);
      })
      .catch(() => {
        if (isActive) setError("Application configuration could not be loaded.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => { isActive = false; };
  }, []);

  const value = useMemo(() => ({ config, isLoading, error }), [config, error, isLoading]);
  return <PublicConfigContext.Provider value={value}>{children}</PublicConfigContext.Provider>;
}

export function usePublicConfig() {
  const context = useContext(PublicConfigContext);
  if (!context) throw new Error("usePublicConfig must be used within PublicConfigProvider.");
  return context;
}
