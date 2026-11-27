'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Activity, Camera, Radio, Zap } from 'lucide-react';
import { AtmosphericBadge } from '@digitalcanopy/ui';
import type { DirectorCameraCue, ScrubSyncState } from '@digitalcanopy/dramacast';

export interface WebGLTelemetryCanvasProps {
  creatorName: string;
  syncState: ScrubSyncState | null;
  isLiveActive: boolean;
  activeHudBanner?: string | null;
  activeDropEffect?: string | null;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
  className?: string;
}

const VERTEX_SHADER_SRC = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  varying vec2 v_uv;
  uniform float u_time;
  uniform float u_winProb;
  uniform float u_drama;
  uniform float u_zoom;

  void main() {
    vec2 uv = (v_uv - 0.5) / max(0.5, u_zoom) + 0.5;
    float gridX = abs(fract(uv.x * 16.0) - 0.5);
    float gridY = abs(fract(uv.y * 9.0) - 0.5);
    float gridLine = smoothstep(0.47, 0.495, max(gridX, gridY));

    float wave = 0.25 + 0.5 * u_winProb + 0.08 * sin(uv.x * 10.0 + u_time * 2.4);
    float beam = exp(-abs(uv.y - wave) * 28.0);

    vec3 baseCol = vec3(0.035, 0.04, 0.06);
    vec3 cyberCyan = vec3(0.02, 0.72, 0.85);
    vec3 dramaOrange = vec3(0.98, 0.45, 0.09);
    vec3 accent = mix(cyberCyan, dramaOrange, clamp(u_drama, 0.0, 1.0));

    vec3 col = baseCol + gridLine * vec3(0.06, 0.09, 0.14) + beam * accent * (0.6 + 0.6 * u_drama);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function getCameraCueZoom(cue?: DirectorCameraCue | null): number {
  switch (cue) {
    case 'TIGHT_BOARD_ZOOM':
      return 1.32;
    case 'SLOW_MO_HIGHLIGHT':
      return 1.24;
    case 'PIP_REACTION_FOCUS':
      return 1.08;
    case 'SPLIT_CHALLENGE':
      return 1.15;
    default:
      return 1.0;
  }
}

export function drawTelemetryFallback2D(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  winProb: number,
  dramaNorm: number,
  phaseSec: number
): void {
  ctx.fillStyle = '#090b10';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(39, 52, 73, 0.45)';
  ctx.lineWidth = 1;
  const cols = 16;
  const rows = 9;
  for (let i = 1; i < cols; i++) {
    const x = (width / cols) * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let j = 1; j < rows; j++) {
    const y = (height / rows) * j;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = dramaNorm > 0.65 ? '#f97316' : '#06b6d4';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let px = 0; px <= width; px += 12) {
    const normX = px / Math.max(1, width);
    const waveY =
      height * (0.75 - winProb * 0.5) +
      Math.sin(normX * 8 + phaseSec * 2.2) * (12 + dramaNorm * 18);
    if (px === 0) ctx.moveTo(px, waveY);
    else ctx.lineTo(px, waveY);
  }
  ctx.stroke();
}

export function WebGLTelemetryCanvas({
  creatorName,
  syncState,
  isLiveActive,
  activeHudBanner,
  activeDropEffect,
  onCanvasReady,
  className = '',
}: WebGLTelemetryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [backend, setBackend] = useState<'webgl' | 'canvas2d' | 'standby'>('standby');

  useEffect(() => {
    onCanvasReady?.(canvasRef.current);
    return () => onCanvasReady?.(null);
  }, [onCanvasReady]);

  const winProb = syncState?.interpolatedWinProbability ?? 0;
  const dramaIndex = syncState?.interpolatedDramaIndex ?? 0;
  const score = syncState?.interpolatedScore ?? 0;
  const activeKf = syncState?.activeKeyframe ?? null;
  const activeFrame = syncState?.activeFrame ?? null;
  const hasTelemetry = Boolean(syncState && (activeFrame || activeKf || isLiveActive));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }

    if (gl) {
      const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
      if (vs && fs) {
        const program = gl.createProgram();
        if (program) {
          gl.attachShader(program, vs);
          gl.attachShader(program, fs);
          gl.linkProgram(program);

          if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            setBackend('webgl');
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(
              gl.ARRAY_BUFFER,
              new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
              gl.STATIC_DRAW
            );

            const posLoc = gl.getAttribLocation(program, 'a_position');
            const timeLoc = gl.getUniformLocation(program, 'u_time');
            const winLoc = gl.getUniformLocation(program, 'u_winProb');
            const dramaLoc = gl.getUniformLocation(program, 'u_drama');
            const zoomLoc = gl.getUniformLocation(program, 'u_zoom');

            let rafId = 0;
            const startTs = performance.now();

            const renderGL = () => {
              if (!gl) return;
              gl.viewport(0, 0, canvas.width, canvas.height);
              gl.useProgram(program);
              gl.enableVertexAttribArray(posLoc);
              gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
              gl.uniform1f(timeLoc, (performance.now() - startTs) / 1000);
              gl.uniform1f(winLoc, winProb);
              gl.uniform1f(dramaLoc, Math.min(1, dramaIndex / 100));
              gl.uniform1f(zoomLoc, getCameraCueZoom(activeKf?.cameraCue));
              gl.drawArrays(gl.TRIANGLES, 0, 6);
              rafId = requestAnimationFrame(renderGL);
            };

            renderGL();
            return () => {
              cancelAnimationFrame(rafId);
              gl?.deleteProgram(program);
              gl?.deleteShader(vs);
              gl?.deleteShader(fs);
              gl?.deleteBuffer(buffer);
            };
          }
        }
      }
    }

    let ctx2d: CanvasRenderingContext2D | null = null;
    try {
      ctx2d = canvas.getContext('2d');
    } catch {
      ctx2d = null;
    }

    if (ctx2d) {
      setBackend('canvas2d');
      drawTelemetryFallback2D(
        ctx2d,
        canvas.width,
        canvas.height,
        winProb,
        Math.min(1, dramaIndex / 100),
        (syncState?.playheadMs ?? 0) / 1000
      );
      return;
    }

    setBackend('standby');
  }, [winProb, dramaIndex, activeKf?.cameraCue, syncState?.playheadMs]);

  return (
    <div
      data-testid="live-webgl-stage-surface"
      className={`relative w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        data-testid="live-webgl-canvas"
        data-render-backend={backend}
        width={1280}
        height={720}
        className="w-full h-full block object-cover"
      />

      {/* Top Stage Telemetry Header */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <AtmosphericBadge
            label={isLiveActive ? `LIVE • ${creatorName}` : `VOD STAGE • ${creatorName}`}
            variant={isLiveActive ? 'core' : 'telemetry'}
            statusDot
            pulse={isLiveActive}
            size="sm"
          />
          {activeKf && (
            <AtmosphericBadge
              label={`${activeKf.cameraCue} • ${activeKf.playbackRate}×`}
              variant="cozy"
              size="sm"
            />
          )}
          {activeDropEffect && (
            <AtmosphericBadge
              label={`ACTIVE DROP: ${activeDropEffect}`}
              variant="success"
              size="sm"
            />
          )}
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-950/80 border border-zinc-800 text-[11px] font-mono text-zinc-300">
          <Camera className="w-3.5 h-3.5 text-cyan-400" />
          <span>{backend === 'webgl' ? 'WebGL2 Telemetry' : 'Canvas Telemetry'}</span>
        </div>
      </div>

      {/* Live Gladiator Drop / Cheer HUD Banner */}
      {activeHudBanner && (
        <div
          data-testid="live-hud-trigger-banner"
          className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-orange-500/90 text-white text-xs font-black tracking-wide shadow-xl border border-amber-300/60 flex items-center gap-2"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{activeHudBanner}</span>
        </div>
      )}

      {/* Center Standby Empty State when no frames or live signal */}
      {!hasTelemetry && (
        <div
          data-testid="live-stage-standby"
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-zinc-950/75 backdrop-blur-sm"
        >
          <Radio className="w-8 h-8 text-zinc-500 mb-2" />
          <p className="text-sm font-bold text-white">Broadcast Standby</p>
          <p className="text-xs text-zinc-400 max-w-md mt-1">
            No live telemetry stream or Showdown Reel loaded yet for {creatorName}. Start a Live Studio broadcast or select a recorded Showdown Reel below.
          </p>
        </div>
      )}

      {/* Bottom Telemetry Readout Strip */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 grid grid-cols-3 sm:grid-cols-4 gap-2 max-w-2xl">
        <div className="px-3 py-2 rounded-xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md">
          <p className="text-[10px] text-zinc-400 uppercase font-semibold">Score</p>
          <p data-testid="live-stage-score" className="text-sm sm:text-base font-black text-white font-mono">
            {score.toLocaleString()}
          </p>
        </div>
        <div className="px-3 py-2 rounded-xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md">
          <p className="text-[10px] text-zinc-400 uppercase font-semibold">Win Odds</p>
          <p data-testid="live-stage-win-prob" className="text-sm sm:text-base font-black text-cyan-400 font-mono">
            {`${(winProb * 100).toFixed(1)}%`}
          </p>
        </div>
        <div className="px-3 py-2 rounded-xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md">
          <p className="text-[10px] text-zinc-400 uppercase font-semibold flex items-center gap-1">
            <Activity className="w-3 h-3 text-orange-400" />
            Drama Index
          </p>
          <p data-testid="live-stage-drama" className="text-sm sm:text-base font-black text-orange-400 font-mono">
            {dramaIndex.toFixed(1)}
          </p>
        </div>
        <div className="hidden sm:block px-3 py-2 rounded-xl bg-zinc-950/85 border border-zinc-800/90 backdrop-blur-md">
          <p className="text-[10px] text-zinc-400 uppercase font-semibold">Director Beat</p>
          <p className="text-xs font-bold text-amber-300 truncate mt-0.5">
            {activeKf?.captionOverlay || activeKf?.beatType?.replace(/_/g, ' ') || 'STANDBY'}
          </p>
        </div>
      </div>
    </div>
  );
}
