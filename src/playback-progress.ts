// A full-cycle boundary remains `length` for the completion indicator; the
// following word advances to 1 rather than pinning the cursor at the boundary.
export function cyclePosition(completed: number, length: number): number {
  if (!Number.isSafeInteger(completed) || completed <= 0 || !Number.isSafeInteger(length) || length <= 0) return 0;
  return completed % length || length;
}

export function prioritizeReview<T extends { id: string; status?: string }>(items: T[], recentIds: string[]): T[] {
  const recent = new Map(recentIds.map((id, index) => [id, index]));
  return items.map((item, index) => ({ item, index, rank: recent.get(item.id) }))
    .sort((a, b) => {
      if ((a.rank === undefined) !== (b.rank === undefined)) return a.rank === undefined ? -1 : 1;
      if (a.rank !== undefined && b.rank !== undefined && a.rank !== b.rank) return b.rank - a.rank;
      const mastery = Number(a.item.status === "Mastered") - Number(b.item.status === "Mastered");
      return mastery || a.index - b.index;
    }).map(({ item }) => item);
}
export function reconcileOrder<T extends { id: string }>(items: T[], savedIds: string[] = []): T[] {
  const remaining = new Map(items.map(item => [item.id, item]));
  const ordered: T[] = [];
  for (const id of savedIds) {
    const item = remaining.get(id);
    if (item) { ordered.push(item); remaining.delete(id); }
  }
  return [...ordered, ...remaining.values()];
}
