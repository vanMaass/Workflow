import { createContext, useContext } from "react";
import { createMemoryApi } from "./memory";
import { tauriApi } from "./tauri";
import type { Api } from "./types";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const defaultApi: Api = isTauri ? tauriApi : createMemoryApi({ persist: true });

export const ApiContext = createContext<Api>(defaultApi);

export function useApi(): Api {
  return useContext(ApiContext);
}
