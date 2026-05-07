import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SlideStepByStep from './SlideStepByStep.jsx';

describe('SlideStepByStep', () => {
  it('renders section title', () => {
    render(<SlideStepByStep />);
    expect(screen.getByText('7 Steps to Solved')).toBeTruthy();
  });

  it('renders all 7 step titles', () => {
    render(<SlideStepByStep />);
    expect(screen.getByText('White Cross')).toBeTruthy();
    expect(screen.getByText('White Corners')).toBeTruthy();
    expect(screen.getByText('Second Layer Edges')).toBeTruthy();
    expect(screen.getByText('Yellow Cross')).toBeTruthy();
    expect(screen.getByText('Yellow Face')).toBeTruthy();
    expect(screen.getByText('Position Yellow Corners')).toBeTruthy();
    expect(screen.getByText('Position Yellow Edges')).toBeTruthy();
  });

  it('renders algorithm for step 2', () => {
    render(<SlideStepByStep />);
    expect(screen.getByText("R U R' U'")).toBeTruthy();
    expect(screen.getByText('Right Trigger')).toBeTruthy();
  });

  it('renders difficulty badges', () => {
    render(<SlideStepByStep />);
    const easyBadges = screen.getAllByText('Easy');
    expect(easyBadges.length).toBe(2);
  });

  it('renders congratulations banner on last step', () => {
    render(<SlideStepByStep />);
    expect(screen.getByText(/congratulations/i)).toBeTruthy();
  });
});
