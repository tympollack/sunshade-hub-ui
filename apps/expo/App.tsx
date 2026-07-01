import React, { useState, useEffect } from 'react';
import { StatusBar, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

// Synchronously compute the URL so we don't flash the production URL in dev mode
const isDev = __DEV__;
const initialUrl = isDev 
  ? 'http://localhost:3000/dashboard' // Uses ADB reverse proxy
  : 'https://hub.sunshade.network/dashboard';

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const [hubUrl, setHubUrl] = useState<string>(initialUrl);

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111111', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 18, marginBottom: 10, fontWeight: 'bold' }}>WebView Connection Failed</Text>
        <Text style={{ color: 'white', textAlign: 'center', padding: 20 }}>
          {error}
        </Text>
        <Text style={{ color: '#ea580c', textAlign: 'center', padding: 20, marginTop: 20, fontWeight: 'bold' }}>
          Make sure your Next.js server is running on port 3000!
          Run `npm run web` in the root of the project.
          (Note: If you are on a physical Android device, 10.0.2.2 won't work, you'll need to hardcode your computer's local IP address.)
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#111111' }}>
      <StatusBar barStyle="light-content" />
      <WebView 
        source={{ uri: hubUrl }} 
        style={{ flex: 1, backgroundColor: '#111111' }}
        bounces={false}
        showsVerticalScrollIndicator={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
          // Only show fatal errors if it's the main frame failing
          setError(`Error code: ${nativeEvent.code}\nDescription: ${nativeEvent.description}`);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView HTTP error (likely a subresource like favicon): ', nativeEvent);
          // DO NOT call setError here! Android fires this for any missing image or favicon.
          // Setting error here will destroy the whole page just because of a 404 image!
        }}
      />
    </SafeAreaView>
  );
}
