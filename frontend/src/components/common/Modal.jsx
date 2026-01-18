/**
 * Modal Component
 * 
 * Reusable modal dialog component.
 */

import React from "react";

function Modal({ isOpen, onClose, title, children, className = "" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        className={`relative bg-amber-50 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border-4 border-amber-600 ${className}`}
      >
        {/* Header */}
        {title && (
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-green-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        )}
        
        {/* Content */}
        {children}
      </div>
    </div>
  );
}

export default Modal;
