import React, { useEffect, useState } from 'react';

// MUI Components
import { Button, Stack, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { Delete as DeleteIcon, FileDownload as ExportIcon, FileUpload as ImportIcon, Description as TemplateIcon, People as PeopleIcon } from '@mui/icons-material';

// Project Components
import MainCard from 'components/MainCard';
import UnifiedPageHeader from 'components/UnifiedPageHeader';
import GenericDataTable from 'components/GenericDataTable/GenericDataTable';
import { useMembersV3 } from '../hooks/useMembers.v3';

/**
 * Unified Member List Page (V3).
 * Showcase for Clean Architecture on the Frontend.
 */
const MemberListV3: React.FC = () => {
    const {
        members,
        loading,
        fetchMembers,
        deleteMember,
        exportMembers,
        downloadTemplate,
        importMembers
    } = useMembersV3();

    const [importLoading, setImportLoading] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImportLoading(true);
            try {
                await importMembers(file);
                // Success alert would go here
            } catch (err) {
                // Error alert would go here
            } finally {
                setImportLoading(false);
            }
        }
    };

    const columns = [
        {
            header: 'Full Name',
            accessorKey: 'fullName',
            cell: (info: any) => (
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1">{info.getValue()}</Typography>
                    {info.row.original.parent && (
                        <Chip label="Dependent" size="small" color="secondary" variant="outlined" />
                    )}
                    {!info.row.original.parent && (
                        <Chip label="Principal" size="small" color="primary" variant="outlined" />
                    )}
                </Stack>
            )
        },
        {
            header: 'Civil ID',
            accessorKey: 'civilId'
        },
        {
            header: 'Card Number',
            accessorKey: 'cardNumber'
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (info: any) => (
                <Chip
                    label={info.getValue()}
                    color={info.getValue() === 'ACTIVE' ? 'success' : 'warning'}
                    size="small"
                />
            )
        },
        {
            header: 'Actions',
            id: 'actions',
            cell: (info: any) => (
                <Tooltip title="Delete (Soft Delete)">
                    <IconButton color="error" onClick={() => deleteMember(info.row.original.id)}>
                        <DeleteIcon />
                    </IconButton>
                </Tooltip>
            )
        }
    ];

    const additionalActions = (
        <Stack direction="row" spacing={1}>
            <Button
                variant="outlined"
                startIcon={<TemplateIcon />}
                onClick={downloadTemplate}
            >
                Template
            </Button>
            <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={exportMembers}
            >
                Export
            </Button>
            <Button
                variant="contained"
                component="label"
                startIcon={<ImportIcon />}
                disabled={importLoading}
            >
                Import
                <input type="file" hidden onChange={handleImport} accept=".xlsx, .xls" />
            </Button>
        </Stack>
    );

    return (
        <>
            <UnifiedPageHeader
                title="Unified Member Management"
                subtitle="Clean Architecture (V3) - Principals & Dependents"
                icon={PeopleIcon}
                onAddClick={() => { /* Navigate to Form */ }}
                additionalActions={additionalActions}
            />

            <MainCard content={false} sx={{ mt: 2 }}>
                <GenericDataTable
                    data={members}
                    columns={columns}
                    loading={loading || importLoading}
                />
            </MainCard>
        </>
    );
};

export default MemberListV3;
