import type React from "react";
import type { ReactElement } from "react";
import { MoreHorizontal, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ContentStatus } from "@/types/domain";

export function StatusBadge({ status }: { status: string | boolean | null | undefined }) {
  const label = typeof status === "boolean" ? (status ? "active" : "inactive") : status ?? "unknown";
  const tone =
    label === "active" || label === "published" || label === "approved"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : label === "draft" || label === "reviewed"
        ? "bg-amber-50 text-amber-700 ring-amber-600/20"
        : label === "revoked" || label === "inactive" || label === "archived"
          ? "bg-slate-100 text-slate-600 ring-slate-500/20"
          : "bg-muted text-muted-foreground ring-border";

  return <Badge className={cn("capitalize ring-1", tone)}>{label}</Badge>;
}

export function Field({
  label,
  children,
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-1.5 text-sm font-medium text-foreground", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function CheckField({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="size-4 accent-primary" />
      {label}
    </label>
  );
}

export function AdminDialog({
  title,
  description,
  trigger,
  children
}: {
  title: string;
  description?: string;
  trigger: ReactElement;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function CreateButton({ children }: { children: React.ReactNode }) {
  return (
    <Button type="button">
      <Plus className="size-4" />
      {children}
    </Button>
  );
}

export function EditButton({ children = "Edit" }: { children?: React.ReactNode }) {
  return (
    <Button type="button" variant="outline" size="sm">
      <Pencil className="size-3.5" />
      {children}
    </Button>
  );
}

export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
        <MoreHorizontal className="size-4" />
        <span className="sr-only">Open actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RowActionItem({ children }: { children: React.ReactNode }) {
  return <DropdownMenuItem render={<div />}>{children}</DropdownMenuItem>;
}

export function EmptyTable({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-muted-foreground">
        {label}
      </td>
    </tr>
  );
}

export const statusOptions: ContentStatus[] = ["draft", "published", "archived"];
