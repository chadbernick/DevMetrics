"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Check, Loader2, DollarSign, Percent, Zap } from "lucide-react";

interface CostConfig {
  id: string;
  juniorHourlyRate: number;
  midHourlyRate: number;
  seniorHourlyRate: number;
  staffHourlyRate: number;
  principalHourlyRate: number;
  featureMultiplier: number;
  bugFixMultiplier: number;
  refactorMultiplier: number;
  docsMultiplier: number;
  testMultiplier: number;
  overheadPercentage: number;
  claudeInputPrice: number;
  claudeOutputPrice: number;
  gpt4InputPrice: number;
  gpt4OutputPrice: number;
}

interface CostConfigFormProps {
  config: CostConfig;
}

export function CostConfigForm({ config }: CostConfigFormProps) {
  const [formData, setFormData] = useState(config);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch(`/api/v1/cost-config/${config.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof CostConfig, value: number) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      {/* Engineer Hourly Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent-cyan" />
            Engineer Hourly Rates
          </CardTitle>
          <CardDescription>
            Fully-loaded hourly rates by engineer level (USD). Used to calculate the value of AI-assisted work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "juniorHourlyRate", label: "Junior Engineer" },
              { key: "midHourlyRate", label: "Mid-Level Engineer" },
              { key: "seniorHourlyRate", label: "Senior Engineer" },
              { key: "staffHourlyRate", label: "Staff Engineer" },
              { key: "principalHourlyRate", label: "Principal Engineer" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-2">{label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted">$</span>
                  <input
                    type="number"
                    value={formData[key as keyof CostConfig]}
                    onChange={(e) => updateField(key as keyof CostConfig, parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-background pl-8 pr-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">/hr</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Productivity Multipliers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent-purple" />
            Productivity Multipliers
          </CardTitle>
          <CardDescription>
            How much faster AI assistance makes each type of work. A 3x multiplier means AI helps complete the task 3x faster than manual work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "featureMultiplier", label: "New Features", description: "Building new functionality" },
              { key: "bugFixMultiplier", label: "Bug Fixes", description: "Debugging and fixing issues" },
              { key: "refactorMultiplier", label: "Refactoring", description: "Code restructuring" },
              { key: "docsMultiplier", label: "Documentation", description: "Writing docs and comments" },
              { key: "testMultiplier", label: "Testing", description: "Writing tests" },
            ].map(({ key, label, description }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <p className="text-xs text-foreground-muted mb-2">{description}</p>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={formData[key as keyof CostConfig]}
                    onChange={(e) => updateField(key as keyof CostConfig, parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">x</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overhead & Token Pricing */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Overhead */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-accent-green" />
              Overhead Percentage
            </CardTitle>
            <CardDescription>
              Additional costs beyond base salary (benefits, taxes, equipment, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <input
                type="number"
                value={formData.overheadPercentage}
                onChange={(e) => updateField("overheadPercentage", parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">%</span>
            </div>
            <p className="mt-2 text-xs text-foreground-muted">
              Industry standard is 25-40% for fully-loaded costs
            </p>
          </CardContent>
        </Card>

        {/* Token Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-accent-yellow" />
              Token Pricing
            </CardTitle>
            <CardDescription>
              Cost per 1 million tokens (USD)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-foreground-secondary">Claude Input</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.claudeInputPrice}
                    onChange={(e) => updateField("claudeInputPrice", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-background pl-6 pr-3 py-2 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-foreground-secondary">Claude Output</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.claudeOutputPrice}
                    onChange={(e) => updateField("claudeOutputPrice", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-background pl-6 pr-3 py-2 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-foreground-secondary">GPT-4 Input</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.gpt4InputPrice}
                    onChange={(e) => updateField("gpt4InputPrice", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-background pl-6 pr-3 py-2 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-foreground-secondary">GPT-4 Output</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground-muted text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.gpt4OutputPrice}
                    onChange={(e) => updateField("gpt4OutputPrice", parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-border bg-background pl-6 pr-3 py-2 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-accent-cyan px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-cyan/90 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Configuration"
          )}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-accent-green">
            <Check className="h-4 w-4" />
            Configuration saved
          </span>
        )}
      </div>
    </form>
  );
}
