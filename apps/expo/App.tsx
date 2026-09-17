import React, { useState, useEffect } from 'react';
import { StatusBar, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { GlassCard, AtmosphericBadge, TokenBalanceBadge, PrimaryButton } from '@sunshade/ui';

// Synchronously compute the URL so we don't flash the production URL in dev mode
const isDev = __DEV__;
const expoConfig = Constants.expoConfig as any;
const channel = expoConfig?.extra?.easUpdateChannel ?? expoConfig?.updates?.channel ?? '';
const initialUrl = isDev
  ? 'http://localhost:3000/dashboard'
  : channel === 'preview'
    ? 'https://staging-hub.sunshade.network/dashboard'
    : 'https://hub.sunshade.network/dashboard';

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const [hubUrl, setHubUrl] = useState<string>(initialUrl);

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'INSTALL_APK') {
        const apkUrl = data.url;
        
        if (Platform.OS === 'android') {
          // Download APK
          const docDir = FileSystem.documentDirectory;
          if (!docDir) {
            throw new Error('FileSystem.documentDirectory is unavailable');
          }
          const downloadDest = `${docDir}update.apk`;
          const { uri } = await FileSystem.downloadAsync(apkUrl, downloadDest);
          
          // DO NOT skip this step, or Android will crash the intent
          const contentUri = await FileSystem.getContentUriAsync(uri);
          
          // Launch Intent to install
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/vnd.android.package-archive',
          });
        } else {
          console.warn('APK installation is only supported on Android');
        }
      }
    } catch (e) {
      console.error('Error handling WebView message:', e);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111111', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <GlassCard variant="cozy" padding="lg" style={{ width: '100%', maxWidth: 450, alignItems: 'center' }}>
          <AtmosphericBadge label="Connection Offline" variant="error" statusDot pulse style={{ marginBottom: 16 }} />
          <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            WebView Connection Failed
          </Text>
          <Text style={{ color: '#a1a1aa', textAlign: 'center', marginBottom: 16, fontSize: 13 }}>
            {error}
          </Text>
          <TokenBalanceBadge balance="NODE DISCONNECTED" symbol="HUB" variant="cozy" isLive={false} style={{ marginBottom: 20 }} />
          <PrimaryButton
            label="Retry Connection"
            variant="sunshade"
            size="md"
            onPress={() => {
              setError(null);
              setHubUrl(initialUrl);
            }}
          />
        </GlassCard>
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
        onMessage={handleWebViewMessage}
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
