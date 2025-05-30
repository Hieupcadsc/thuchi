"use client";

import React, { type ReactNode, useEffect, useState } from 'react';

// This component is used to ensure that Zustand store is properly hydrated on the client
// and to prevent hydration mismatches when using persisted state.
export function Providers({ children }: { children: ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // You can render a loading state here or null
    return null; 
  }

  return <>{children}</>;
}
