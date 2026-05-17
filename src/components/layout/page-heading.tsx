export function PageHeading({ title, description }: { title: string; description?: string | null }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
      {description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
