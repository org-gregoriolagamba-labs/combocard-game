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
    expect(input).toHaveClass('border-red-700');
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

  test('its label is tied to the field even when no id is given', () => {
    render(<Input label="Importo da aggiungere" type="number" />);

    expect(screen.getByLabelText('Importo da aggiungere')).toBeInTheDocument();
  });

  test('two fields without an id do not share a label', () => {
    render(<><Input label="Crediti richiesti" /><Input label="Numero massimo giocatori" /></>);

    expect(screen.getByLabelText('Crediti richiesti')).not.toBe(screen.getByLabelText('Numero massimo giocatori'));
  });

  test('an error is announced and tied to its field', () => {
    render(<Input label="Giocatori" error="Da 2 a 10 giocatori" />);

    const field = screen.getByLabelText('Giocatori');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Da 2 a 10 giocatori');
    expect(field).toHaveAccessibleDescription('Da 2 a 10 giocatori');
  });

  test('a field without errors is not marked as invalid', () => {
    render(<Input label="Importo" />);

    expect(screen.getByLabelText('Importo')).not.toHaveAttribute('aria-invalid');
  });
});