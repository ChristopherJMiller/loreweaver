/**
 * AI Configuration Store
 *
 * Manages AI-related state including API key storage, model preferences,
 * and AI availability status.
 *
 * Uses Tauri's plugin-store for secure local storage of the API key.
 */

import { create } from "zustand";
import { load, type Store } from "@tauri-apps/plugin-store";

// Storage keys
const STORE_NAME = "ai-config.json";
const API_KEY_KEY = "anthropic_api_key";
const MODEL_PREF_KEY = "model_preference";

export type ModelPreference = "speed" | "balanced" | "quality";

interface AIState {
  // State
  apiKey: string | null;
  isApiKeyValid: boolean | null; // null = not checked, true/false = validation result
  isLoading: boolean;
  modelPreference: ModelPreference;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  validateApiKey: () => boolean;
  setModelPreference: (pref: ModelPreference) => Promise<void>;
}

// Singleton store instance
let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    // Load or create the store file
    storeInstance = await load(STORE_NAME, {
      defaults: {
        [API_KEY_KEY]: null,
        [MODEL_PREF_KEY]: "balanced",
      },
      autoSave: 100, // Auto-save with 100ms debounce
    });
  }
  return storeInstance;
}

/**
 * Validate API key format (basic check)
 * Anthropic keys start with sk-ant-
 */
function isValidKeyFormat(key: string | null): boolean {
  if (!key) return false;
  return key.startsWith("sk-ant-") && key.length > 20;
}

export const useAIStore = create<AIState>()((set, get) => ({
  apiKey: null,
  isApiKeyValid: null,
  isLoading: false,
  modelPreference: "balanced",
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const store = await getStore();
      const key = await store.get<string>(API_KEY_KEY);
      const pref = await store.get<ModelPreference>(MODEL_PREF_KEY);

      const isValid = isValidKeyFormat(key ?? null);

      set({
        apiKey: key ?? null,
        isApiKeyValid: key ? isValid : null,
        modelPreference: pref ?? "balanced",
        isLoading: false,
      });
    } catch (e) {
      console.error("Failed to load AI config:", e);
      set({
        error: `Failed to load AI configuration: ${e}`,
        isLoading: false,
      });
    }
  },

  setApiKey: async (key: string) => {
    set({ isLoading: true, error: null });
    try {
      const store = await getStore();
      await store.set(API_KEY_KEY, key);
      await store.save();

      const isValid = isValidKeyFormat(key);
      set({
        apiKey: key,
        isApiKeyValid: isValid,
        isLoading: false,
      });
    } catch (e) {
      console.error("Failed to save API key:", e);
      set({
        error: `Failed to save API key: ${e}`,
        isLoading: false,
      });
    }
  },

  clearApiKey: async () => {
    set({ isLoading: true, error: null });
    try {
      const store = await getStore();
      await store.delete(API_KEY_KEY);
      await store.save();

      set({
        apiKey: null,
        isApiKeyValid: null,
        isLoading: false,
      });
    } catch (e) {
      console.error("Failed to clear API key:", e);
      set({
        error: `Failed to clear API key: ${e}`,
        isLoading: false,
      });
    }
  },

  validateApiKey: () => {
    const { apiKey } = get();
    const isValid = isValidKeyFormat(apiKey);
    set({ isApiKeyValid: isValid });
    return isValid;
  },

  setModelPreference: async (pref: ModelPreference) => {
    try {
      const store = await getStore();
      await store.set(MODEL_PREF_KEY, pref);
      await store.save();
      set({ modelPreference: pref });
    } catch (e) {
      console.error("Failed to save model preference:", e);
      set({ error: `Failed to save model preference: ${e}` });
    }
  },
}));

/**
 * Check if AI features are available (API key is configured and valid)
 */
export function useAIAvailable(): boolean {
  const { apiKey, isApiKeyValid } = useAIStore();
  return apiKey !== null && isApiKeyValid === true;
}
