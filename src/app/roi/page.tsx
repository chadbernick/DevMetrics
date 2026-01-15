import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

export default function RoiPage() {
  return (
    <DashboardLayout title="ROI & Value">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">ROI & Value</h1>
          <p className="text-foreground-secondary">
            Track the economic impact of AI development tools.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground-secondary">
                Total Hours Saved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Coming Soon</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground-secondary">
                Cost vs. Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Coming Soon</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
