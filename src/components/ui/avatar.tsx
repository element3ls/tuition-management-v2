export function Avatar({ name, size = "sm" }: { name: string; size?: "xs" | "sm" }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const dim = size === "xs" ? "size-6 text-[10px]" : "size-7 text-[11px]";

  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full bg-secondary font-medium text-secondary-foreground ${dim}`}>
      {initials}
    </span>
  );
}
