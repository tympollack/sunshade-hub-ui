import React, { useState, useCallback, useRef } from 'react';

export type HubLayerMode = '2d' | 'transitioning' | '3d';

export interface Hub3DSceneModule {
  default: React.ComponentType<{ onExit: () => void; items: unknown[] }>;
}

/**
 * Controls the dual-layer hub: the 2D utility layer is always mounted
 * (fast, cheap), while the 3D immersive layer is lazy-loaded on demand
 * and torn down again when the player backs out — so idle memory/GPU
 * cost stays low for anyone who never opens the 3D mode.
 */
export function use3DMode() {
  const [mode, setMode] = useState<HubLayerMode>('2d');
  const [progress, setProgress] = useState(0); // 0-1, asset load progress for a loading UI
  const loadedModuleRef = useRef<Hub3DSceneModule | null>(null);

  const enter3D = useCallback(async () => {
    setMode('transitioning');
    setProgress(0);

    // Lazy import — the 3D renderer (e.g. a react-three-fiber bundle)
    // never gets pulled into the 2D-only bundle path for players who
    // stay in the lightweight utility hub.
    const mod = await import(/* webpackChunkName: "hub-3d-layer" */ '../three/Hub3DScene') as Hub3DSceneModule;
    loadedModuleRef.current = mod;

    setProgress(1);
    setMode('3d');
  }, []);

  const exit3D = useCallback(() => {
    loadedModuleRef.current = null; // release for GC
    setMode('2d');
  }, []);

  return { mode, progress, enter3D, exit3D, Hub3DScene: loadedModuleRef.current as Hub3DSceneModule | null };
}
