import React, { useState } from 'react';
import axios from 'utils/axios';

// material-ui
import {
    Button,
    Grid,
    Typography,
    Stack,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Box,
    Chip,
    Alert,
    AlertTitle
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// project imports
import MainCard from 'components/MainCard';
import AnimateButton from 'components/@extended/AnimateButton';

const MedicalServiceSandbox = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError(null);
            setResult(null);
        }
    };

    const handlePreview = async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/api/admin/sandbox/import/medical-services/preview', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setResult(response.data);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Error occurred during preview');
        } finally {
            setLoading(false);
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'NEW': return 'success';
            case 'UPDATE': return 'warning';
            case 'ERROR': return 'error';
            default: return 'default';
        }
    };

    const getRowStyle = (type, theme) => {
        switch (type) {
            case 'NEW': return { backgroundColor: 'rgba(76, 175, 80, 0.08)' }; // Light Green
            case 'UPDATE': return { backgroundColor: 'rgba(255, 152, 0, 0.08)' }; // Light Orange
            case 'ERROR': return { backgroundColor: 'rgba(244, 67, 54, 0.08)' }; // Light Red
            default: return {};
        }
    };

    return (
        <MainCard title="Sandbox: Experimental Import Engine" subheader="Safe Mode - No Database Changes">
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Alert severity="info">
                        <AlertTitle>How it works</AlertTitle>
                        Upload <strong>price.xlsx</strong> to verify "Smart Import" logic.
                        Green rows = New Services. Orange rows = Updates (Price/Name).
                        No changes will be saved to the database in this mode.
                    </Alert>
                </Grid>

                {/* Upload Section */}
                <Grid item xs={12}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Button
                            component="label"
                            variant="outlined"
                            startIcon={<CloudUploadIcon />}
                            sx={{ marginRight: '1rem' }}
                        >
                            Select Excel File
                            <input type="file" hidden accept=".xlsx, .xls" onChange={handleFileChange} />
                        </Button>
                        <Typography variant="body1">{file ? file.name : 'No file selected'}</Typography>

                        <AnimateButton>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handlePreview}
                                disabled={!file || loading}
                            >
                                {loading ? 'Analyzing...' : 'Run Preview'}
                            </Button>
                        </AnimateButton>
                    </Stack>
                </Grid>

                {loading && (
                    <Grid item xs={12}>
                        <LinearProgress />
                    </Grid>
                )}

                {error && (
                    <Grid item xs={12}>
                        <Alert severity="error">{error}</Alert>
                    </Grid>
                )}

                {/* Results Section */}
                {result && (
                    <Grid item xs={12}>
                        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                            <Chip label={`Total: ${result.totalRecords}`} variant="outlined" />
                            <Chip label={`New: ${result.newServices}`} color="success" />
                            <Chip label={`Updates: ${result.updatedServices}`} color="warning" />
                            <Chip label={`Unchanged: ${result.unchangedServices}`} />
                            <Chip label={`Errors: ${result.errorCount}`} color="error" />
                        </Stack>

                        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Row</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Code</TableCell>
                                        <TableCell>Name (Arabic)</TableCell>
                                        <TableCell>Category</TableCell>
                                        <TableCell>Price Change</TableCell>
                                        <TableCell>Notes</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {result.changes.map((change, index) => (
                                        <TableRow key={index} sx={getRowStyle(change.changeType)}>
                                            <TableCell>{change.rowNumber}</TableCell>
                                            <TableCell>
                                                <Chip label={change.changeType} size="small" color={getTypeColor(change.changeType)} />
                                            </TableCell>
                                            <TableCell>{change.serviceCode}</TableCell>
                                            <TableCell>
                                                <Stack>
                                                    <Typography variant="body2">{change.serviceName}</Typography>
                                                    {change.oldName && change.oldName !== change.serviceName && (
                                                        <Typography variant="caption" color="textSecondary" sx={{ textDecoration: 'line-through' }}>
                                                            {change.oldName}
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </TableCell>
                                            <TableCell>{change.category}</TableCell>
                                            <TableCell>
                                                {change.changeType === 'UPDATE' && change.oldPrice && change.newPrice ? (
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Typography variant="body2" color="error" sx={{ textDecoration: 'line-through' }}>
                                                            {change.oldPrice}
                                                        </Typography>
                                                        <Typography variant="body2">→</Typography>
                                                        <Typography variant="body2" color="success">
                                                            {change.newPrice}
                                                        </Typography>
                                                    </Stack>
                                                ) : change.newPrice}
                                            </TableCell>
                                            <TableCell>{change.notes}</TableCell>
                                        </TableRow>
                                    ))}
                                    {result.changes.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center">
                                                No changes detected in the file.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Grid>
                )}
            </Grid>
        </MainCard>
    );
};

export default MedicalServiceSandbox;
