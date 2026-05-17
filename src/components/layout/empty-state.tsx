export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border bg-card p-8 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
