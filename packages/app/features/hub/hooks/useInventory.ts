import { useEffect, useMemo, useState } from 'react';
import { InventoryItem, TagFilterState, emptyFilterState } from '../types';

/**
 * Reads lightweight inventory data from the CRDT-backed snapshot/event
 * stores (thumbnails + metadata only — never 3D models) and exposes
 * tag-based filtering over it. Backed by the local-first stores, so it
 * works fully offline and updates as CRDT merges land from cloud/mesh
 * sync, without any extra plumbing in this hook.
 */
export function useInventory(source: {
  subscribe: (cb: (items: InventoryItem[]) => void) => () => void;
}) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filters, setFilters] = useState<TagFilterState>(emptyFilterState());

  useEffect(() => source.subscribe(setItems), [source]);

  const filteredItems = useMemo(() => {
    const noFiltersActive =
      filters.origin.size === 0 &&
      filters.utility.size === 0 &&
      filters.type.size === 0 &&
      filters.status.size === 0;
    if (noFiltersActive) return items;

    return items.filter((item) => {
      const originOk = filters.origin.size === 0 || filters.origin.has(item.origin);
      const utilityOk = filters.utility.size === 0 || filters.utility.has(item.utility);
      const typeOk = filters.type.size === 0 || filters.type.has(item.type);
      const statusOk = filters.status.size === 0 || filters.status.has(item.status);
      return originOk && utilityOk && typeOk && statusOk;
    });
  }, [items, filters]);

  function toggleTag(facet: keyof TagFilterState, value: string) {
    setFilters((prev) => {
      const next = { ...prev, [facet]: new Set(prev[facet]) };
      const set = next[facet] as Set<string>;
      set.has(value) ? set.delete(value) : set.add(value);
      return next;
    });
  }

  function clearFilters() {
    setFilters(emptyFilterState());
  }

  return { items: filteredItems, allItems: items, filters, toggleTag, clearFilters };
}
