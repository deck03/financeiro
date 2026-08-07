import { cn } from "@/lib/cn";
import { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-base-border bg-base-surface p-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}
