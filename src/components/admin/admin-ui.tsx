import type React from "react";
import type { ReactElement } from "react";
import {
  IconDots,
  IconPencil,
  IconPlus,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ContentStatus } from "@/types/domain";

// ── Status → semantic badge variant ──────────────────────────────────────────
export function StatusBadge({
  status,
}: {
  status: string | boolean | null | undefined;
}) {
  const label =
    typeof status === "boolean"
      ? status
        ? "active"
        : "inactive"
      : (status ?? "unknown");

  const variant =
    label === "active" || label === "published" || label === "approved"
      ? "success"
      : label === "draft" || label === "reviewed" || label === "ready" || label === "uploaded"
        ? "warning"
        : label === "processing" || label === "uploading"
          ? "info"
          : label === "failed"
            ? "error"
            : "neutral"; // revoked, inactive, archived, unknown

  return (
    <Badge variant={variant} className="capitalize">
      {label}
    </Badge>
  );
}

// ── Form helpers ──────────────────────────────────────────────────────────────
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn("grid gap-1.5 text-sm font-medium text-foreground", className)}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

export function CheckField({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-sm">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  );
}

// ── Dialog wrapper ────────────────────────────────────────────────────────────
export function AdminDialog({
  title,
  description,
  trigger,
  children,
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
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

// ── Action buttons ────────────────────────────────────────────────────────────
export function CreateButton({
  children,
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant: "default", size: "default" }), className)}
      {...props}
    >
      <IconPlus className="size-4" />
      {children}
    </button>
  );
}

export function EditButton({
  children = "Edit",
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), className)}
      {...props}
    >
      <IconPencil className="size-3.5" />
      {children}
    </button>
  );
}

// ── Row actions dropdown ──────────────────────────────────────────────────────
export function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" />}
      >
        <IconDots className="size-4" />
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

// ── Empty table row ───────────────────────────────────────────────────────────
export function EmptyTable({
  colSpan,
  label,
}: {
  colSpan: number;
  label: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-12 text-center text-sm text-muted-foreground"
      >
        {label}
      </td>
    </tr>
  );
}

export const statusOptions: ContentStatus[] = ["draft", "published", "archived"];
