// ==============================|| OVERRIDES - TABLE PAGINATION ||============================== //

export default function TablePagination() {
  return {
    MuiTablePagination: {
      styleOverrides: {
        selectLabel: {
          fontSize: '1rem'
        },
        displayedRows: {
          fontSize: '1rem'
        }
      }
    }
  };
}
