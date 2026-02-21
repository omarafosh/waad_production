// ==============================|| OVERRIDES - DIALOG TITLE ||============================== //

export default function DialogTitle(theme) {
  return {
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: theme.typography.h5.fontSize,
          fontWeight: theme.typography.h5.fontWeight,
          lineHeight: theme.typography.h5.lineHeight,
          padding: '16px 24px'
        }
      }
    }
  };
}
