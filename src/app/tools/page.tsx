import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Zap, Wrench, Calculator, FileCode } from "lucide-react";

const tools = [
  {
    name: "Token Calculator",
    description: "Estimate token usage and costs for your prompts",
    icon: Calculator,
    status: "coming-soon",
  },
  {
    name: "Prompt Analyzer",
    description: "Analyze and optimize your prompts for better results",
    icon: FileCode,
    status: "coming-soon",
  },
  {
    name: "API Playground",
    description: "Test API calls and explore responses",
    icon: Zap,
    status: "coming-soon",
  },
  {
    name: "Configuration Generator",
    description: "Generate configuration files for AI coding tools",
    icon: Wrench,
    status: "coming-soon",
  },
];

export default function ToolsPage() {
  return (
    <DashboardLayout title="Tools">
      <div className="space-y-6">
        <p className="text-foreground-secondary">
          Utilities and tools to help you get the most out of your AI coding assistants.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {tools.map((tool) => (
            <Card key={tool.name} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-cyan/10">
                    <tool.icon className="h-5 w-5 text-accent-cyan" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{tool.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground-secondary">{tool.description}</p>
                <div className="mt-4">
                  <span className="inline-flex items-center rounded-full bg-foreground-muted/10 px-2 py-1 text-xs text-foreground-muted">
                    Coming Soon
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
