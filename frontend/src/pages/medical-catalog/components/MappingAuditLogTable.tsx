import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Chip,
    Typography
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';

import { GenericDataTable } from 'components/tba';
import axios from 'utils/axios';

const MappingAuditLogTable = () => {
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
        queryKey: ['mapping-audit-logs', tableState.page, tableState.pageSize],
        queryFn: async () => {
            const res = await axios.get('/catalog/audit', {
                params: {
                    page: tableState.page,
                    size: tableState.pageSize
                }
            });
            return res.data;
        }
    });

    const columns = [
        {
            accessorKey: 'id',
            header: 'معرف السجل',
            width: 100
        },
        {
            accessorKey: 'reasonCode',
            header: 'سبب التغيير',
            cell: ({ getValue }) => (
                <Chip
                    label={getValue() || 'تحديث يدوي'}
                    size="small"
                    variant="outlined"
                    color="info"
                />
            )
        },
        {
            accessorKey: 'createdBy', // Entity field is createdBy
            header: 'قام بالتعديل',
        },
        {
            accessorKey: 'createdAt', // Entity field is createdAt
            header: 'تاريخ التعديل',
            cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleString('ar-EG') : '-'
        }
    ];

    return (
        <Box sx={{ height: 600 }}>
            <GenericDataTable
                columns={columns}
                data={response?.content || []}
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

export default MappingAuditLogTable;
