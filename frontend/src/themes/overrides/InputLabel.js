// ==============================|| OVERRIDES - INPUT LABEL ||============================== //

export default function InputLabel(theme) {
  const varsPalette = (theme.vars && theme.vars.palette) || theme.palette || {};
  return {
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: varsPalette.grey?.[600] ?? theme.palette.grey?.[600]
        },
        outlined: {
          lineHeight: '1.4375em',
          top: -2,
          '&.MuiInputLabel-sizeSmall': {
            lineHeight: '1.4375em',
            top: -2
          },
          '&.MuiInputLabel-shrink': {
            background: varsPalette.background?.paper ?? theme.palette.background?.paper,
            padding: '0 8px',
            marginLeft: -6,
            top: 2,
            lineHeight: '1rem'
          }
        }
      }
    }
  };
}
