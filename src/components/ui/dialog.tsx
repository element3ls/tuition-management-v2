import * as React from "react";
import { cn } from "@/lib/utils";

export function DialogPanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md border bg-card p-5 shadow-sm", className)} {...props} />;
}
