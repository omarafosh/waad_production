// ==============================|| OVERRIDES - ICON BUTTON ||============================== //

export default function IconButton(theme) {
  return {
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontSize: '1.2rem',
          '&.MuiIconButton-loading': {
            pointerEvents: 'none !important',
            '& svg': {
              width: 'inherit !important',
              height: 'inherit !important'
            }
          }
        },
        sizeLarge: {
          width: theme.spacing(5.5),
          height: theme.spacing(5.5),
          fontSize: '1.4rem' // Slightly larger for large buttons if needed, or keep 1.2rem
        },
        sizeMedium: {
          width: theme.spacing(4.5),
          height: theme.spacing(4.5),
          fontSize: '1.2rem'
        },
        sizeSmall: {
          width: theme.spacing(3.75),
          height: theme.spacing(3.75),
          fontSize: '1.2rem'
        }
      }
    }
  };
}
