import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Disclosure } from '../../components/common';

describe('Disclosure', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  test('starts closed and opens on click', () => {
    render(<Disclosure title="Giocatori (2)">Anna e Carlo</Disclosure>);
    const toggle = screen.getByRole('button', { name: /Giocatori \(2\)/ });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Anna e Carlo')).not.toBeVisible();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Anna e Carlo')).toBeVisible();
  });

  test('can start open', () => {
    render(<Disclosure title="Regole" defaultOpen>Tris</Disclosure>);

    expect(screen.getByText('Tris')).toBeVisible();
  });

  test('openOnDesktop starts open on a wide screen', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    render(<Disclosure title="Regole" openOnDesktop>Tris</Disclosure>);

    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1024px)');
    expect(screen.getByText('Tris')).toBeVisible();
  });

  test('openOnDesktop starts closed on a narrow screen', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    render(<Disclosure title="Regole" openOnDesktop>Tris</Disclosure>);

    expect(screen.getByText('Tris')).not.toBeVisible();
  });

  test('without matchMedia it starts closed instead of failing', () => {
    window.matchMedia = undefined;

    render(<Disclosure title="Regole" openOnDesktop>Tris</Disclosure>);

    expect(screen.getByText('Tris')).not.toBeVisible();
  });

  test('the toggle is at least 44 px tall', () => {
    render(<Disclosure title="Regole">Tris</Disclosure>);

    expect(screen.getByRole('button', { name: /Regole/ }).className).toMatch(/min-h-\[44px\]/);
  });
});
