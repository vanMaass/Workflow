import type { Api } from "../api/types";

/**
 * Meldet nach jeder erfolgreichen schreibenden Api-Methode (alles ausser `get…`, `list…` und
 * `trashCount`), dass sich Daten geaendert haben. So bleiben Anzeigen wie der Papierkorb-Zaehler
 * in der Navigation aktuell, ohne dass jede Stelle selbst melden muss.
 */
export function trackMutations(api: Api, onChange: () => void): Api {
  const readOnly = (name: string) => name.startsWith("get") || name.startsWith("list") || name === "trashCount";
  return new Proxy(api, {
    get(target, property, receiver) {
      const value: unknown = Reflect.get(target, property, receiver);
      if (typeof value !== "function" || typeof property !== "string" || readOnly(property)) return value;
      return (...args: unknown[]) =>
        Promise.resolve(value.apply(target, args)).then((result: unknown) => {
          onChange();
          return result;
        });
    },
  });
}
