// ==============================|| OVERRIDES - TABLE CELL ||============================== //

export default function TableCell(theme) {
  const varsPalette = (theme.vars && theme.vars.palette) || theme.palette || {};

  // Use dynamic font size from theme (User Preference)
  const cellFontSize = theme.typography.body1.fontSize;

  const commonCell = {
    // automation-scaling: Removed hardcoded rem
    // fontSize: '1rem', 
    textTransform: 'uppercase',
    '&:not(:last-of-type)': {
      backgroundImage: `linear-gradient(${varsPalette.divider ?? theme.palette.divider}, ${varsPalette.divider ?? theme.palette.divider})`,
      backgroundRepeat: 'no-repeat',
      /* 1px wide, shorter than full height */
      backgroundSize: '1px calc(100% - 30px)',
      /* 16px from top */
      backgroundPosition: 'right 16px'
    }
  };

  return {
    MuiTableCell: {
      styleOverrides: {
        root: ({ ownerState }) => {
          const baseStyle = {
            fontSize: theme.typography.body2.fontSize, // Dynamic scaling per user config
            padding: 16, // increased from 12px for better spacing
            borderColor: varsPalette.divider ?? theme.palette.divider,
            lineHeight: 1.6 // improved line height for Arabic text
          };

          const align = ownerState.align;

          if (align === 'right') {
            return {
              ...baseStyle,
              justifyContent: 'flex-end',
              textAlign: 'right',
              '& > *': {
                justifyContent: 'flex-end',
                margin: '0 0 0 auto'
              },
              '& .MuiOutlinedInput-input': {
                textAlign: 'right'
              }
            };
          }

          if (align === 'center') {
            return {
              ...baseStyle,
              justifyContent: 'center',
              textAlign: 'center',
              '& > *': {
                justifyContent: 'center',
                margin: '0 auto'
              }
            };
          }

          return baseStyle;
        },
        sizeSmall: {
          padding: 12,
          fontSize: theme.typography.body2.fontSize
        },
        head: {
          fontWeight: 700,
          fontSize: theme.typography.body2.fontSize,
          ...commonCell
        },
        footer: { ...commonCell }
      }
    }
  };
}
