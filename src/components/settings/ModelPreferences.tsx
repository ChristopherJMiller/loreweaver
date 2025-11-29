/**
 * Model Preferences Section
 *
 * Allows users to choose their preferred model tier for AI operations.
 */

import { Zap, Scale, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAIStore, type ModelPreference } from "@/stores/aiStore";
import { cn } from "@/lib/utils";

const modelOptions: {
  value: ModelPreference;
  label: string;
  description: string;
  icon: typeof Zap;
  details: string;
}[] = [
  {
    value: "speed",
    label: "Speed",
    description: "Faster responses, lower cost",
    icon: Zap,
    details: "Uses Claude Haiku for all operations. Best for quick iterations.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Recommended for most users",
    icon: Scale,
    details:
      "Uses Haiku for simple tasks, Sonnet for complex reasoning. Best balance of speed and quality.",
  },
  {
    value: "quality",
    label: "Quality",
    description: "Best results, higher cost",
    icon: Sparkles,
    details:
      "Uses Claude Sonnet for all operations. Best for detailed worldbuilding.",
  },
];

export function ModelPreferences() {
  const { modelPreference, setModelPreference, apiKey } = useAIStore();

  const isDisabled = !apiKey;

  return (
    <Card className={cn(isDisabled && "opacity-60")}>
      <CardHeader>
        <CardTitle>Model Preference</CardTitle>
        <CardDescription>
          Choose how AI features balance speed and quality
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isDisabled && (
          <p className="mb-4 text-sm text-muted-foreground">
            Configure your API key to enable AI features.
          </p>
        )}

        <div className="grid gap-3">
          {modelOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setModelPreference(option.value)}
              disabled={isDisabled}
              className={cn(
                "flex items-start gap-4 rounded-lg border p-4 text-left transition-colors",
                modelPreference === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent",
                isDisabled && "cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "rounded-md p-2",
                  modelPreference === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <option.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{option.label}</span>
                  {modelPreference === option.value && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {option.details}
                </p>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Note: Consistency checking and session processing always use Sonnet
          regardless of this setting, as they require complex reasoning.
        </p>
      </CardContent>
    </Card>
  );
}
