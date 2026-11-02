/**
 * Input Component
 *
 * A labelled field. The label is always tied to the field, with the id given
 * or one made here, and an error is announced and described by it.
 */

import React, { useId } from "react";
import PropTypes from "prop-types";

function Input({
  label,
  error,
  className = "",
  id: idProp,
  ...props
}) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-green-900 mb-2"
        >
          {label}
          {props.required && <span className="text-red-700 ml-1">*</span>}
        </label>
      )}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full px-4 py-3 border-2 border-green-700 rounded-xl placeholder:text-gray-600 focus:border-green-900 focus:outline-none focus:ring-2 focus:ring-green-700 bg-white ${
          error ? "border-red-700" : ""
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}

Input.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  className: PropTypes.string,
  id: PropTypes.string,
  required: PropTypes.bool,
};

export default Input;
