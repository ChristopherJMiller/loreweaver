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
const CONSISTENCY_CHECK_KEY = "consistency_check_on_save";
const SHOW_REASONING_KEY = "show_ai_reasoning";

export type ModelPreference = "speed" | "balanced" | "quality";

interface AIState {
  // State
  apiKey: string | null;
  isApiKeyValid: boolean | null; // null = not checked, true/false = validation result
  isLoading: boolean;
  modelPreference: ModelPreference;
  consistencyCheckOnSave: boolean;
  showAiReasoning: boolean;
  error: string | null;
  /** Connection test state */
  isTestingConnection: boolean;
  connectionTestResult: "success" | "error" | null;
  connectionTestError: string | null;

  // Actions
  initialize: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  validateApiKey: () => boolean;
  setModelPreference: (pref: ModelPreference) => Promise<void>;
  setConsistencyCheckOnSave: (enabled: boolean) => Promise<void>;
  setShowAiReasoning: (enabled: boolean) => Promise<void>;
  testConnection: () => Promise<boolean>;
  resetToDefaults: () => Promise<void>;
}

// Singleton store instance
let storeInstance: Store | null = null;

/** Default values for AI settings */
const DEFAULTS = {
  modelPreference: "balanced" as ModelPreference,
  consistencyCheckOnSave: true,
  showAiReasoning: false,
};

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    // Load or create the store file
    storeInstance = await load(STORE_NAME, {
      defaults: {
        [API_KEY_KEY]: null,
        [MODEL_PREF_KEY]: DEFAULTS.modelPreference,
        [CONSISTENCY_CHECK_KEY]: DEFAULTS.consistencyCheckOnSave,
        [SHOW_REASONING_KEY]: DEFAULTS.showAiReasoning,
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
  modelPreference: DEFAULTS.modelPreference,
  consistencyCheckOnSave: DEFAULTS.consistencyCheckOnSave,
  showAiReasoning: DEFAULTS.showAiReasoning,
  error: null,
  isTestingConnection: false,
  connectionTestResult: null,
  connectionTestError: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const store = await getStore();
      const key = await store.get<string>(API_KEY_KEY);
      const pref = await store.get<ModelPreference>(MODEL_PREF_KEY);
      const consistencyCheck = await store.get<boolean>(CONSISTENCY_CHECK_KEY);
      const showReasoning = await store.get<boolean>(SHOW_REASONING_KEY);

      const isValid = isValidKeyFormat(key ?? null);

      set({
        apiKey: key ?? null,
        isApiKeyValid: key ? isValid : null,
        modelPreference: pref ?? DEFAULTS.modelPreference,
        consistencyCheckOnSave: consistencyCheck ?? DEFAULTS.consistencyCheckOnSave,
        showAiReasoning: showReasoning ?? DEFAULTS.showAiReasoning,
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

  setConsistencyCheckOnSave: async (enabled: boolean) => {
    try {
      const store = await getStore();
      await store.set(CONSISTENCY_CHECK_KEY, enabled);
      await store.save();
      set({ consistencyCheckOnSave: enabled });
    } catch (e) {
      console.error("Failed to save consistency check setting:", e);
      set({ error: `Failed to save setting: ${e}` });
    }
  },

  setShowAiReasoning: async (enabled: boolean) => {
    try {
      const store = await getStore();
      await store.set(SHOW_REASONING_KEY, enabled);
      await store.save();
      set({ showAiReasoning: enabled });
    } catch (e) {
      console.error("Failed to save show reasoning setting:", e);
      set({ error: `Failed to save setting: ${e}` });
    }
  },

  testConnection: async () => {
    const { apiKey } = get();
    if (!apiKey) {
      set({
        connectionTestResult: "error",
        connectionTestError: "No API key configured",
      });
      return false;
    }

    set({
      isTestingConnection: true,
      connectionTestResult: null,
      connectionTestError: null,
    });

    try {
      // Import dynamically to avoid circular dependencies
      const { initializeClient, getClient } = await import("@/ai/client");

      // Initialize or reinitialize the client with current key
      initializeClient(apiKey);
      const client = getClient();

      // Make a minimal API call to test the connection
      // Using a simple message that should be very cheap
      await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      });

      set({
        isTestingConnection: false,
        connectionTestResult: "success",
        isApiKeyValid: true,
      });
      return true;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Connection test failed:", e);
      set({
        isTestingConnection: false,
        connectionTestResult: "error",
        connectionTestError: errorMessage,
        isApiKeyValid: false,
      });
      return false;
    }
  },

  resetToDefaults: async () => {
    try {
      const store = await getStore();
      await store.set(MODEL_PREF_KEY, DEFAULTS.modelPreference);
      await store.set(CONSISTENCY_CHECK_KEY, DEFAULTS.consistencyCheckOnSave);
      await store.set(SHOW_REASONING_KEY, DEFAULTS.showAiReasoning);
      await store.save();
      set({
        modelPreference: DEFAULTS.modelPreference,
        consistencyCheckOnSave: DEFAULTS.consistencyCheckOnSave,
        showAiReasoning: DEFAULTS.showAiReasoning,
      });
    } catch (e) {
      console.error("Failed to reset settings:", e);
      set({ error: `Failed to reset settings: ${e}` });
    }
  },
}));

/**
 * Check if AI features are available (API key is configured and valid)
 */
export function useAIAvailable(): boolean {
  const apiKey = useAIStore((state) => state.apiKey);
  const isApiKeyValid = useAIStore((state) => state.isApiKeyValid);
  return apiKey !== null && isApiKeyValid === true;
}
