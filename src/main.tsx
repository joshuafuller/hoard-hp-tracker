import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Ask the browser to keep our local data (IndexedDB is evictable, esp. on iOS).
if (typeof navigator !== "undefined" && navigator.storage?.persist) {
  void navigator.storage.persist();
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
