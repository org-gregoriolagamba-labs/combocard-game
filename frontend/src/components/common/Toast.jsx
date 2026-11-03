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
  success: "border border-white/20 bg-bastoni text-inchiostro-900",
  error: "border border-white/20 bg-coppe text-inchiostro-900",
  warning: "border border-white/20 bg-oro text-inchiostro-900",
  info: "border border-linea-forte bg-notte-700 text-testo",
  // A win of the player: the only notice that is not a log line
  win: "titolo border border-white/30 bg-oro text-inchiostro-900 shadow-alone",
};

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      className={`px-4 py-3 rounded-xl shadow-lg max-w-xs animate-estrai ${STYLES[toast.type] ?? STYLES.info}`}
      onClick={() => onRemove(toast.id)}
    >
      <p className={`[text-wrap:balance] ${toast.type === "win" ? "text-lg leading-snug" : "text-sm font-medium"}`}>{toast.message}</p>
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
