import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { TagFilterState } from '../types';

interface FacetGroup {
  facet: keyof TagFilterState;
  label: string;
  options: string[];
}

interface Props {
  groups: FacetGroup[];
  filters: TagFilterState;
  onToggle: (facet: keyof TagFilterState, value: string) => void;
  onClear: () => void;
}

/**
 * Horizontal, multi-facet tag filter bar for the 2D inventory layer.
 * Each facet (Origin, Utility, Type, Status) renders as its own row of
 * toggleable chips; selections within and across facets are additive
 * (AND across facets, OR within a facet).
 */
export function TagFilterBar({ groups, filters, onToggle, onClear }: Props) {
  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <View key={group.facet} style={styles.row}>
          <Text style={styles.label}>{group.label}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {group.options.map((option) => {
              const active = (filters[group.facet] as Set<string>).has(option);
              return (
                <Pressable
                  key={option}
                  onPress={() => onToggle(group.facet, option)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ))}
      <Pressable onPress={onClear} style={styles.clearButton}>
        <Text style={styles.clearText}>Clear filters</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  label: { width: 64, fontSize: 12, fontWeight: '600', color: '#666' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#eee',
    marginRight: 6,
  },
  chipActive: { backgroundColor: '#2b6cf6' },
  chipText: { fontSize: 12, color: '#333' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  clearButton: { alignSelf: 'flex-start', marginTop: 4 },
  clearText: { fontSize: 12, color: '#2b6cf6' },
});
