import { onMounted, ref } from 'vue';

export type Branch<T> = T & { children?: Branch<T>[] };
export function toTree<T extends { id: number; parentId: null | number }>(
  rows: T[],
): Branch<T>[] {
  const nodes = new Map(rows.map((row) => [row.id, { ...row } as Branch<T>]));
  const roots: Branch<T>[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId && nodes.get(node.parentId);
    if (parent) (parent.children ??= []).push(node);
    else roots.push(node);
  }
  return roots;
}
export function parentIds(rows: { id: number; parentId: null | number }[]) {
  return new Map(rows.map((r) => [r.id, r.parentId]));
}

export function below(
  parents: Map<number, null | number>,
  id: number,
  root?: number,
) {
  let current: null | number = id;
  while (current) {
    if (current === root) return true;
    current = parents.get(current) ?? null;
  }
  return false;
}
export function useTreeLoad(fetch: () => Promise<void>) {
  const busy = ref(false);
  const failed = ref(false);
  async function reload() {
    busy.value = true;
    try {
      await fetch();
      failed.value = false;
    } catch {
      failed.value = true;
    } finally {
      busy.value = false;
    }
  }
  onMounted(reload);
  return { busy, failed, reload };
}
