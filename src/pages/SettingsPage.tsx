/**
 * Settings Page
 *
 * Configuration page for AI features and other app settings.
 */

import { useEffect } from "react";
import { Settings } from "lucide-react";
import { useAIStore } from "@/stores/aiStore";
import {
  ApiKeySection,
  ModelPreferences,
  AIBehaviorSettings,
  TokenUsageDisplay,
} from "@/components/settings";

export function SettingsPage() {
  const { initialize, isLoading } = useAIStore();

  // Initialize AI store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    document.title = "Settings - Loreweaver";
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-muted-foreground" />
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure AI features and application preferences
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <ApiKeySection />
            <AIBehaviorSettings />
          </div>
          <div className="space-y-6">
            <ModelPreferences />
            <TokenUsageDisplay />
          </div>
        </div>
      )}
    </div>
  );
}
