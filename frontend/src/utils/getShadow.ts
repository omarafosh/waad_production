// ==============================|| CUSTOM FUNCTION - COLOR SHADOWS ||============================== //

import { Theme } from '@mui/material/styles';

export type ShadowType = 
  | 'primary' 
  | 'secondary' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'success'
  | 'primaryButton'
  | 'secondaryButton'
  | 'errorButton'
  | 'warningButton'
  | 'infoButton'
  | 'successButton';

export default function getShadow(theme: Theme, shadow?: ShadowType): string {
  const customShadows = (theme.vars as any)?.customShadows || (theme as any).customShadows;
  if (!customShadows) return 'none';

  switch (shadow) {
    case 'secondary':
      return customShadows.secondary;
    case 'error':
      return customShadows.error;
    case 'warning':
      return customShadows.warning;
    case 'info':
      return customShadows.info;
    case 'success':
      return customShadows.success;
    case 'primaryButton':
      return customShadows.primaryButton;
    case 'secondaryButton':
      return customShadows.secondaryButton;
    case 'errorButton':
      return customShadows.errorButton;
    case 'warningButton':
      return customShadows.warningButton;
    case 'infoButton':
      return customShadows.infoButton;
    case 'successButton':
      return customShadows.successButton;
    default:
      return customShadows.primary;
  }
}
