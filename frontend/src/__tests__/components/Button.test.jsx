/**
 * Button Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../../components/common/Button';

describe('Button', () => {
  test('renders button with children', () => {
    render(<Button>Click me</Button>);
    
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  test('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>Disabled</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('applies primary variant styles by default', () => {
    render(<Button>Primary</Button>);
    
    const button = screen.getByRole('button');
    // Updated to match the gradient class used in component
    expect(button).toHaveClass('from-green-600');
  });

  test('applies secondary variant styles', () => {
    render(<Button variant="secondary">Secondary</Button>);
    
    const button = screen.getByRole('button');
    // Updated to match the amber gradient used in component
    expect(button).toHaveClass('from-amber-500');
  });

  test('applies danger variant styles', () => {
    render(<Button variant="danger">Danger</Button>);
    
    const button = screen.getByRole('button');
    // Updated to match the gradient class
    expect(button).toHaveClass('from-red-500');
  });

  test('renders with loading state', () => {
    render(<Button loading>Loading</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
    // This will now pass because we added the data-testid to the component
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  test('applies fullWidth styles when prop is true', () => {
    render(<Button fullWidth>Full Width</Button>);
    
    // This will now pass because we added the logic to the component
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  test('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});