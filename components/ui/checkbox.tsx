import { cn } from "@/lib/cn";
import { InputHTMLAttributes, forwardRef } from "react";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-base-border text-brand-accent focus:ring-1 focus:ring-brand-accent",
        className
      )}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";
