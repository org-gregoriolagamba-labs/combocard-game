import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Modal } from '../../components/common';

const Content = (props) => (
  <Modal isOpen title="Cassa" onClose={() => {}} {...props}>
    <input aria-label="Importo" />
    <button type="button">Aggiungi</button>
  </Modal>
);

describe('Modal', () => {
  test('is not on the page while closed', () => {
    render(<Content isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('is a dialog named by its title', () => {
    render(<Content />);

    const dialog = screen.getByRole('dialog', { name: 'Cassa' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  test('takes the focus, so the screen reader announces it', () => {
    render(<Content />);

    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  test('Esc closes it', () => {
    const onClose = jest.fn();
    render(<Content onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('the close button has a name and is a real tap target', () => {
    const onClose = jest.fn();
    render(<Content onClose={onClose} />);

    const close = screen.getByRole('button', { name: 'Chiudi' });
    fireEvent.click(close);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(close.className).toMatch(/min-h-\[44px\]/);
    expect(close.className).toMatch(/min-w-\[44px\]/);
  });

  test('a tap outside closes it, a tap inside does not', () => {
    const onClose = jest.fn();
    const { container } = render(<Content onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Importo'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(container.ownerDocument.querySelector('[data-modal-backdrop]'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('focus', () => {
    test('Tab from the last control goes back to the first, Shift+Tab the other way', () => {
      render(<Content />);
      const close = screen.getByRole('button', { name: 'Chiudi' });
      const last = screen.getByRole('button', { name: 'Aggiungi' });

      last.focus();
      fireEvent.keyDown(last, { key: 'Tab' });
      expect(close).toHaveFocus();

      fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
      expect(last).toHaveFocus();
    });

    test('closing it gives the focus back to what opened it', () => {
      const Opener = () => {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>Apri la Cassa</button>
            <Modal isOpen={open} title="Cassa" onClose={() => setOpen(false)}><p>Contenuto</p></Modal>
          </>
        );
      };
      render(<Opener />);
      const opener = screen.getByRole('button', { name: 'Apri la Cassa' });
      opener.focus();

      fireEvent.click(opener);
      expect(screen.getByRole('dialog')).toHaveFocus();
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
    });
  });
});
