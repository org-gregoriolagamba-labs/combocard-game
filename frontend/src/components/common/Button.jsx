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
  const baseClasses = "min-h-[44px] font-bold rounded-xl transition shadow-md disabled:cursor-not-allowed disabled:border-transparent disabled:bg-notte-600 disabled:text-testo-3";
  
  const variantClasses = {
    primary: "bg-oro text-inchiostro-900 hover:bg-oro-dark",
    secondary: "border border-linea-forte bg-notte-700 text-testo hover:bg-notte-600",
    danger: "bg-coppe text-white hover:bg-oro-dark",
    outline: "border-2 border-linea-forte bg-notte-700 text-testo hover:bg-white",
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