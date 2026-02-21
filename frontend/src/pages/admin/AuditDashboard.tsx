import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Card, CardContent } from '@mui/material';
import GenericDataTable from '../../common/GenericDataTable';

const AuditDashboard = () => {
    const [tabIndex, setTabIndex] = useState(0);

    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    // Columns for Entity History Log
    const historyColumns = [
        { id: 'entityType', label: 'الكيان', minWidth: 100 },
        { id: 'entityId', label: 'رقم الكيان', minWidth: 80 },
        { id: 'action', label: 'الإجراء', minWidth: 100 },
        { id: 'performedBy', label: 'بواسطة', minWidth: 150 },
        { id: 'performedAt', label: 'التاريخ', minWidth: 150, format: (val) => new Date(val).toLocaleString('ar-LY') },
        { id: 'correlationId', label: 'Trace ID', minWidth: 200 },
    ];

    // Columns for Lifecycle Log
    const lifecycleColumns = [
        { id: 'entityType', label: 'الكيان', minWidth: 100 },
        { id: 'entityId', label: 'رقم الكيان', minWidth: 80 },
        { id: 'action', label: 'الإجراء', minWidth: 100 },
        { id: 'previousStatus', label: 'الحالة السابقة', minWidth: 120 },
        { id: 'newStatus', label: 'الحالة الجديدة', minWidth: 120 },
        { id: 'reasonCode', label: 'كود السبب', minWidth: 120 },
        { id: 'performedBy', label: 'بواسطة', minWidth: 150 },
        { id: 'performedAt', label: 'التاريخ', minWidth: 150, format: (val) => new Date(val).toLocaleString('ar-LY') },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                لوحة مراقبة النظام والتدقيق
            </Typography>

            <Card>
                <CardContent>
                    <Tabs value={tabIndex} onChange={handleTabChange} sx={{ mb: 2 }}>
                        <Tab label="سجل تغييرات البيانات (Data Audit)" />
                        <Tab label="سجل دورة الحياة (Lifecycle Audit)" />
                    </Tabs>

                    {tabIndex === 0 && (
                        <GenericDataTable
                            columns={historyColumns}
                            dataUrl="/api/audit/history" // Requires Controller
                            title="سجل التغييرات الكامل"
                        />
                    )}

                    {tabIndex === 1 && (
                        <GenericDataTable
                            columns={lifecycleColumns}
                            dataUrl="/api/audit/lifecycle" // Requires Controller
                            title="سجل انتقالات الحالات"
                        />
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default AuditDashboard;
