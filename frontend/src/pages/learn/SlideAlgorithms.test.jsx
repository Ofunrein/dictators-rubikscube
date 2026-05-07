import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SlideAlgorithms from './SlideAlgorithms.jsx';

describe('SlideAlgorithms', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders section title', () => {
    render(<SlideAlgorithms onCopy={() => {}} />);
    expect(screen.getByText('Algorithm Cheat Sheet')).toBeTruthy();
  });

  it('renders all 8 algorithm names', () => {
    render(<SlideAlgorithms onCopy={() => {}} />);
    expect(screen.getByText('Right Trigger')).toBeTruthy();
    expect(screen.getByText('Insert Right')).toBeTruthy();
    expect(screen.getByText('Insert Left')).toBeTruthy();
    expect(screen.getByText('FRU')).toBeTruthy();
    expect(screen.getByText('Sune')).toBeTruthy();
    expect(screen.getByText('Corner Swap')).toBeTruthy();
    expect(screen.getByText('CW Cycle')).toBeTruthy();
    expect(screen.getByText('CCW Cycle')).toBeTruthy();
  });

  it('renders algorithm notation as code', () => {
    render(<SlideAlgorithms onCopy={() => {}} />);
    expect(screen.getByText("R U R' U'")).toBeTruthy();
  });

  it('calls onCopy when algorithm code is clicked', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(<SlideAlgorithms onCopy={onCopy} />);
    await user.click(screen.getByText("R U R' U'"));
    expect(onCopy).toHaveBeenCalledWith("R U R' U'");
  });
});
