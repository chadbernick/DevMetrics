"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export default function UIExamplesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const variants = [
    { name: "Variant 1: Ribbon", href: "/ui_examples/variant1" },
    { name: "Variant 2: Bento", href: "/ui_examples/variant2" },
    { name: "Variant 3: Sidebar Stats", href: "/ui_examples/variant3" },
    { name: "Variant 4: Typography", href: "/ui_examples/variant4" },
    { name: "Variant 5: HUD", href: "/ui_examples/variant5" },
    { name: "Variant 6: Bloom Grid", href: "/ui_examples/variant6" },
    { name: "Variant 7: Strip", href: "/ui_examples/variant7" },
    { name: "Variant 8: Mosaic", href: "/ui_examples/variant8" },
    { name: "Variant 9: Ticker", href: "/ui_examples/variant9" },
    { name: "Variant 10: Console", href: "/ui_examples/variant10" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background-secondary px-6 py-3">
        <div className="flex items-center gap-6 overflow-x-auto">
          <span className="font-bold text-foreground-muted">UI Lab:</span>
          {variants.map((v) => (
            <Link
              key={v.href}
              href={v.href}
              className={cn(
                "whitespace-nowrap text-sm font-medium transition-colors",
                pathname === v.href
                  ? "text-accent-cyan"
                  : "text-foreground-secondary hover:text-foreground"
              )}
            >
              {v.name}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
