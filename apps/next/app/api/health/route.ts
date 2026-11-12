import { NextResponse, type NextRequest } from 'next/server';

export type NetworkMode = 'local-mesh' | 'wan-gateway' | 'air-gapped';
export type HealthStatus = 'healthy' | 'degraded' | 'offline';

export interface NodeHealthResponse {
  status: HealthStatus;
  mode: NetworkMode;
  nodeId: string;
  nodeIp: string;
  latencyMs: number;
  bandwidth: string;
  hubVersion: string;
  uptime: string;
  timestamp: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedMode = searchParams.get('mode') as NetworkMode | null;
  const forceDegraded = searchParams.get('degraded') === 'true';

  // Determine network mode
  const urlObj = new URL(request.url);
  const host = (request.headers.get('host') || urlObj.hostname || '').toLowerCase();
  const isLocalHost =
    host.includes('localhost') ||
    host.includes('127.0.0.1') ||
    host.startsWith('192.168.') ||
    host.startsWith('10.');

  let mode: NetworkMode = 'local-mesh';
  if (requestedMode && ['local-mesh', 'wan-gateway', 'air-gapped'].includes(requestedMode)) {
    mode = requestedMode;
  } else if (process.env.SUNSHADE_NETWORK_MODE) {
    mode = process.env.SUNSHADE_NETWORK_MODE as NetworkMode;
  } else if (!isLocalHost && !host.includes('mesh')) {
    mode = 'wan-gateway';
  }

  let status: HealthStatus = 'healthy';
  let latencyMs = mode === 'local-mesh' ? 4 : mode === 'wan-gateway' ? 38 : 0;
  let bandwidth = mode === 'local-mesh' ? '120 Mbps (Mesh Peer)' : mode === 'wan-gateway' ? '1 Gbps (WAN Fiber)' : '0 Mbps (Air-Gapped)';

  if (forceDegraded || mode === 'air-gapped') {
    status = 'degraded';
    latencyMs = 0;
  }

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    (mode === 'local-mesh' ? '192.168.88.1' : '104.21.48.91');

  const data: NodeHealthResponse = {
    status,
    mode,
    nodeId: process.env.SUNSHADE_NODE_ID || 'flypack-mesh-alpha-01',
    nodeIp: clientIp,
    latencyMs,
    bandwidth,
    hubVersion: process.env.NEXT_PUBLIC_APP_VERSION || 'v2.4.1-mesh',
    uptime: '14d 6h 32m',
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(data, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
