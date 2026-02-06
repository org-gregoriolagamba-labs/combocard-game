/**
 * Loading Spinner Component
 * 
 * Displays a loading indicator.
 */

import React from "react";
import PropTypes from "prop-types";

function LoadingSpinner({ size = "md", className = "" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-4 border-green-200 border-t-green-600 rounded-full animate-spin`}
      />
    </div>
  );
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(["sm", "md", "lg", "xl"]),
  className: PropTypes.string,
};

export default LoadingSpinner;
