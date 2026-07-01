import { FlatList, View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { InventoryItem } from '../types';

interface Props {
  items: InventoryItem[];
  onSelectItem: (item: InventoryItem) => void;
}

/**
 * Fast, lightweight grid for the 2D utility layer. Renders thumbnails
 * only — `model3dRef` is never touched here, so this view stays cheap
 * even with large inventories, and works fully without ever entering
 * 3D mode.
 */
export function InventoryGrid2D({ items, onSelectItem }: Props) {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      numColumns={3}
      renderItem={({ item }) => (
        <Pressable style={styles.cell} onPress={() => onSelectItem(item)}>
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          {item.status === 'new' && <View style={styles.newBadge} />}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1 / 3, aspectRatio: 1, padding: 6, alignItems: 'center' },
  thumbnail: { width: '100%', height: '75%', borderRadius: 8, backgroundColor: '#f1f1f1' },
  name: { fontSize: 11, marginTop: 4 },
  newBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff5050',
  },
});
