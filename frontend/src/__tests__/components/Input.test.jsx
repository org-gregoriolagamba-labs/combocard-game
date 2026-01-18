/**
 * Input Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '../../components/common/Input';

describe('Input', () => {
  test('renders input with label', () => {
    // Added id to link label and input
    render(<Input label="Username" name="username" id="username-input" />);
    
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
  });

  test('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Input name="test" value="" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  test('displays placeholder text', () => {
    render(<Input placeholder="Enter text" name="test" />);
    
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  test('displays error message', () => {
    render(<Input name="test" error="This field is required" />);
    
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  test('applies error styles when error is present', () => {
    render(<Input name="test" error="Error message" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
  });

  test('is disabled when disabled prop is true', () => {
    render(<Input name="test" disabled />);
    
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  test('renders with type password', () => {
    const { container } = render(<Input name="password" type="password" />);
    
    // Password inputs do not have role="textbox", so we query by selector
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<Input name="test" className="custom-input" />);
    
    expect(screen.getByRole('textbox')).toHaveClass('custom-input');
  });

  test('renders required indicator when required', () => {
    render(<Input label="Email" name="email" required />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});