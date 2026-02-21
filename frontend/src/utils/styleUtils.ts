/**
 * Shared Style Utilities for the UI
 */

import { Theme } from '@mui/material/styles';

export type HeaderButtonType = 'add' | 'export' | 'excel' | 'delete' | 'import';

/**
 * Common Header Button Style used across List pages
 * Standardizes Add, Export, and Delete buttons in headers.
 *
 * @param {HeaderButtonType} type - 'add' | 'export' | 'excel' | 'delete' | 'import'
 * @param {Theme} theme - MUI Theme object
 * @returns {object} sx styles
 */
export const headerButtonStyle = (type: HeaderButtonType, theme: Theme) => {
    const isAdd = type === 'add';
    const isExcel = type === 'excel' || type === 'export';
    const isDelete = type === 'delete';

    let color = theme.palette.primary.main;
    if (isExcel) color = theme.palette.success.main;
    if (isDelete) color = theme.palette.error.main;

    return {
        minWidth: '140px',
        color: isAdd ? '#fff' : color,
        borderColor: color,
        backgroundColor: isAdd ? color : 'transparent',
        '&:hover': {
            backgroundColor: isAdd ? theme.palette.primary.dark : `${color}10`,
            borderColor: isAdd ? theme.palette.primary.dark : color
        },
        '&.MuiButton-contained': {
            color: '#fff',
            backgroundColor: color,
            '&:hover': {
                backgroundColor: isDelete ? theme.palette.error.dark : (isExcel ? theme.palette.success.dark : theme.palette.primary.dark)
            }
        },
        fontWeight: theme.typography.button.fontWeight,
        fontSize: theme.typography.button.fontSize,
        whiteSpace: 'nowrap',
        px: 2,
        height: '38px',
        transition: 'all 0.2s'
    };
};
