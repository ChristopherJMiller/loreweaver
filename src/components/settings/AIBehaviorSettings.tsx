/**
 * AI Behavior Settings Section
 *
 * Toggles for AI behavior preferences and connection testing.
 */

import { CheckCircle2, XCircle, Loader2, RotateCcw, Wifi } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAIStore } from "@/stores/aiStore";
import { cn } from "@/lib/utils";

export function AIBehaviorSettings() {
  const {
    apiKey,
    consistencyCheckOnSave,
    showAiReasoning,
    setConsistencyCheckOnSave,
    setShowAiReasoning,
    isTestingConnection,
    connectionTestResult,
    connectionTestError,
    testConnection,
    resetToDefaults,
  } = useAIStore();

  const isDisabled = !apiKey;

  return (
    <Card className={cn(isDisabled && "opacity-60")}>
      <CardHeader>
        <CardTitle>AI Behavior</CardTitle>
        <CardDescription>
          Configure how AI features behave in your workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isDisabled && (
          <p className="text-sm text-muted-foreground">
            Configure your API key to enable AI features.
          </p>
        )}

        {/* Toggle Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="consistency-check">
                Check consistency on save
              </Label>
              <p className="text-sm text-muted-foreground">
                Run AI consistency checks when saving entities
              </p>
            </div>
            <Switch
              id="consistency-check"
              checked={consistencyCheckOnSave}
              onCheckedChange={setConsistencyCheckOnSave}
              disabled={isDisabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-reasoning">Show AI reasoning</Label>
              <p className="text-sm text-muted-foreground">
                Display the AI's thought process in responses
              </p>
            </div>
            <Switch
              id="show-reasoning"
              checked={showAiReasoning}
              onCheckedChange={setShowAiReasoning}
              disabled={isDisabled}
            />
          </div>
        </div>

        {/* Connection Test */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Connection Status</Label>
              <p className="text-sm text-muted-foreground">
                Test your API key connection
              </p>
            </div>
            <div className="flex items-center gap-3">
              {connectionTestResult === "success" && (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected
                </span>
              )}
              {connectionTestResult === "error" && (
                <span
                  className="flex items-center gap-1.5 text-sm text-destructive"
                  title={connectionTestError ?? undefined}
                >
                  <XCircle className="h-4 w-4" />
                  Failed
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={isDisabled || isTestingConnection}
              >
                {isTestingConnection ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Wifi className="mr-2 h-4 w-4" />
                    Test
                  </>
                )}
              </Button>
            </div>
          </div>
          {connectionTestResult === "error" && connectionTestError && (
            <p className="mt-2 text-sm text-destructive">
              {connectionTestError}
            </p>
          )}
        </div>

        {/* Reset to Defaults */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reset Settings</Label>
              <p className="text-sm text-muted-foreground">
                Restore all AI settings to defaults
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              disabled={isDisabled}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
