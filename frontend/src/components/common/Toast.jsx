/**
 * Toast Component
 * 
 * Displays toast notifications.
 */

import React, { useEffect } from "react";
import { useToast } from "../../hooks";

function Toast() {
  const { toasts, remove } = useToast();

  useEffect(() => {
    toasts.forEach((toast) => {
      const timer = setTimeout(() => {
        remove(toast.id);
      }, toast.duration || 3000);

      return () => clearTimeout(timer);
    });
  }, [toasts, remove]);

  if (toasts.length === 0) return null;

  const getToastStyles = (type) => {
    switch (type) {
      case "success":
        return "bg-green-500 text-white";
      case "error":
        return "bg-red-500 text-white";
      case "warning":
        return "bg-yellow-500 text-black";
      case "info":
      default:
        return "bg-blue-500 text-white";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg max-w-xs animate-fade-in ${getToastStyles(
            toast.type
          )}`}
          onClick={() => remove(toast.id)}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}

export default Toast;
