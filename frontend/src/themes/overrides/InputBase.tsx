// ==============================|| OVERRIDES - INPUT BASE ||============================== //

export default function InputBase(theme) {
  return {
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: theme.typography.body1.fontSize,
          lineHeight: 1.6
        },
        sizeSmall: {
          fontSize: theme.typography.body2.fontSize
        },
        input: {
          '&::placeholder': {
            opacity: 0.7,
            fontSize: theme.typography.body1.fontSize
          }
        }
      }
    }
  };
}
