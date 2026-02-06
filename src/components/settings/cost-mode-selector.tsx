"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Check, Loader2, Calculator } from "lucide-react";
import type { CostMode, CostModeSettings, ModelPricing } from "@/lib/integrations/shared/pricing";

interface CostModeSelectorProps {
  initialSettings: CostModeSettings;
  blendedDefaults: ModelPricing;
}

const MODE_OPTIONS: {
  value: CostMode;
  label: string;
  description: string;
  disabled?: boolean;
}[] = [
  {
    value: "blended",
    label: "Blended Frontier Average",
    description:
      "Averages pricing across Claude Sonnet 4, GPT-4o, and Gemini 2.5 Pro. Best for teams using multiple AI tools.",
  },
  {
    value: "per-model",
    label: "Per-Model Pricing",
    description:
      "Uses exact pricing for each model based on regex pattern matching. Configure models in the Model Pricing table.",
  },
  {
    value: "flat-rate",
    label: "Flat-Rate License",
    description:
      "For teams with blanket license agreements (e.g., Copilot Enterprise, Cursor Pro).",
    disabled: true,
  },
];

export function CostModeSelector({
  initialSettings,
  blendedDefaults,
}: CostModeSelectorProps) {
  const [mode, setMode] = useState<CostMode>(initialSettings.mode);
  const [override, setOverride] = useState<ModelPricing | null>(
    initialSettings.blendedOverride ?? null
  );
  const [useCustomRates, setUseCustomRates] = useState(
    !!initialSettings.blendedOverride
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const body: Record<string, unknown> = { mode };
      if (mode === "blended" && useCustomRates && override) {
        body.blendedOverride = override;
      }

      const response = await fetch("/api/v1/settings/cost-mode", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save cost mode:", error);
    } finally {
      setSaving(false);
    }
  };

  const activePricing =
    mode === "blended" && useCustomRates && override
      ? override
      : blendedDefaults;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-accent-cyan" />
          Token Cost Model
        </CardTitle>
        <CardDescription>
          Choose how AI token costs are calculated across all integrations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Radio Group */}
        <div className="space-y-3">
          {MODE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors ${
                mode === option.value
                  ? "border-accent-cyan bg-accent-cyan/5"
                  : "border-border hover:border-border-hover"
              } ${option.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <input
                type="radio"
                name="costMode"
                value={option.value}
                checked={mode === option.value}
                onChange={() => !option.disabled && setMode(option.value)}
                disabled={option.disabled}
                className="mt-1 accent-accent-cyan"
              />
              <div>
                <span className="text-sm font-medium">
                  {option.label}
                  {option.disabled && (
                    <span className="ml-2 text-xs text-foreground-muted font-normal">
                      coming soon
                    </span>
                  )}
                </span>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>

        {/* Blended Pricing Details */}
        {mode === "blended" && (
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Blended Rates (per 1M tokens)</h4>
              <label className="flex items-center gap-2 text-xs text-foreground-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomRates}
                  onChange={(e) => {
                    setUseCustomRates(e.target.checked);
                    if (e.target.checked && !override) {
                      setOverride({ ...blendedDefaults });
                    }
                  }}
                  className="accent-accent-cyan"
                />
                Custom rates
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { key: "inputPrice", label: "Input" },
                { key: "outputPrice", label: "Output" },
                { key: "thinkingPrice", label: "Thinking" },
                { key: "cacheWritePrice", label: "Cache Write" },
                { key: "cacheReadPrice", label: "Cache Read" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-foreground-muted mb-1">
                    {label}
                  </label>
                  {useCustomRates ? (
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground-muted text-xs">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={
                          override?.[key as keyof ModelPricing] ??
                          blendedDefaults[key as keyof ModelPricing]
                        }
                        onChange={(e) =>
                          setOverride({
                            ...(override ?? blendedDefaults),
                            [key]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full rounded border border-border bg-background pl-6 pr-2 py-1.5 text-xs focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                      />
                    </div>
                  ) : (
                    <div className="text-sm font-mono">
                      ${activePricing[key as keyof ModelPricing].toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!useCustomRates && (
              <p className="text-xs text-foreground-muted">
                Based on average pricing across Claude Sonnet 4 ($3/$15),
                GPT-4o ($2.50/$10), and Gemini 2.5 Pro ($1.25/$10).
              </p>
            )}
          </div>
        )}

        {/* Per-Model Mode Note */}
        {mode === "per-model" && (
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs text-foreground-muted">
              Costs will be calculated using exact model pricing from the Model
              Pricing table. If a model has no matching pricing entry, the
              blended frontier rate will be used as a fallback.
            </p>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-accent-cyan px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-cyan/90 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Cost Model"
            )}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-accent-green">
              <Check className="h-4 w-4" />
              Cost model saved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
