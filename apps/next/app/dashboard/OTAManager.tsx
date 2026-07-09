'use client';
import React, { useEffect, useState } from 'react';
import { supabase } from '@sunshade/supabase';

// In a real app, this would be dynamically injected by the React Native wrapper,
// or we track versions locally per app. For the Hub itself, it's 1.
const CURRENT_HUB_VERSION = 1;

export function OTAManager() {
  const [updateAvailable, setUpdateAvailable] = useState<any | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Listen to new app versions
    const channel = supabase.channel('app_versions_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'app_versions' },
        (payload) => {
          const newVersion = payload.new;
          // If it's an update for the hub and newer than our version
          if (newVersion.app_name === 'sunshade_hub' && newVersion.version_code > CURRENT_HUB_VERSION) {
            setUpdateAvailable(newVersion);
          }
          // Note: Here we can also listen for 'patchwork' or 'lexshade' and update their status in the UI!
          // We can dispatch an event or use a global store for those.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdate = () => {
    if (!updateAvailable) return;
    setDownloading(true);
    
    // Send message to Expo wrapper to handle the native download and install
    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({
        type: 'INSTALL_APK',
        url: updateAvailable.download_url,
        version: updateAvailable.version_string
      }));
      
      // Assume it takes some time, reset state or show downloading UI
      setTimeout(() => {
        setDownloading(false);
        setUpdateAvailable(null);
      }, 5000);
    } else {
      // Fallback for desktop web - just open the URL
      window.open(updateAvailable.download_url, '_blank');
      setDownloading(false);
      setUpdateAvailable(null);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:bottom-4 md:left-auto md:w-96 z-50 bg-orange-600 rounded-xl p-4 shadow-2xl border border-orange-500/50 flex flex-col gap-3 transform transition-all">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white text-lg">Update Available</h3>
          <p className="text-orange-100 text-sm">Version {updateAvailable.version_string} is ready to install.</p>
        </div>
      </div>
      <button 
        onClick={handleUpdate}
        disabled={downloading}
        className="w-full py-2 bg-white text-orange-600 rounded-lg font-bold hover:bg-orange-50 transition-colors"
      >
        {downloading ? 'Downloading...' : 'Download & Install'}
      </button>
    </div>
  );
}
