import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecuritySettingsDrawer } from '../components/settings/SecuritySettingsDrawer';

describe('SecuritySettingsDrawer Component (How We Protect Deliberation)', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(<SecuritySettingsDrawer isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders drawer with "How We Protect Deliberation" title when isOpen is true', () => {
    render(<SecuritySettingsDrawer isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('How We Protect Deliberation')).toBeInTheDocument();
    expect(screen.getByTestId('security-settings-drawer')).toBeInTheDocument();
  });

  it('details all three core cryptographic pillars: anti-bandwagoning lockboxes, zero-knowledge proofs, and sybil resistance', () => {
    render(<SecuritySettingsDrawer isOpen={true} onClose={vi.fn()} />);

    // Pillar 1: Anti-Bandwagoning Lockboxes
    const p1 = screen.getByTestId('pillar-anti-bandwagoning');
    expect(p1).toHaveTextContent('Anti-Bandwagoning Lockboxes');
    expect(p1).toHaveTextContent(/cryptographic lockboxes/i);
    expect(p1).toHaveTextContent(/herd mentality/i);

    // Pillar 2: Zero-Knowledge Proofs
    const p2 = screen.getByTestId('pillar-zero-knowledge');
    expect(p2).toHaveTextContent('Zero-Knowledge Proofs (ZKP)');
    expect(p2).toHaveTextContent(/without revealing who they are/i);

    // Pillar 3: Sybil Resistance
    const p3 = screen.getByTestId('pillar-sybil-resistance');
    expect(p3).toHaveTextContent('Sybil Resistance');
    expect(p3).toHaveTextContent(/one single-human citizen profile/i);
    expect(p3).toHaveTextContent(/bot armies/i);
  });

  it('triggers onClose when close button or close documentation button is clicked', () => {
    const handleClose = vi.fn();
    render(<SecuritySettingsDrawer isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByLabelText('Close drawer');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    const closeDocBtn = screen.getByRole('button', { name: /Close Documentation/i });
    fireEvent.click(closeDocBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);

    // Escape key press closes drawer
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(3);
  });
});
