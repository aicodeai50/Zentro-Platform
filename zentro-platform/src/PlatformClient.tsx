"use client";

import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AppSessionProvider } from "./lib/appSession";

export function PlatformClient() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <BrowserRouter>
      <AppSessionProvider>
        <App />
      </AppSessionProvider>
    </BrowserRouter>
  );
}
