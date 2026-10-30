import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-start gap-3 rounded-2xl bg-surface-muted p-8", className)}>
      <p className="text-lg font-semibold">{title}</p>
      {description && <p className="text-sm text-text-muted">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
