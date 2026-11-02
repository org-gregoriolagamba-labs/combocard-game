/**
 * Toast Component
 * 
 * Displays toast notifications. The region stays on the page even when it is
 * empty, so screen readers announce what appears in it: an error at once, the
 * rest politely. Each notice has its own timer.
 */

import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { useToast } from "../../hooks";

const STYLES = {
  success: "bg-green-700 text-white",
  error: "bg-red-700 text-white",
  warning: "bg-yellow-500 text-black",
  info: "bg-blue-700 text-white",
};

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className={`px-4 py-3 rounded-lg shadow-lg max-w-xs animate-fade-in ${STYLES[toast.type] ?? STYLES.info}`}
      onClick={() => onRemove(toast.id)}
    >
      <p className="text-sm font-medium [text-wrap:balance]">{toast.message}</p>
    </div>
  );
}

ToastItem.propTypes = {
  toast: PropTypes.shape({
    id: PropTypes.number.isRequired,
    message: PropTypes.string,
    type: PropTypes.string,
    duration: PropTypes.number,
  }).isRequired,
  onRemove: PropTypes.func.isRequired,
};

function Toast() {
  const { toasts, remove } = useToast();

  return (
    <div
      role="region"
      aria-label="Notifiche"
      aria-live="polite"
      className="fixed inset-x-4 bottom-40 z-50 flex flex-col items-center space-y-2 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:items-end"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={remove} />
      ))}
    </div>
  );
}

export default Toast;
