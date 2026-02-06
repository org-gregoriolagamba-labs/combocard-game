/**
 * Button Component
 * * Reusable button component with variants.
 */

import React from "react";
import PropTypes from "prop-types";

function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false, // Destructured to prevent passing to DOM and enable logic
  className = "",
  ...props
}) {
  const baseClasses = "font-bold rounded-xl transition shadow-lg disabled:opacity-50";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-green-600 to-green-800 text-white hover:from-green-700 hover:to-green-900",
    secondary: "bg-gradient-to-r from-amber-500 to-amber-700 text-white hover:from-amber-600 hover:to-amber-800",
    danger: "bg-gradient-to-r from-red-500 to-red-700 text-white hover:from-red-600 hover:to-red-800",
    outline: "border-2 border-green-600 text-green-600 hover:bg-green-50",
  };
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
    xl: "px-8 py-4 text-xl",
  };

  return (
    <button
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${sizeClasses[size]} 
        ${fullWidth ? "w-full" : ""} 
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          {/* Added data-testid for testing */}
          <span 
            data-testid="loading-spinner"
            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" 
          />
          Caricamento...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(["primary", "secondary", "danger", "outline"]),
  size: PropTypes.oneOf(["sm", "md", "lg", "xl"]),
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;