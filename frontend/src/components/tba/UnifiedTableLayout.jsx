import React from 'react';
import PropTypes from 'prop-types';
import { Box, Stack, Divider, Paper } from '@mui/material';
import MainCard from 'components/MainCard';

/**
 * UnifiedTableLayout
 * 
 * Provides a standardized layout for pages with data tables.
 * Ensures no page-level scroll by using viewport-based heights.
 * 
 * Structure:
 * - Context Bar (Breadcrumbs + Actions)
 * - Filter Bar
 * - Table Content (Flex: 1, Overflow: hidden)
 */
const UnifiedTableLayout = ({
    breadcrumbs,
    actions,
    filters,
    children,
    headerHeight = 64,
    footerHeight = 64,
    contextBarHeight = 60,
    filterBarHeight = 60,
    sx = {}
}) => {
    // Total occupied height by elements outside the table area
    // calc(100vh - (Header + Footer + Navigation/Padding))
    const mainContentHeight = `calc(100vh - ${headerHeight + footerHeight + 20}px)`;

    return (
        <Box
            sx={{
                height: mainContentHeight,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                gap: 1,
                ...sx
            }}
        >
            {/* 1. Context Bar (Breadcrumbs & Fixed Actions) */}
            <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                    height: contextBarHeight,
                    flexShrink: 0,
                    px: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Box>{breadcrumbs}</Box>
                <Stack direction="row" spacing={1}>
                    {actions}
                </Stack>
            </Stack>

            {/* 2. Filter Bar */}
            {filters && (
                <Box
                    sx={{
                        flexShrink: 0,
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        p: 1
                    }}
                >
                    {filters}
                </Box>
            )}

            {/* 3. Data Table Area */}
            <Box
                sx={{
                    flexGrow: 1,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    position: 'relative'
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

UnifiedTableLayout.propTypes = {
    breadcrumbs: PropTypes.node,
    actions: PropTypes.node,
    filters: PropTypes.node,
    children: PropTypes.node.isRequired,
    headerHeight: PropTypes.number,
    footerHeight: PropTypes.number,
    contextBarHeight: PropTypes.number,
    filterBarHeight: PropTypes.number,
    sx: PropTypes.object
};

export default UnifiedTableLayout;
