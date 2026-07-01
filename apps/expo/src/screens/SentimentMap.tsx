import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

export function SentimentMapScreen() {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Regional Sentiment</Text>
      <GestureDetector gesture={pinchGesture}>
        <Animated.View style={[styles.mapContainer, animatedStyle]}>
          {/* Map components / SVG paths would render here */}
          <View style={styles.placeholderMap}>
            <Text style={styles.mapText}>Pinch to Zoom Sentiment Nodes</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  header: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  mapContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderMap: { width: 300, height: 300, backgroundColor: '#1A1A1A', borderRadius: 150, justifyContent: 'center', alignItems: 'center' },
  mapText: { color: '#888' }
});
