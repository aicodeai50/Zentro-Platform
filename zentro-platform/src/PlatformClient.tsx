"use client";

import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";

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
      <App />
    </BrowserRouter>
  );
}
