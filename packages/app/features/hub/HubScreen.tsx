import React, { Suspense } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { use3DMode } from './hooks/use3DMode';
import { useInventory } from './hooks/useInventory';
import { InventoryGrid2D } from './components/InventoryGrid2D';
import { TagFilterBar } from './components/TagFilterBar';
import { InventoryItem } from './types';

interface Props {
  // CRDT-backed source — wraps the local SnapshotStore/EventStore-derived
  // view so the UI never talks to storage directly.
  inventorySource: { subscribe: (cb: (items: InventoryItem[]) => void) => () => void };
}

/**
 * Top-level dual-layer Universal Player Hub screen.
 * - The 2D layer (filters + grid) is always mounted: cheap to render,
 *   no 3D assets loaded, instant on app open.
 * - The 3D layer is mounted only after the player explicitly opts in
 *   via `enter3D()`, and unmounted again on `exit3D()`.
 */
export function HubScreen({ inventorySource }: Props) {
  const { mode, progress, enter3D, exit3D, Hub3DScene } = use3DMode();
  const { items, filters, toggleTag, clearFilters } = useInventory(inventorySource);

  const facetGroups = [
    { facet: 'origin' as const, label: 'Origin', options: uniqueValues(items, 'origin') },
    { facet: 'utility' as const, label: 'Utility', options: uniqueValues(items, 'utility') },
    { facet: 'type' as const, label: 'Type', options: uniqueValues(items, 'type') },
    { facet: 'status' as const, label: 'Status', options: uniqueValues(items, 'status') },
  ];

  return (
    <View style={styles.root}>
      {/* --- 2D utility layer: always mounted --- */}
      <View style={[styles.layer, mode === '3d' && styles.hidden]}>
        <View style={styles.header}>
          <Text style={styles.title}>Player Hub</Text>
          <Pressable onPress={enter3D} style={styles.enter3DButton}>
            <Text style={styles.enter3DText}>Enter 3D Hub</Text>
          </Pressable>
        </View>
        <TagFilterBar groups={facetGroups} filters={filters} onToggle={toggleTag} onClear={clearFilters} />
        <InventoryGrid2D items={items} onSelectItem={() => {}} />
      </View>

      {/* --- 3D immersive layer: mounted on demand only --- */}
      {mode !== '2d' && (
        <View style={styles.layer}>
          {mode === 'transitioning' && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" />
              <Text>{Math.round(progress * 100)}% loaded</Text>
            </View>
          )}
          {mode === '3d' && Hub3DScene && (
            <Suspense fallback={<ActivityIndicator size="large" />}>
              {/* Hub3DScene module exposes a default component, lazily loaded in use3DMode */}
              {React.createElement(Hub3DScene.default, { onExit: exit3D, items })}
            </Suspense>
          )}
        </View>
      )}
    </View>
  );
}

function uniqueValues(items: InventoryItem[], key: keyof InventoryItem): string[] {
  return Array.from(new Set(items.map((i) => String(i[key]))));
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  layer: { flex: 1, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hidden: { display: 'none' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  enter3DButton: { backgroundColor: '#2b6cf6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  enter3DText: { color: '#fff', fontWeight: '600' },
  loadingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
