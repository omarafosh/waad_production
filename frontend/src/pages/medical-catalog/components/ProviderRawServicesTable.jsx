import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Chip, Typography } from '@mui/material';
import GenericDataTable from 'components/GenericDataTable/GenericDataTable';
import { medicalCatalogService } from 'services/api/medical-catalog.service';

const ProviderRawServicesTable = () => {
    const [tableState, setTableState] = useState({
        page: 0,
        pageSize: 10,
        sorting: [],
        columnFilters: {},
        setPage: (p) => setTableState(prev => ({ ...prev, page: p })),
        setPageSize: (s) => setTableState(prev => ({ ...prev, page: 0, pageSize: s })),
        setSorting: (s) => setTableState(prev => ({ ...prev, sorting: s })),
        setFilter: (id, value) => setTableState(prev => ({ ...prev, page: 0, columnFilters: { ...prev.columnFilters, [id]: value } })),
        clearFilters: () => setTableState(prev => ({ ...prev, page: 0, columnFilters: {} })),
        hasActiveFilters: false
    });

    // For now using the unmapped services but displaying mapping status
    // In a real app, this would call a "search all raw services" endpoint
    const { data: response, isLoading } = useQuery({
        queryKey: ['raw-services', tableState.page, tableState.pageSize, tableState.columnFilters],
        queryFn: () => medicalCatalogService.getUnmappedServices({
            providerId: 1, // Default or selected provider
            page: tableState.page,
            size: tableState.pageSize,
            searchTerm: tableState.columnFilters.serviceName || ''
        })
    });

    const columns = useMemo(() => [
        {
            accessorKey: 'providerName',
            header: 'المزود',
            width: 150
        },
        {
            accessorKey: 'serviceCode',
            header: 'كود المزود',
            width: 120
        },
        {
            accessorKey: 'serviceName',
            header: 'الاسم كما ورد',
            minWidth: 250
        },
        {
            accessorKey: 'status',
            header: 'الحالة',
            width: 120,
            cell: ({ row }) => (
                <Chip
                    label={row.original.isMapped ? 'مربوط' : 'غير مربوط'}
                    size="small"
                    sx={{
                        bgcolor: row.original.isMapped ? 'success.lighter' : 'warning.lighter',
                        color: row.original.isMapped ? 'success.main' : 'warning.main',
                        fontWeight: 'bold'
                    }}
                />
            )
        }
    ], []);

    return (
        <Box sx={{ height: 600 }}>
            <GenericDataTable
                columns={columns}
                data={response?.data?.content || []}
                totalCount={response?.data?.totalElements || 0}
                isLoading={isLoading}
                tableState={{
                    ...tableState,
                    hasActiveFilters: Object.keys(tableState.columnFilters).length > 0
                }}
            />
        </Box>
    );
};

export default ProviderRawServicesTable;
