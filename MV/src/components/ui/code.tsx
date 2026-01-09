import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

export interface CodeProps extends HTMLAttributes<HTMLPreElement> {}

const Code = forwardRef<HTMLPreElement, CodeProps>(
  ({ className, ...props }, ref) => {
    return (
      <pre
        ref={ref}
        className={cn(
          "rounded-md border bg-muted px-4 py-3 font-mono text-sm",
          className
        )}
        {...props}
      />
    );
  }
);

Code.displayName = "Code";

export { Code };
