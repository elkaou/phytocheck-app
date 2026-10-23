import AsyncStorage from "@react-native-async-storage/async-storage";

export const FARM_CULTURES_STORAGE_KEY = "phytocheck_farm_cultures_v1";

function normalizeCulture(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}

export function normalizeFarmCultures(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const unique = new Map<string, string>();
  values.forEach((value) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    const key = normalizeCulture(trimmed);
    if (key && !unique.has(key)) unique.set(key, trimmed);
  });

  return [...unique.values()].sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" }),
  );
}

export async function loadFarmCultures(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(FARM_CULTURES_STORAGE_KEY);
  if (!raw) return [];

  try {
    return normalizeFarmCultures(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveFarmCultures(values: string[]): Promise<string[]> {
  const normalized = normalizeFarmCultures(values);
  await AsyncStorage.setItem(
    FARM_CULTURES_STORAGE_KEY,
    JSON.stringify(normalized),
  );
  return normalized;
}
