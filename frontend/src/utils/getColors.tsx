// ==============================|| CUSTOM FUNCTION - COLORS ||============================== //

import { Theme } from '@mui/material/styles';

export type ColorType = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

export default function getColors(theme: Theme, color?: ColorType): any {
  switch (color) {
    case 'secondary':
      return theme.palette.secondary;
    case 'error':
      return theme.palette.error;
    case 'warning':
      return theme.palette.warning;
    case 'info':
      return theme.palette.info;
    case 'success':
      return theme.palette.success;
    default:
      return theme.palette.primary;
  }
}
