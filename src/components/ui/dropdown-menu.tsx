import * as React from "react";
import { cn } from "@/lib/utils";

export function DropdownMenu({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md border bg-card p-2 shadow-sm", className)} {...props} />;
}
