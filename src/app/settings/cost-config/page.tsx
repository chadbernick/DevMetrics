import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { CostConfigForm } from "@/components/settings/cost-config-form";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

async function getCostConfig() {
  const config = await db.query.costConfig.findFirst({
    where: eq(schema.costConfig.isActive, true),
  });
  return config;
}

export default async function CostConfigPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
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
      }}
    />
  );
}
