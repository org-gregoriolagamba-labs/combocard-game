/**
 * useToast Hook
 * 
 * Provides toast notification functionality using Redux.
 */

import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addToast, removeToast, clearToasts } from "../store/slices/uiSlice";

/**
 * Hook for managing toast notifications
 */
export function useToast() {
  const dispatch = useDispatch();
  const toasts = useSelector((state) => state.ui.toasts);

  const show = useCallback((message, type = "info", duration = 3000) => {
    dispatch(addToast({ message, type, duration }));
  }, [dispatch]);

  const success = useCallback((message, duration) => {
    show(message, "success", duration);
  }, [show]);

  const error = useCallback((message, duration) => {
    show(message, "error", duration);
  }, [show]);

  const info = useCallback((message, duration) => {
    show(message, "info", duration);
  }, [show]);

  const warning = useCallback((message, duration) => {
    show(message, "warning", duration);
  }, [show]);

  const remove = useCallback((id) => {
    dispatch(removeToast(id));
  }, [dispatch]);

  const clear = useCallback(() => {
    dispatch(clearToasts());
  }, [dispatch]);

  return {
    toasts,
    show,
    success,
    error,
    info,
    warning,
    remove,
    clear,
    // Legacy support
    addToast: show,
  };
}

export default useToast;
