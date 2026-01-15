import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  FileText, 
  Share2, 
  ClipboardList, 
  Radar 
} from "lucide-react";

const tools = [
  {
    name: "Context Architect",
    subtitle: "Steering File Generator",
    description: "Create highly specific GEMINI.md or CLAUDE.md files based on your actual codebase patterns.",
    benefits: [
      "Scans eslint/prettier for style extraction.",
      "Identifies high-churn files to add specific warnings.",
      "Generates idiomatic rules to reduce AI refactoring loops."
    ],
    icon: FileText,
    color: "text-accent-cyan",
    bgColor: "bg-accent-cyan/10"
  },
  {
    name: "Context Builder",
    subtitle: "Dependency Grapher",
    description: "Generate the perfect file context list for a specific feature task.",
    benefits: [
      "Input a task (e.g., 'Fix Login') to trace dependencies.",
      "Optimizes context window usage by excluding irrelevant code.",
      "Outputs copy-pasteable file paths for your AI session."
    ],
    icon: Share2,
    color: "text-accent-purple",
    bgColor: "bg-accent-purple/10"
  },
  {
    name: "Spec Writer",
    subtitle: "Anti-Hallucination Tool",
    description: "Convert vague feature ideas into rigid, AI-ready step-by-step specifications.",
    benefits: [
      "Prevents 'Vibe Coding' errors by enforcing a plan.",
      "Generates a markdown checklist for the AI to follow.",
      "Reduces logic churn by defining constraints upfront."
    ],
    icon: ClipboardList,
    color: "text-accent-green",
    bgColor: "bg-accent-green/10"
  },
  {
    name: "Tech Debt Radar",
    subtitle: "Refactor Recommender",
    description: "Identify 'rotting' AI-generated code that is no longer used or maintained.",
    benefits: [
      "Finds AI sessions that created abandoned files.",
      "Detects high-complexity code with low read-rates.",
      "Suggests candidates for deletion or refactoring."
    ],
    icon: Radar,
    color: "text-accent-pink",
    bgColor: "bg-accent-pink/10"
  },
];

export default function ToolsPage() {
  return (
    <DashboardLayout title="AI Enablement Tools">
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">AI Enablement Tools</h1>
          <p className="text-foreground-secondary max-w-2xl">
            Active intervention tools designed to improve AI performance, reduce code churn, and enforce quality standards.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {tools.map((tool) => (
            <Card key={tool.name} className="flex flex-col border-border/50 hover:border-border transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tool.bgColor}`}>
                      <tool.icon className={`h-6 w-6 ${tool.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tool.name}</CardTitle>
                      <p className="text-sm font-medium text-foreground-muted">{tool.subtitle}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-background-secondary px-2.5 py-0.5 text-xs font-medium text-foreground-muted border border-border">
                    Planned
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <p className="text-sm text-foreground-secondary leading-relaxed">
                  {tool.description}
                </p>
                <div className="mt-auto pt-4 border-t border-border/50">
                  <ul className="space-y-2">
                    {tool.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground-muted">
                        <div className={`mt-1 h-1 w-1 rounded-full ${tool.color.replace('text-', 'bg-')}`} />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}