import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Chip, Typography } from '@mui/material';
import GenericDataTable from 'components/GenericDataTable/GenericDataTable';
import { getMedicalServices } from 'services/api/medical-services.service';

const MasterCatalogTable = () => {
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

    const { data: response, isLoading } = useQuery({
        queryKey: ['master-catalog', tableState.page, tableState.pageSize, tableState.columnFilters],
        queryFn: () => getMedicalServices({
            page: tableState.page,
            size: tableState.pageSize,
            ...tableState.columnFilters
        })
    });

    const columns = useMemo(() => [
        {
            accessorKey: 'code',
            header: 'كود الخدمة',
            width: 120
        },
        {
            accessorKey: 'name',
            header: 'الاسم (عربي)',
            minWidth: 200
        },
        {
            accessorKey: 'nameEn',
            header: 'الاسم (إنجليزي)',
            minWidth: 200
        },
        {
            accessorKey: 'categoryName',
            header: 'التصنيف',
            width: 150
        },
        {
            accessorKey: 'requiresPA',
            header: 'موافقة مسبقة',
            width: 120,
            cell: ({ getValue }) => (
                <Chip
                    label={getValue() ? 'نعم' : 'لا'}
                    size="small"
                    color={getValue() ? 'error' : 'default'}
                    variant="outlined"
                />
            )
        },
        {
            accessorKey: 'basePrice',
            header: 'السعر المرجعي',
            width: 120,
            cell: ({ getValue }) => (
                <Typography variant="body2" fontWeight="bold">
                    {getValue()?.toLocaleString()} ر.س
                </Typography>
            )
        }
    ], []);

    return (
        <Box sx={{ height: 600 }}>
            <GenericDataTable
                columns={columns}
                data={response?.data || []}
                totalCount={response?.totalElements || 0}
                isLoading={isLoading}
                tableState={{
                    ...tableState,
                    hasActiveFilters: Object.keys(tableState.columnFilters).length > 0
                }}
            />
        </Box>
    );
};

export default MasterCatalogTable;
