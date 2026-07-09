"use client";

import { BrowserRouter } from "react-router-dom";
import { App } from "./App";

export function PlatformClient() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
