/**
 * Input Component
 * * Reusable input component.
 */

import React from "react";

function Input({
  label,
  error,
  className = "",
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={props.id} 
          className="block text-sm font-medium text-green-900 mb-2"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 border-2 border-green-600 rounded-xl focus:border-green-800 focus:outline-none bg-white ${
          error ? "border-red-500" : ""
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

export default Input;