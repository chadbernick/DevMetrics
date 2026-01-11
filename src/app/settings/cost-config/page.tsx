import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { CostConfigForm } from "@/components/settings/cost-config-form";

async function getCostConfig() {
  const config = await db.query.costConfig.findFirst({
    where: eq(schema.costConfig.isActive, true),
  });
  return config;
}

export default async function CostConfigPage() {
  const config = await getCostConfig();

  if (!config) {
    return (
      <div className="text-center py-12 text-foreground-muted">
        No cost configuration found. Please run the seed script first.
      </div>
    );
  }

  return (
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
        claudeInputPrice: config.claudeInputPrice,
        claudeOutputPrice: config.claudeOutputPrice,
        gpt4InputPrice: config.gpt4InputPrice,
        gpt4OutputPrice: config.gpt4OutputPrice,
      }}
    />
  );
}
