/**
 * Modal Component
 *
 * An accessible dialog: it is announced with its title, takes the focus and
 * keeps it inside, closes with Esc or a tap outside, and gives the focus back
 * to what opened it.
 */

import React, { useEffect, useId, useRef } from "react";
import PropTypes from "prop-types";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function ModalDialog({ onClose, title, children, className = "" }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current?.focus();

    return () => {
      if (opener && typeof opener.focus === "function") {
        opener.focus();
      }
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const controls = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
    if (controls.length === 0) {
      event.preventDefault();
      return;
    }

    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        data-modal-backdrop
        aria-hidden="true"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`relative bg-amber-50 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[90dvh] overflow-y-auto border-4 border-amber-600 focus:outline-none ${className}`}
      >
        <div className="flex justify-between items-start gap-3 mb-4">
          {title && (
            <h2 id={titleId} className="text-xl font-bold text-green-900 break-words">
              {title}
            </h2>
          )}
          <button
            type="button"
            aria-label="Chiudi"
            onClick={onClose}
            className="ml-auto -mr-2 -mt-2 min-h-[44px] min-w-[44px] rounded-lg text-3xl leading-none text-gray-700 hover:text-gray-900"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

ModalDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
};

function Modal({ isOpen, ...props }) {
  return isOpen ? <ModalDialog {...props} /> : null;
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default Modal;
