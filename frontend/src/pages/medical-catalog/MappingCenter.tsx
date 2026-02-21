import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { AutoFixHigh as AutoFixIcon } from '@mui/icons-material';

// Components
import ModernPageHeader from 'components/UnifiedPageHeader';
import GisirMappingWorkspace from './components/GisirMappingWorkspace';

const MappingCenter = () => {
    // Current brand theme colors
    const primaryTeal = '#008080';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            {/* Header Area */}
            <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
                <ModernPageHeader
                    title="نافذة ربط الخدمات الطبية (جسـر)"
                    subtitle="الربط الذكي بين خدمات المزودين والقاموس الموحد لنظام TPA"
                    icon={AutoFixIcon}
                    breadcrumbs={[
                        { label: 'الرئيسية', path: '/' },
                        { label: 'إدارة الخدمات', path: '/medical-services' },
                        { label: 'نافذة الربط الموحد' }
                    ]}
                    showAddButton={false}
                />
            </Box>

            {/* Main Mapping Workspace */}
            <Box sx={{ flexGrow: 1, overflow: 'hidden', bgcolor: '#F0F2F5' }}>
                <GisirMappingWorkspace />
            </Box>

            {/* Optional: Footer or Status Bar can be added here */}
        </Box>
    );
};

export default MappingCenter;
