import { writable } from 'svelte/store';

let nextId = 0;

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export const toasts = writable<ToastItem[]>([]);

export function addToast(message: string, type: ToastType = 'info', durationMs: number = 3500) {
  const id = nextId++;
  toasts.update(t => [...t, { id, message, type }]);
  if (durationMs > 0) {
    setTimeout(() => {
      removeToast(id);
    }, durationMs);
  }
  return id;
}

export function removeToast(id: number) {
  toasts.update(t => t.filter(toast => toast.id !== id));
}

export function toast(message: string) {
  addToast(message, 'info');
}

export function toastSuccess(message: string) {
  addToast(message, 'success');
}

export function toastError(message: string) {
  addToast(message, 'error', 6000);
}

export function toastWarning(message: string) {
  addToast(message, 'warning', 5000);
}
