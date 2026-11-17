export function canToggleSet(sets: readonly boolean[], index: number): boolean {
  if (index < 0 || index >= sets.length) {
    return false;
  }
  const firstOpen = sets.findIndex((done) => !done);
  if (firstOpen === -1) {
    return index === sets.length - 1;
  }
  if (!sets[index]) {
    return index === firstOpen;
  }
  return index === firstOpen - 1;
}
