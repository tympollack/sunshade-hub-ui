import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  BroadcastPreviewDrawer,
  type BroadcastPostData,
} from '../components/syndication/BroadcastPreviewDrawer';

const MOCK_POST: BroadcastPostData = {
  id: 'pub-test-uuid',
  title: 'Consensus Governance Release v2.4',
  body: 'SunShade Network introduces zero-WAN offline participation and quadratic token minting across decentralized nodes.',
  canonicalUrl: 'https://sunshade.icu/posts/gov-2-4',
  shortUrl: 'https://links.sunshade.icu/s/gov24',
  mediaUrls: ['https://cdn.sunshade.icu/banner.png'],
  scheduledAt: '2026-11-20T12:00',
  targetPlatforms: ['bluesky', 'x', 'linkedin', 'meta'],
};

describe('BroadcastPreviewDrawer Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <BroadcastPreviewDrawer isOpen={false} onClose={vi.fn()} post={MOCK_POST} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders drawer with header, post overview, and platform tabs when isOpen is true', () => {
    render(<BroadcastPreviewDrawer isOpen={true} onClose={vi.fn()} post={MOCK_POST} />);

    expect(screen.getByText('Social Broadcast Preview & Override')).toBeInTheDocument();
    expect(screen.getByTestId('broadcast-preview-drawer')).toBeInTheDocument();
    expect(screen.getByText('Consensus Governance Release v2.4')).toBeInTheDocument();
    expect(screen.getByText('https://sunshade.icu/posts/gov-2-4')).toBeInTheDocument();

    // All platform tabs rendered
    expect(screen.getByTestId('tab-bluesky')).toBeInTheDocument();
    expect(screen.getByTestId('tab-x')).toBeInTheDocument();
    expect(screen.getByTestId('tab-linkedin')).toBeInTheDocument();
    expect(screen.getByTestId('tab-meta')).toBeInTheDocument();
  });

  it('allows switching platform tabs and displays platform-specific character limit budgets', () => {
    render(<BroadcastPreviewDrawer isOpen={true} onClose={vi.fn()} post={MOCK_POST} />);

    // Default tab is Bluesky (300 limit)
    expect(screen.getByTestId('char-counter-bluesky')).toHaveTextContent('300');

    // Switch to X tab (280 limit)
    fireEvent.click(screen.getByTestId('tab-x'));
    expect(screen.getByTestId('char-counter-x')).toHaveTextContent('280');

    // Switch to LinkedIn tab (3000 limit)
    fireEvent.click(screen.getByTestId('tab-linkedin'));
    expect(screen.getByTestId('char-counter-linkedin')).toHaveTextContent('3000');

    // Switch to Meta tab (63206 limit)
    fireEvent.click(screen.getByTestId('tab-meta'));
    expect(screen.getByTestId('char-counter-meta')).toHaveTextContent('63206');
  });

  it('updates copy independently per platform and updates character counters in real time', () => {
    render(<BroadcastPreviewDrawer isOpen={true} onClose={vi.fn()} post={MOCK_POST} />);

    // Edit Bluesky text
    const bskyInput = screen.getByTestId('input-text-bluesky');
    fireEvent.change(bskyInput, { target: { value: 'Custom Bluesky copy with facets.' } });
    expect(screen.getByTestId('char-counter-bluesky')).toHaveTextContent('32 / 300');

    // Switch to X and verify original text is still preserved for X
    fireEvent.click(screen.getByTestId('tab-x'));
    const xInput = screen.getByTestId('input-text-x');
    expect(xInput).toHaveValue(MOCK_POST.body);

    // Edit X text
    fireEvent.change(xInput, { target: { value: 'Custom thread tweet.' } });
    expect(screen.getByTestId('char-counter-x')).toHaveTextContent('20 / 280');

    // Switch back to Bluesky and verify custom copy retained
    fireEvent.click(screen.getByTestId('tab-bluesky'));
    expect(screen.getByTestId('input-text-bluesky')).toHaveValue('Custom Bluesky copy with facets.');
  });

  it('displays warning and disables broadcast/queue buttons when copy exceeds platform character limit', () => {
    render(<BroadcastPreviewDrawer isOpen={true} onClose={vi.fn()} post={MOCK_POST} />);

    // Bluesky limit is 300; enter 305 characters
    const overLimitText = 'A'.repeat(305);
    const bskyInput = screen.getByTestId('input-text-bluesky');
    fireEvent.change(bskyInput, { target: { value: overLimitText } });

    expect(screen.getByText(/Exceeds platform limit by 5 chars/i)).toBeInTheDocument();

    const queueBtn = screen.getByTestId('btn-approve-and-queue');
    const broadcastBtn = screen.getByTestId('btn-broadcast-immediately');

    expect(queueBtn).toBeDisabled();
    expect(broadcastBtn).toBeDisabled();
  });

  it('allows resetting copy to source post body', () => {
    render(<BroadcastPreviewDrawer isOpen={true} onClose={vi.fn()} post={MOCK_POST} />);

    const bskyInput = screen.getByTestId('input-text-bluesky');
    fireEvent.change(bskyInput, { target: { value: 'Temporary text' } });
    expect(bskyInput).toHaveValue('Temporary text');

    // Click Reset copy
    fireEvent.click(screen.getByTestId('btn-reset-copy'));
    expect(bskyInput).toHaveValue(MOCK_POST.body);
  });

  it('allows toggling platform enable checkboxes and updates active channel count', () => {
    render(<BroadcastPreviewDrawer isOpen={true} onClose={vi.fn()} post={MOCK_POST} />);

    expect(screen.getByText('4 of 4 channels active')).toBeInTheDocument();

    // Disable X
    const toggleX = screen.getByTestId('toggle-x');
    fireEvent.click(toggleX);

    expect(screen.getByText('3 of 4 channels active')).toBeInTheDocument();
  });

  it('triggers onApproveAndQueue with overrides, scheduled timestamp, and active channels', () => {
    const handleQueue = vi.fn();
    render(
      <BroadcastPreviewDrawer
        isOpen={true}
        onClose={vi.fn()}
        post={MOCK_POST}
        onApproveAndQueue={handleQueue}
      />,
    );

    // Edit Bluesky copy
    fireEvent.change(screen.getByTestId('input-text-bluesky'), {
      target: { value: 'Approved Bluesky broadcast text' },
    });

    // Change scheduled cadence
    fireEvent.change(screen.getByTestId('input-scheduled-at'), {
      target: { value: '2026-11-25T14:30' },
    });

    // Click Approve & Schedule
    fireEvent.click(screen.getByTestId('btn-approve-and-queue'));

    expect(handleQueue).toHaveBeenCalledTimes(1);
    const payload = handleQueue.mock.calls[0][0];
    expect(payload.overrides.bluesky.text).toBe('Approved Bluesky broadcast text');
    expect(payload.scheduledAt).toBe(new Date('2026-11-25T14:30').toISOString());
    expect(payload.enabledPlatforms).toEqual(['bluesky', 'x', 'linkedin', 'meta']);
  });

  it('triggers onBroadcastImmediately with overrides and enabled platforms', () => {
    const handleBroadcast = vi.fn();
    render(
      <BroadcastPreviewDrawer
        isOpen={true}
        onClose={vi.fn()}
        post={MOCK_POST}
        onBroadcastImmediately={handleBroadcast}
      />,
    );

    // Disable LinkedIn
    fireEvent.click(screen.getByTestId('toggle-linkedin'));

    // Click Broadcast Immediately
    fireEvent.click(screen.getByTestId('btn-broadcast-immediately'));

    expect(handleBroadcast).toHaveBeenCalledTimes(1);
    const payload = handleBroadcast.mock.calls[0][0];
    expect(payload.enabledPlatforms).toEqual(['bluesky', 'x', 'meta']);
  });

  it('handles onClose via Close button, Backdrop click, and Escape key', () => {
    const handleClose = vi.fn();
    render(<BroadcastPreviewDrawer isOpen={true} onClose={handleClose} post={MOCK_POST} />);

    // Close button
    fireEvent.click(screen.getByLabelText('Close drawer'));
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Backdrop click
    fireEvent.click(screen.getByTestId('broadcast-drawer-backdrop'));
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(3);
  });
});