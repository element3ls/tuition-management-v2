export function bySortOrderThenName<T extends { sort_order?: number; name?: string; title?: string; id: string }>(a: T, b: T) {
  const sortDelta = (a.sort_order ?? 0) - (b.sort_order ?? 0);
  if (sortDelta !== 0) return sortDelta;

  const aLabel = a.name ?? a.title ?? "";
  const bLabel = b.name ?? b.title ?? "";
  const labelDelta = aLabel.localeCompare(bLabel);
  if (labelDelta !== 0) return labelDelta;

  return a.id.localeCompare(b.id);
}

export function byCreatedDescThenId<T extends { created_at: string; id: string }>(a: T, b: T) {
  const createdDelta = b.created_at.localeCompare(a.created_at);
  if (createdDelta !== 0) return createdDelta;
  return a.id.localeCompare(b.id);
}
