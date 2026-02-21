import { create } from 'zustand';

// ==============================|| SNACKBAR API - STATE MANAGEMENT ||============================== //

export interface SnackbarProps {
  open?: boolean;
  message?: string;
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  variant?: 'default' | 'alert';
  alert?: {
    color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
    variant: 'standard' | 'filled' | 'outlined';
  };
  transition?: string;
  close?: boolean;
  actionButton?: boolean;
  maxStack?: number;
  dense?: boolean;
  iconVariant?: 'usedefault' | 'hide';
}

interface SnackbarState extends SnackbarProps {
  open: boolean;
}

/**
 * Zustand store for snackbar/notification state
 * Provides global snackbar control
 */
export const useSnackbarStore = create<SnackbarState>((set) => ({
  open: false,
  message: 'Note archived',
  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
  variant: 'default',
  alert: { color: 'primary', variant: 'filled' },
  transition: 'Fade',
  close: true,
  actionButton: false,
  maxStack: 3,
  dense: false,
  iconVariant: 'usedefault'
}));

/**
 * Hook to get snackbar state
 */
export const useGetSnackbar = () => {
  return useSnackbarStore();
};

/**
 * Open snackbar with custom options
 * @param {Object} options - Snackbar configuration
 */
export const openSnackbar = (options: SnackbarProps) => {
  useSnackbarStore.setState({
    open: true,
    ...options
  });
};

/**
 * Close snackbar
 */
export const closeSnackbar = () => {
  useSnackbarStore.setState({ open: false });
};

export default useSnackbarStore;

