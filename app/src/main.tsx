import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SettingsProvider } from "./settings/SettingsContext";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Wurzelelement #root fehlt.");

createRoot(root).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);
