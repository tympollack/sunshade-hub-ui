'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Move, Video, VideoOff, FlipHorizontal, Eye, EyeOff } from 'lucide-react';
import {
  DEFAULT_PIP_LAYOUT,
  computePiPRect,
  type ICreatorPresenceProvider,
  type PresencePiPCorner,
  type PresencePiPLayout,
} from '@digitalcanopy/dramacast';

export interface DraggableWebcamPiPProps {
  creatorName: string;
  presenceProvider: ICreatorPresenceProvider | null;
  layout?: PresencePiPLayout;
  onLayoutChange?: (next: PresencePiPLayout) => void;
  stageWidth?: number;
  stageHeight?: number;
  vodVideoUrl?: string | null;
  remoteFrameDataUrl?: string | null;
  canControlCamera?: boolean;
  onAttachVideoElement?: (el: HTMLVideoElement | null) => void;
  onWebcamStateChange?: (active: boolean, videoEl: HTMLVideoElement | null) => void;
}

const CORNERS: Array<{ corner: PresencePiPCorner; label: string }> = [
  { corner: 'top_left', label: 'TL' },
  { corner: 'top_right', label: 'TR' },
  { corner: 'bottom_left', label: 'BL' },
  { corner: 'bottom_right', label: 'BR' },
];

export function snapPointToCorner(
  x: number,
  y: number,
  stageWidth: number,
  stageHeight: number
): PresencePiPCorner {
  const isRight = x >= stageWidth / 2;
  const isBottom = y >= stageHeight / 2;
  if (isRight && isBottom) return 'bottom_right';
  if (isRight && !isBottom) return 'top_right';
  if (!isRight && isBottom) return 'bottom_left';
  return 'top_left';
}

export function DraggableWebcamPiP({
  creatorName,
  presenceProvider,
  layout: controlledLayout,
  onLayoutChange,
  stageWidth = 960,
  stageHeight = 540,
  vodVideoUrl = null,
  remoteFrameDataUrl = null,
  canControlCamera = true,
  onAttachVideoElement,
  onWebcamStateChange,
}: DraggableWebcamPiPProps) {
  const [internalLayout, setInternalLayout] = useState<PresencePiPLayout>(
    controlledLayout ?? presenceProvider?.getLayout() ?? DEFAULT_PIP_LAYOUT
  );
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const dragOriginRef = useRef<{
    pointerStartX: number;
    pointerStartY: number;
    rectStartX: number;
    rectStartY: number;
  } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeLayout = controlledLayout ?? internalLayout;

  const pipRect = useMemo(
    () => computePiPRect(stageWidth, stageHeight, activeLayout),
    [stageWidth, stageHeight, activeLayout]
  );

  const commitLayout = useCallback(
    (patch: Partial<PresencePiPLayout>) => {
      const updated = presenceProvider
        ? presenceProvider.updateLayout(patch)
        : { ...activeLayout, ...patch };
      setInternalLayout(updated);
      onLayoutChange?.(updated);
    },
    [activeLayout, onLayoutChange, presenceProvider]
  );

  useEffect(() => {
    if (onAttachVideoElement) {
      onAttachVideoElement(videoRef.current);
    }
    return () => {
      onAttachVideoElement?.(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      void presenceProvider?.stop?.();
    };
  }, [onAttachVideoElement, presenceProvider]);

  useEffect(() => {
    if (!presenceProvider || !videoRef.current) return;
    if ('getMediaStream' in presenceProvider && typeof (presenceProvider as any).getMediaStream === 'function') {
      const stream = (presenceProvider as any).getMediaStream();
      if (stream && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [presenceProvider, webcamActive]);

  const handleToggleWebcam = async () => {
    if (!presenceProvider || !canControlCamera) return;
    setWebcamError(null);
    if (webcamActive) {
      await presenceProvider.stop();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setWebcamActive(false);
      onWebcamStateChange?.(false, videoRef.current);
      return;
    }

    try {
      await presenceProvider.start();
      if (
        videoRef.current &&
        'getMediaStream' in presenceProvider &&
        typeof (presenceProvider as any).getMediaStream === 'function'
      ) {
        videoRef.current.srcObject = (presenceProvider as any).getMediaStream();
      }
      setWebcamActive(true);
      onWebcamStateChange?.(true, videoRef.current);
    } catch (err: any) {
      setWebcamError(err?.message || 'Camera access unavailable in this browser.');
      setWebcamActive(false);
      onWebcamStateChange?.(false, videoRef.current);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement)?.closest('button')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragOriginRef.current = {
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      rectStartX: pipRect.x,
      rectStartY: pipRect.y,
    };
    setDragOffset({ x: pipRect.x, y: pipRect.y });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOriginRef.current) return;
    const dx = e.clientX - dragOriginRef.current.pointerStartX;
    const dy = e.clientY - dragOriginRef.current.pointerStartY;
    const clampedX = Math.max(0, Math.min(stageWidth - pipRect.width, dragOriginRef.current.rectStartX + dx));
    const clampedY = Math.max(0, Math.min(stageHeight - pipRect.height, dragOriginRef.current.rectStartY + dy));
    setDragOffset({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOriginRef.current) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const finalPos = dragOffset ?? { x: pipRect.x, y: pipRect.y };
    const centerX = finalPos.x + pipRect.width / 2;
    const centerY = finalPos.y + pipRect.height / 2;
    const snappedCorner = snapPointToCorner(centerX, centerY, stageWidth, stageHeight);
    dragOriginRef.current = null;
    setDragOffset(null);
    commitLayout({ corner: snappedCorner });
  };

  const currentX = dragOffset ? dragOffset.x : pipRect.x;
  const currentY = dragOffset ? dragOffset.y : pipRect.y;
  const leftPct = (currentX / Math.max(1, stageWidth)) * 100;
  const topPct = (currentY / Math.max(1, stageHeight)) * 100;
  const widthPct = (pipRect.width / Math.max(1, stageWidth)) * 100;

  return (
    <div
      data-testid="draggable-webcam-pip"
      data-corner={activeLayout.corner}
      data-visible={activeLayout.visible ? 'true' : 'false'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: `${Math.max(18, Math.min(40, widthPct))}%`,
        borderRadius: `${pipRect.borderRadiusPx}px`,
        opacity: activeLayout.visible ? pipRect.opacity : 0.35,
      }}
      className="absolute z-20 aspect-square bg-zinc-900/95 border-2 border-orange-500/70 shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing flex flex-col justify-between transition-[left,top] duration-150"
    >
      {/* Video / Presence Surface */}
      <div className="relative flex-1 bg-zinc-950 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          data-testid="pip-webcam-video"
          src={vodVideoUrl ?? undefined}
          autoPlay={webcamActive}
          playsInline
          muted
          style={{
            transform: activeLayout.mirrorVideo ? 'scaleX(-1)' : undefined,
          }}
          className={`w-full h-full object-cover ${webcamActive || vodVideoUrl ? 'block' : 'hidden'}`}
        />

        {!webcamActive && !vodVideoUrl && remoteFrameDataUrl && (
          <img
            src={remoteFrameDataUrl}
            alt={`${creatorName} live webcam PiP`}
            data-testid="pip-remote-frame"
            style={{
              transform: activeLayout.mirrorVideo ? 'scaleX(-1)' : undefined,
            }}
            className="w-full h-full object-cover"
          />
        )}

        {!webcamActive && !vodVideoUrl && !remoteFrameDataUrl && (
          <div className="p-2 text-center space-y-1">
            <Move className="w-4 h-4 text-orange-400 mx-auto" />
            <p className="text-[10px] font-bold text-white truncate max-w-[110px]">
              {creatorName}
            </p>
            <p className="text-[9px] font-mono text-zinc-400">
              Drag PiP • Cam Standby
            </p>
          </div>
        )}

        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-emerald-300">
          {webcamActive ? 'CAM LIVE' : remoteFrameDataUrl ? 'HOST CAM' : vodVideoUrl ? 'VOD SYNC' : 'PiP'}
        </div>
      </div>

      {/* Compact Controls Strip */}
      <div className="px-1.5 py-1 bg-zinc-900/95 border-t border-zinc-800 flex items-center justify-between gap-1">
        <div className="flex items-center gap-0.5">
          {CORNERS.map((item) => (
            <button
              key={item.corner}
              type="button"
              data-testid={`pip-snap-${item.corner}`}
              onClick={() => commitLayout({ corner: item.corner })}
              className={`px-1 py-0.5 rounded text-[9px] font-mono font-bold transition-colors ${
                activeLayout.corner === item.corner
                  ? 'bg-orange-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="pip-mirror-btn"
            title="Mirror PiP Video"
            onClick={() => commitLayout({ mirrorVideo: !activeLayout.mirrorVideo })}
            className={`p-1 rounded ${
              activeLayout.mirrorVideo ? 'text-cyan-400 bg-zinc-800' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FlipHorizontal className="w-3 h-3" />
          </button>
          <button
            type="button"
            data-testid="pip-visibility-btn"
            title="Toggle PiP Visibility"
            onClick={() => commitLayout({ visible: !activeLayout.visible })}
            className="p-1 rounded text-zinc-300 hover:text-white bg-zinc-800"
          >
            {activeLayout.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          {presenceProvider && canControlCamera && (
            <button
              type="button"
              data-testid="pip-camera-toggle-btn"
              title={webcamActive ? 'Stop Webcam' : 'Start Webcam'}
              onClick={handleToggleWebcam}
              className={`p-1 rounded ${
                webcamActive ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {webcamActive ? <VideoOff className="w-3 h-3" /> : <Video className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {webcamError && (
        <div
          data-testid="pip-webcam-error"
          className="px-1.5 py-0.5 bg-rose-950/90 text-[9px] text-rose-300 truncate"
        >
          {webcamError}
        </div>
      )}
    </div>
  );
}
