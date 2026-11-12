import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NodeStatusPill, getStatusConfig } from '../components/header/NodeStatusPill';
import { GET as healthRoute } from '../app/api/health/route';
import { NextRequest } from 'next/server';

describe('Local Node Status & Network Mode Telemetry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Health API Route (/api/health)', () => {
    it('returns 200 with local mesh mode details by default on local host', async () => {
      const req = new NextRequest('http://localhost:3000/api/health');
      const res = await healthRoute(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.status).toBe('healthy');
      expect(json.mode).toBe('local-mesh');
      expect(json.nodeId).toBeTruthy();
      expect(json.nodeIp).toBeTruthy();
      expect(json.latencyMs).toBeGreaterThanOrEqual(0);
      expect(json.bandwidth).toContain('Mbps');
      expect(json.hubVersion).toBeTruthy();
    });

    it('returns requested mode and status via query parameter', async () => {
      const req = new NextRequest('http://localhost:3000/api/health?mode=wan-gateway');
      const res = await healthRoute(req);
      const json = await res.json();
      expect(json.mode).toBe('wan-gateway');
      expect(json.status).toBe('healthy');
    });

    it('marks status as degraded when in air-gapped mode', async () => {
      const req = new NextRequest('http://localhost:3000/api/health?mode=air-gapped');
      const res = await healthRoute(req);
      const json = await res.json();
      expect(json.mode).toBe('air-gapped');
      expect(json.status).toBe('degraded');
    });
  });

  describe('NodeStatusPill UI Component & Popover', () => {
    it('correctly maps network modes to visual indicator colors and copy', () => {
      const mesh = getStatusConfig('local-mesh', 'healthy');
      expect(mesh.label).toBe('Local Mesh Flypack (Low Latency)');
      expect(mesh.dotColor).toContain('emerald');

      const wan = getStatusConfig('wan-gateway', 'healthy');
      expect(wan.label).toBe('WAN Gateway');
      expect(wan.dotColor).toContain('amber');

      const airgap = getStatusConfig('air-gapped', 'degraded');
      expect(airgap.label).toBe('Degraded / Air-Gapped');
      expect(airgap.dotColor).toContain('rose');
    });

    it('renders compact pill with healthy mesh status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'healthy',
          mode: 'local-mesh',
          nodeId: 'flypack-mesh-01',
          nodeIp: '192.168.88.1',
          latencyMs: 4,
          bandwidth: '120 Mbps (Mesh Peer)',
          hubVersion: 'v2.4.1-mesh',
          uptime: '14d 6h',
          timestamp: new Date().toISOString(),
        }),
      } as any);

      render(<NodeStatusPill />);

      await waitFor(() => {
        expect(screen.getByText(/Local Mesh Flypack/i)).toBeInTheDocument();
      });
    });

    it('expands floating popover on click with IP, latency, bandwidth, and version', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'healthy',
          mode: 'local-mesh',
          nodeId: 'flypack-mesh-alpha-01',
          nodeIp: '192.168.88.42',
          latencyMs: 6,
          bandwidth: '120 Mbps (Active Mesh)',
          hubVersion: 'v2.4.1-mesh',
          uptime: '14d 6h',
          timestamp: new Date().toISOString(),
        }),
      } as any);

      render(<NodeStatusPill />);

      await waitFor(() => {
        expect(screen.getByText(/Local Mesh Flypack/i)).toBeInTheDocument();
      });

      // Popover should not be visible initially
      expect(screen.queryByTestId('node-telemetry-popover')).not.toBeInTheDocument();

      // Click pill to open
      const pillBtn = screen.getByRole('button', { name: /Toggle Node Telemetry Popover/i });
      await act(async () => {
        fireEvent.click(pillBtn);
      });

      // Popover should now be visible
      const popover = screen.getByTestId('node-telemetry-popover');
      expect(popover).toBeInTheDocument();

      expect(screen.getByTestId('telemetry-node-ip').textContent).toBe('192.168.88.42');
      expect(screen.getByTestId('telemetry-latency').textContent).toBe('6 ms');
      expect(screen.getByTestId('telemetry-bandwidth').textContent).toBe('120 Mbps (Active Mesh)');
      expect(screen.getByTestId('telemetry-version').textContent).toBe('v2.4.1-mesh');
    });

    it('handles network failure gracefully without throwing unhandled rejection', async () => {
      // Simulate network drop / WAN down
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch: Network unreachable'));

      render(<NodeStatusPill />);

      await waitFor(() => {
        expect(screen.getByText(/Degraded \/ Air-Gapped/i)).toBeInTheDocument();
      });

      // Click to open popover in air-gapped state
      const pillBtn = screen.getByRole('button', { name: /Toggle Node Telemetry Popover/i });
      await act(async () => {
        fireEvent.click(pillBtn);
      });

      expect(screen.getByTestId('telemetry-bandwidth').textContent).toContain('Air-Gapped');
    });
  });
});
