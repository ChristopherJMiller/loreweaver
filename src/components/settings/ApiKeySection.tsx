/**
 * API Key Management Section
 *
 * Allows users to enter, validate, and clear their Anthropic API key.
 */

import { useState } from "react";
import { Eye, EyeOff, Check, X, Key, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAIStore } from "@/stores/aiStore";

export function ApiKeySection() {
  const {
    apiKey,
    isApiKeyValid,
    isLoading,
    error,
    setApiKey,
    clearApiKey,
    validateApiKey,
  } = useAIStore();

  const [inputValue, setInputValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasKey = apiKey !== null && apiKey.length > 0;

  const handleSave = async () => {
    if (!inputValue.trim()) return;

    setIsSaving(true);
    await setApiKey(inputValue.trim());
    setInputValue("");
    setIsSaving(false);
  };

  const handleClear = async () => {
    await clearApiKey();
    setInputValue("");
  };

  const handleValidate = () => {
    validateApiKey();
  };

  // Mask the API key for display
  const maskedKey = apiKey
    ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Anthropic API Key
        </CardTitle>
        <CardDescription>
          Required for AI features. Get your key from{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            console.anthropic.com
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {hasKey ? (
          // Key is already set - show status and clear option
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                {showKey ? apiKey : maskedKey}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isApiKeyValid === true && (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    Valid format
                  </span>
                )}
                {isApiKeyValid === false && (
                  <span className="flex items-center gap-1 text-sm text-destructive">
                    <X className="h-4 w-4" />
                    Invalid format
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleValidate}
                  disabled={isLoading}
                >
                  Validate
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClear}
                  disabled={isLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Key
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // No key set - show input
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  placeholder="sk-ant-..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="pr-10 font-mono"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowKey(!showKey)}
                  type="button"
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                onClick={handleSave}
                disabled={!inputValue.trim() || isLoading || isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Your API key is stored securely on your device and never sent to
              our servers.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
