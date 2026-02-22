import AsyncStorage from "@react-native-async-storage/async-storage";
import { ClassifiedProduct } from "./product-service";

const STORAGE_KEYS = {
  STOCK: "phytocheck_stock",
  SEARCH_COUNT: "phytocheck_search_count",
  IS_PREMIUM: "phytocheck_is_premium",
};

// Freemium limits
export const FREE_SEARCH_LIMIT = 15;
export const FREE_STOCK_LIMIT = 20;

// Stock item (simplified product for storage)
export interface StockItem {
  amm: string;
  nom: string;
  secondaryName?: string; // Secondary name if product was found by secondary name
  classification: string;
  dateAjout: string;
  titulaire: string;
  fonctions: string;
  etat: string;
  quantite: number;
  unite: "L" | "Kg"; // Unit for quantity
}

// Get stock
export async function getStock(): Promise<StockItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.STOCK);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Add to stock (or increment quantity if already present)
export async function addToStock(product: ClassifiedProduct, quantity: number = 1, unite: "L" | "Kg" = "L", secondaryName?: string): Promise<"added" | "incremented" | "limit" | "error"> {
  try {
    const stock = await getStock();
    const isPremium = await getIsPremium();

    // Check if already in stock
    const existingIndex = stock.findIndex((item) => item.amm === product.amm);
    if (existingIndex >= 0) {
      // Increment quantity
      stock[existingIndex].quantite = (stock[existingIndex].quantite || 1) + quantity;
      await AsyncStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stock));
      return "incremented";
    }

    // Check limit for new products
    if (!isPremium && stock.length >= FREE_STOCK_LIMIT) {
      return "limit";
    }

    const item: StockItem = {
      amm: product.amm,
      nom: product.nom,
      secondaryName: secondaryName,
      classification: product.classification,
      dateAjout: new Date().toISOString(),
      titulaire: product.titulaire,
      fonctions: product.fonctions,
      etat: product.etat,
      quantite: quantity,
      unite: unite,
    };

    stock.push(item);
    await AsyncStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stock));
    return "added";
  } catch {
    return "error";
  }
}

// Update quantity for a stock item
export async function updateStockQuantity(amm: string, quantity: number): Promise<boolean> {
  try {
    const stock = await getStock();
    const index = stock.findIndex((item) => item.amm === amm);
    if (index < 0) return false;
    stock[index].quantite = Math.max(0, quantity);
    if (stock[index].quantite === 0) {
      stock.splice(index, 1);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stock));
    return true;
  } catch {
    return false;
  }
}

// Remove from stock
export async function removeFromStock(amm: string): Promise<boolean> {
  try {
    const stock = await getStock();
    const filtered = stock.filter((item) => item.amm !== amm);
    await AsyncStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

// Check if product is in stock
export async function isInStock(amm: string): Promise<boolean> {
  const stock = await getStock();
  return stock.some((item) => item.amm === amm);
}

// Get search count
export async function getSearchCount(): Promise<number> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SEARCH_COUNT);
    return data ? parseInt(data, 10) : 0;
  } catch {
    return 0;
  }
}

// Increment search count
export async function incrementSearchCount(): Promise<number> {
  const count = await getSearchCount();
  const newCount = count + 1;
  await AsyncStorage.setItem(STORAGE_KEYS.SEARCH_COUNT, String(newCount));
  return newCount;
}

// Get remaining searches
export async function getRemainingSearches(): Promise<number> {
  const isPremium = await getIsPremium();
  if (isPremium) return Infinity;
  const count = await getSearchCount();
  return Math.max(0, FREE_SEARCH_LIMIT - count);
}

// Can search
export async function canSearch(): Promise<boolean> {
  const isPremium = await getIsPremium();
  if (isPremium) return true;
  const count = await getSearchCount();
  return count < FREE_SEARCH_LIMIT;
}

// Premium status
export async function getIsPremium(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.IS_PREMIUM);
    return data === "true";
  } catch {
    return false;
  }
}

export async function setIsPremium(value: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.IS_PREMIUM, String(value));
}

// Stock statistics
export interface StockStats {
  total: number;
  homologues: number;
  ppnu: number; // retirés
  cmr: number;
  toxiques: number;
}

export async function getStockStats(): Promise<StockStats> {
  const stock = await getStock();
  return {
    total: stock.length,
    homologues: stock.filter((i) => i.classification === "homologue").length,
    ppnu: stock.filter((i) => i.classification === "retire").length,
    cmr: stock.filter((i) => i.classification === "homologue_cmr").length,
    toxiques: stock.filter((i) => i.classification === "homologue_toxique").length,
  };
}
