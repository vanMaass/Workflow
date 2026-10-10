import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ApiContext } from "../api/context";
import { createMemoryApi } from "../api/memory";
import type { Api } from "../api/types";
import { toDateString } from "../lib/date";
import { SettingsProvider } from "../settings/SettingsContext";
import { AufgabenView } from "./AufgabenView";

const today = toDateString(new Date());

async function setup(options: { api?: Api; advanced?: boolean } = {}) {
  const api = options.api ?? createMemoryApi();
  if (options.advanced) await api.updateSettings({ mode: "advanced" });
  render(
    <ApiContext.Provider value={api}>
      <SettingsProvider>
        <AufgabenView />
      </SettingsProvider>
    </ApiContext.Provider>,
  );
  return api;
}

/** Das Kategorie-Feld; sein Name besteht aus Titel und Anzahl, z. B. "Inbox 2". */
const tile = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name} \\d+$`) });
const list = () => screen.getByRole("main", { name: "Aufgabenliste" });

beforeEach(() => window.localStorage.clear());

describe("AufgabenView (Kategorien-Spalte)", () => {
  it("zeigt im Easy Mode die vier festen Felder und die Inbox", async () => {
    await setup();
    for (const name of ["Inbox", "Heute", "Demnächst", "Erledigt"]) {
      expect(await screen.findByRole("button", { name: new RegExp(`^${name} \\d+$`) })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Inbox", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Kategorie hinzufügen" })).not.toBeInTheDocument();
  });

  it("zeigt per Klick auf ein Feld die Aufgaben dieser Kategorie", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    await api.createTask({ title: "Mail", categoryId: "Inbox", date: today });
    await api.createTask({ title: "Plan", categoryId: "Heute", date: today });
    await setup({ api });

    expect(await within(list()).findByText("Mail")).toBeInTheDocument();
    expect(within(list()).queryByText("Plan")).not.toBeInTheDocument();

    await user.click(tile("Heute"));
    expect(within(list()).getByText("Plan")).toBeInTheDocument();
    expect(within(list()).queryByText("Mail")).not.toBeInTheDocument();
    expect(tile("Heute")).toHaveAttribute("aria-current", "true");
  });

  it("erfasst Aufgaben direkt in der gewaehlten Kategorie", async () => {
    const user = userEvent.setup();
    const api = await setup();
    await user.click(await screen.findByRole("button", { name: /^Heute \d+$/ }));
    await user.type(screen.getByLabelText("Aufgabe hinzufügen"), "Dringend{Enter}");
    await waitFor(() => expect(within(list()).getByText("Dringend")).toBeInTheDocument());
    expect((await api.getToday(today)).tasks.map((t) => t.title)).toEqual(["Dringend"]);
  });

  it("Abhaken verschiebt nach Erledigt, Rückgängig stellt wieder her", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    await api.createTask({ title: "Plan", categoryId: "Heute", date: today });
    await setup({ api });
    await user.click(await screen.findByRole("button", { name: /^Heute \d+$/ }));

    await user.click(await screen.findByRole("checkbox", { name: "Plan erledigen" }));
    expect(await screen.findByRole("status")).toHaveTextContent("nach Erledigt verschoben");
    expect(within(list()).queryByText("Plan")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rückgängig" }));
    await waitFor(() => expect(within(list()).getByText("Plan")).toBeInTheDocument());
    expect((await api.listTasks())[0]).toMatchObject({ categoryId: "Heute", plannedDate: today });
  });

  it("holt eine abgehakte Aufgabe dorthin zurück, wo sie abgehakt wurde", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    await api.createTask({ title: "Später", categoryId: "Demnaechst", date: today });
    await setup({ api });
    await user.click(await screen.findByRole("button", { name: /^Demnächst \d+$/ }));

    await user.click(await screen.findByRole("checkbox", { name: "Später erledigen" }));
    await user.click(await screen.findByRole("button", { name: /^Erledigt 1$/ }));
    await user.click(await screen.findByRole("checkbox", { name: "Später erledigen" }));

    expect(await screen.findByRole("status")).toHaveTextContent("nach Demnächst zurückgeholt");
    expect((await api.listTasks())[0]?.categoryId).toBe("Demnaechst");
    await user.click(screen.getByRole("button", { name: "Rückgängig" }));
    await waitFor(async () => expect((await api.listTasks())[0]?.categoryId).toBe("Erledigt"));
  });

  it("löscht erledigte Aufgaben einzeln und stellt sie mit Rückgängig wieder her", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const task = await api.createTask({ title: "Fertig", categoryId: "Inbox", date: today });
    await api.moveTask(task.id, "Erledigt", today);
    await setup({ api });
    await user.click(await screen.findByRole("button", { name: /^Erledigt 1$/ }));

    await user.click(await screen.findByRole("button", { name: "Fertig löschen" }));
    expect(await screen.findByRole("status")).toHaveTextContent("„Fertig“ gelöscht");
    expect(await api.listTasks()).toHaveLength(0);
    expect(within(list()).queryByText("Fertig")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rückgängig" }));
    expect(await within(list()).findByText("Fertig")).toBeInTheDocument();
  });

  it("löscht mit „Alle löschen“ alle erledigten, aber keine offenen Aufgaben", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    for (const title of ["A", "B"]) {
      const task = await api.createTask({ title, categoryId: "Inbox", date: today });
      await api.moveTask(task.id, "Erledigt", today);
    }
    await api.createTask({ title: "Offen", categoryId: "Inbox", date: today });
    await setup({ api });

    expect(screen.queryByRole("button", { name: "Alle löschen" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /^Erledigt 2$/ }));
    await user.click(screen.getByRole("button", { name: "Alle löschen" }));

    expect(await screen.findByRole("status")).toHaveTextContent("2 erledigte Aufgaben gelöscht");
    expect((await api.listTasks()).map((t) => t.title)).toEqual(["Offen"]);
    expect(screen.queryByRole("button", { name: "Alle löschen" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rückgängig" }));
    await waitFor(async () => expect(await api.listTasks()).toHaveLength(3));
  });

  it("verschiebt per Drag and drop auf ein Feld", async () => {
    const api = createMemoryApi();
    await api.createTask({ title: "Ziehen", categoryId: "Inbox", date: today });
    await setup({ api });
    const row = (await screen.findByText("Ziehen")).closest("li");
    if (!row) throw new Error("Zeile fehlt");
    const dataTransfer = { setData() {}, effectAllowed: "" };

    fireEvent.dragStart(row, { dataTransfer });
    fireEvent.dragOver(tile("Demnächst"), { dataTransfer });
    fireEvent.drop(tile("Demnächst"), { dataTransfer });

    await waitFor(async () => expect((await api.listTasks())[0]?.categoryId).toBe("Demnaechst"));
    expect(await screen.findByRole("status")).toHaveTextContent("nach Demnächst verschoben");
  });

  it("verschiebt ohne Maus ueber das Menue an der Aufgabe", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    await api.createTask({ title: "Menü", categoryId: "Inbox", date: today });
    await setup({ api });

    await user.click(await screen.findByRole("button", { name: "Menü verschieben" }));
    const items = screen.getAllByRole("menuitem").map((i) => i.textContent);
    expect(items).toEqual(["Heute", "Demnächst", "Erledigt"]);
    await user.click(screen.getByRole("menuitem", { name: "Heute" }));
    await waitFor(async () =>
      expect((await api.listTasks())[0]).toMatchObject({ categoryId: "Heute", plannedDate: today }),
    );
  });

  it("meldet Ladefehler sichtbar", async () => {
    await setup({ api: { ...createMemoryApi(), listTasks: () => Promise.reject(new Error("kaputt")) } });
    expect(await screen.findByRole("alert")).toHaveTextContent("kaputt");
  });
});

describe("AufgabenView im Advanced Mode", () => {
  it("legt eine eigene Kategorie an und waehlt sie aus", async () => {
    const user = userEvent.setup();
    await setup({ advanced: true });
    await user.click(await screen.findByRole("button", { name: "+ Kategorie hinzufügen" }));
    await user.type(screen.getByLabelText("Name der neuen Kategorie"), "Kunde A{Enter}");

    expect(await screen.findByRole("button", { name: /^Kunde A 0$/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("heading", { name: "Kunde A", level: 1 })).toBeInTheDocument();
  });

  it("entfernt eine eigene Kategorie, Aufgaben wandern in die Inbox, Rückgängig stellt sie her", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const kunde = await api.createCategory("Kunde A");
    await api.createTask({ title: "Angebot", categoryId: kunde.id, date: today });
    await setup({ api, advanced: true });

    await user.click(await screen.findByRole("button", { name: "Kategorie Kunde A entfernen" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Kategorie „Kunde A“ entfernt");
    expect(screen.queryByRole("button", { name: /^Kunde A/ })).not.toBeInTheDocument();
    expect(tile("Inbox")).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "Rückgängig" }));
    expect(await screen.findByRole("button", { name: /^Kunde A 1$/ })).toBeInTheDocument();
  });

  it("feste Kategorien haben keinen Entfernen-Knopf", async () => {
    await setup({ advanced: true });
    await screen.findByRole("button", { name: /^Inbox \d+$/ });
    expect(screen.queryByRole("button", { name: "Kategorie Inbox entfernen" })).not.toBeInTheDocument();
  });

  it("blendet eigene Kategorien im Easy Mode aus, ohne Aufgaben zu verlieren", async () => {
    const api = createMemoryApi();
    const kunde = await api.createCategory("Kunde A");
    await api.createTask({ title: "Angebot", categoryId: kunde.id, date: today });
    await setup({ api });

    expect(screen.queryByRole("button", { name: /^Kunde A/ })).not.toBeInTheDocument();
    expect(await within(list()).findByText("Angebot")).toBeInTheDocument();
    expect((await api.listTasks())[0]?.categoryId).toBe(kunde.id);
  });
});
