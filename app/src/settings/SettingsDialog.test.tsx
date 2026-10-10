import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ApiContext } from "../api/context";
import { createMemoryApi } from "../api/memory";
import type { Api } from "../api/types";
import { SettingsDialog } from "./SettingsDialog";
import { SettingsProvider } from "./SettingsContext";

function setup(api: Api = createMemoryApi(), onClose = () => {}) {
  render(
    <ApiContext.Provider value={api}>
      <SettingsProvider>
        <SettingsDialog onClose={onClose} />
      </SettingsProvider>
    </ApiContext.Provider>,
  );
  return api;
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("style");
});

describe("SettingsDialog", () => {
  it("zeigt Standardwerte und die kommenden Bereiche", async () => {
    setup();
    expect(await screen.findByRole("dialog", { name: "Einstellungen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Automatisch" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("switch", { name: "Advanced Mode" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Profil")).toBeInTheDocument();
    expect(screen.getByText("Benachrichtigungen")).toBeInTheDocument();
  });

  it("wechselt Hell/Dunkel sofort und speichert es", async () => {
    const user = userEvent.setup();
    const api = setup();
    await user.click(screen.getByRole("button", { name: "Dunkel" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    await waitFor(async () => expect((await api.getSettings()).theme).toBe("dark"));

    await user.click(screen.getByRole("button", { name: "Hell" }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("setzt Akzentfarbe und Schriftart als CSS-Werte", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Grün" }));
    expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#1f6b4f");
    await user.click(screen.getByRole("button", { name: "Mono" }));
    expect(document.documentElement.style.getPropertyValue("--font-ui")).toContain("monospace");
  });

  it("schaltet zwischen Easy und Advanced um", async () => {
    const user = userEvent.setup();
    const api = setup();
    await user.click(screen.getByRole("switch", { name: "Advanced Mode" }));
    expect(screen.getByRole("switch", { name: "Advanced Mode" })).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.mode).toBe("advanced");
    await waitFor(async () => expect((await api.getSettings()).mode).toBe("advanced"));
  });

  it("macht eine Aenderung rueckgaengig und meldet es, wenn Speichern fehlschlaegt", async () => {
    const user = userEvent.setup();
    setup({ ...createMemoryApi(), updateSettings: () => Promise.reject(new Error("gesperrt")) });
    await user.click(screen.getByRole("button", { name: "Dunkel" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("gesperrt");
    expect(screen.getByRole("button", { name: "Automatisch" })).toHaveAttribute("aria-pressed", "true");
  });

  it("schliesst per Escape und per Schliessen-Knopf", async () => {
    const user = userEvent.setup();
    let closed = 0;
    setup(createMemoryApi(), () => closed++);
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    expect(closed).toBe(2);
  });
});
