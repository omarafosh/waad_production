// ==============================|| OVERRIDES - TREE ITEM ||============================== //

export default function TreeItem() {
  return {
    MuiTreeItem: {
      styleOverrides: {
        content: {
          padding: 8
        },
        iconContainer: {
          '& svg': {
            fontSize: '1rem'
          }
        },
        label: {
          fontSize: '1rem',
          fontWeight: 500
        },
        groupTransition: {
          paddingLeft: 12
        }
      }
    }
  };
}
