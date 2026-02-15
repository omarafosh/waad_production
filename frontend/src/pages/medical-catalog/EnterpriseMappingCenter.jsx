import React, { useState } from 'react';
import {
    Box, Grid, Paper, Typography, TextField,
    List, ListItem, ListItemText, Chip,
    Button, CircularProgress, Divider, Stack
} from '@mui/material';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'utils/axios';

/**
 * Enterprise Mapping Center Component
 * 
 * Features:
 * - List of unmapped provider services
 * - Intelligent search in the master dictionary
 * - Real-time mapping suggestions from the Backend Engine
 */
const EnterpriseMappingCenter = () => {
    const [selectedRaw, setSelectedRaw] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Fetch suggestions for selected raw service
    const { data: suggestions, isLoading: loadingSuggestions } = useQuery({
        queryKey: ['mapping-suggestions', selectedRaw?.id],
        queryFn: async () => {
            const resp = await axios.get(`/api/v2/mappings/suggestions/${selectedRaw.id}`, {
                params: { rawName: selectedRaw.rawName, rawCode: selectedRaw.rawCode }
            });
            return resp.data;
        },
        enabled: !!selectedRaw
    });

    return (
        <Box sx={{ p: 3, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>مركز الربط المؤسسي (Mapping Center)</Typography>

            <Grid container spacing={4}>
                {/* Left: Provider Raw Services */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={2} sx={{ p: 2, height: '80vh', overflowY: 'auto' }}>
                        <Typography variant="h6" color="primary" gutterBottom>خدمات المزودين غير المربوطة</Typography>
                        {/* Sample Data Loop - Replace with real useQuery if needed */}
                        <List>
                            {[
                                { id: 1, rawName: 'تحليل سكر تراكمي', rawCode: 'SUGAR-HBA1C' },
                                { id: 2, rawName: 'أشعة صدر خلفية', rawCode: 'RAD-CHEST' }
                            ].map(item => (
                                <ListItem
                                    button
                                    key={item.id}
                                    selected={selectedRaw?.id === item.id}
                                    onClick={() => setSelectedRaw(item)}
                                    sx={{ borderRadius: 1, mb: 1 }}
                                >
                                    <ListItemText
                                        primary={item.rawName}
                                        secondary={`كود المزود: ${item.rawCode}`}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>

                {/* Middle & Right: Mapping Workspace */}
                <Grid item xs={12} md={8}>
                    {selectedRaw ? (
                        <Stack spacing={3}>
                            <Paper sx={{ p: 3, borderLeft: '5px solid #008080' }}>
                                <Typography variant="subtitle2" color="textSecondary">الخدمة المختارة للمزود</Typography>
                                <Typography variant="h5" fontWeight="bold">{selectedRaw.rawName}</Typography>
                                <Chip label={selectedRaw.rawCode} size="small" variant="outlined" sx={{ mt: 1 }} />
                            </Paper>

                            <Paper sx={{ p: 3 }}>
                                <Typography variant="h6" gutterBottom>مقترحات الربط الذكي</Typography>
                                <Divider sx={{ mb: 2 }} />

                                {loadingSuggestions ? (
                                    <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
                                ) : (
                                    <Stack spacing={2}>
                                        {suggestions?.map(suggestion => (
                                            <Paper
                                                variant="outlined"
                                                sx={{ p: 2, '&:hover': { bgcolor: '#f0f9ff', borderColor: 'primary.main' }, cursor: 'pointer' }}
                                            >
                                                <Grid container alignItems="center">
                                                    <Grid item xs={10}>
                                                        <Typography variant="subtitle1" fontWeight="bold">{suggestion.nameAr}</Typography>
                                                        <Typography variant="caption" color="textSecondary">
                                                            {suggestion.code} | المصدر: {suggestion.matchSource}
                                                        </Typography>
                                                    </Grid>
                                                    <Grid item xs={2} textAlign="right">
                                                        <Chip
                                                            label={`${Math.round(suggestion.confidenceScore * 100)}%`}
                                                            color={suggestion.confidenceScore > 0.8 ? "success" : "warning"}
                                                            size="small"
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Paper>
                                        ))}
                                    </Stack>
                                )}
                            </Paper>
                        </Stack>
                    ) : (
                        <Box display="flex" alignItems="center" justifyContent="center" height="60vh">
                            <Typography color="textSecondary">يرجى اختيار خدمة من القائمة اليمنى للبدء بالربط</Typography>
                        </Box>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};

export default EnterpriseMappingCenter;
