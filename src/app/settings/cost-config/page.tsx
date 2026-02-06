import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { CostConfigForm } from "@/components/settings/cost-config-form";
import { CostModeSelector } from "@/components/settings/cost-mode-selector";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getSetting } from "@/lib/settings";
import {
  BLENDED_FRONTIER_PRICING,
  type CostModeSettings,
} from "@/lib/integrations/shared/pricing";

async function getCostConfig() {
  const config = await db.query.costConfig.findFirst({
    where: eq(schema.costConfig.isActive, true),
  });
  return config;
}

async function getCostModeSettings(): Promise<CostModeSettings> {
  return getSetting<CostModeSettings>("cost.mode", { mode: "blended" });
}

export default async function CostConfigPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [config, costModeSettings] = await Promise.all([
    getCostConfig(),
    getCostModeSettings(),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Token Cost Model */}
      <CostModeSelector
        initialSettings={costModeSettings}
        blendedDefaults={BLENDED_FRONTIER_PRICING}
      />

      {/* ROI Configuration */}
      {config ? (
        <CostConfigForm
          config={{
            id: config.id,
            juniorHourlyRate: config.juniorHourlyRate,
            midHourlyRate: config.midHourlyRate,
            seniorHourlyRate: config.seniorHourlyRate,
            staffHourlyRate: config.staffHourlyRate,
            principalHourlyRate: config.principalHourlyRate,
            featureMultiplier: config.featureMultiplier,
            bugFixMultiplier: config.bugFixMultiplier,
            refactorMultiplier: config.refactorMultiplier,
            docsMultiplier: config.docsMultiplier,
            testMultiplier: config.testMultiplier,
            overheadPercentage: config.overheadPercentage,
          }}
        />
      ) : (
        <div className="text-center py-12 text-foreground-muted">
          No ROI configuration found. Please run the seed script first.
        </div>
      )}
    </div>
  );
}
