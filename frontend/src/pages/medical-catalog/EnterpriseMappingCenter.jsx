import React, { useState } from 'react';
import {
    Box, Grid, Paper, Typography, TextField,
    List, ListItem, ListItemText, Chip,
    Button, CircularProgress, Divider, Stack,
    FormControl, InputLabel, Select, MenuItem,
    Alert, Snackbar
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'utils/axios';

/**
 * Enterprise Mapping Center Component
 * 
 * Features:
 * - List of unmapped provider services
 * - Medical category assignment for unmapped services
 * - Real-time mapping suggestions from the Backend Engine
 */
const EnterpriseMappingCenter = () => {
    const queryClient = useQueryClient();
    const [selectedRaw, setSelectedRaw] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // We assume providerId is 1 for demonstration if not provided (should be from context/URL)
    const providerId = 1;

    // 1. Fetch Categories (The 8 specific ones from Migration V31)
    const { data: categories } = useQuery({
        queryKey: ['medical-categories'],
        queryFn: async () => {
            const resp = await axios.get('/api/medical-categories/all');
            return resp.data.data || [];
        }
    });

    // 2. Fetch Raw Services for Provider
    const { data: rawServicesPage, isLoading: loadingServices } = useQuery({
        queryKey: ['provider-raw-services', providerId],
        queryFn: async () => {
            const resp = await axios.get('/api/catalog/services', {
                params: { providerId, mapped: false }
            });
            return resp.data;
        }
    });

    const rawServices = rawServicesPage?.content || [];

    // 3. Mutation to assign category
    const assignCategoryMutation = useMutation({
        mutationFn: async ({ rawId, categoryName }) => {
            return await axios.post(`/api/catalog/raw/${rawId}/category`, null, {
                params: { categoryName }
            });
        },
        onSuccess: () => {
            setSnackbar({ open: true, message: 'تم تحديث تصنيف الخدمة بنجاح', severity: 'success' });
            queryClient.invalidateQueries(['provider-raw-services']);
            setSelectedRaw(null);
            setSelectedCategory('');
        },
        onError: () => {
            setSnackbar({ open: true, message: 'فشل في تحديث التصنيف', severity: 'error' });
        }
    });

    const handleAssignCategory = () => {
        if (!selectedRaw || !selectedCategory) return;
        assignCategoryMutation.mutate({ rawId: selectedRaw.id, categoryName: selectedCategory });
    };

    return (
        <Box sx={{ p: 3, bgcolor: '#f5f7fa', minHeight: '100vh', direction: 'rtl' }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ textAlign: 'right' }}>
                مركز الربط المؤسسي (Mapping Center)
            </Typography>

            <Grid container spacing={4}>
                {/* Left: Provider Raw Services */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={2} sx={{ p: 2, height: '80vh', overflowY: 'auto' }}>
                        <Typography variant="h6" color="primary" gutterBottom sx={{ textAlign: 'right' }}>
                            خدمات المزودين غير المربوطة
                        </Typography>
                        {loadingServices ? (
                            <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box>
                        ) : (
                            <List>
                                {rawServices.map(item => (
                                    <ListItem
                                        button
                                        key={item.id}
                                        selected={selectedRaw?.id === item.id}
                                        onClick={() => {
                                            setSelectedRaw(item);
                                            setSelectedCategory(item.category || '');
                                        }}
                                        sx={{ borderRadius: 1, mb: 1, textAlign: 'right' }}
                                    >
                                        <ListItemText
                                            primary={item.serviceName}
                                            secondary={`كود المزود: ${item.serviceCode}`}
                                        />
                                        {item.category && <Chip label={item.category} size="small" color="secondary" sx={{ mr: 1 }} />}
                                    </ListItem>
                                ))}
                                {rawServices.length === 0 && (
                                    <Typography color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
                                        لا توجد خدمات غير مربوطة حالياً
                                    </Typography>
                                )}
                            </List>
                        )}
                    </Paper>
                </Grid>

                {/* Right: Mapping & Category Assignment Workspace */}
                <Grid item xs={12} md={8}>
                    {selectedRaw ? (
                        <Stack spacing={3}>
                            <Paper sx={{ p: 3, borderRight: '5px solid #008080' }}>
                                <Typography variant="subtitle2" color="textSecondary" sx={{ textAlign: 'right' }}>
                                    الخدمة المختارة للمزود
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" sx={{ textAlign: 'right' }}>{selectedRaw.serviceName}</Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                    <Chip label={selectedRaw.serviceCode} size="small" variant="outlined" />
                                </Box>
                            </Paper>

                            <Paper sx={{ p: 3 }}>
                                <Typography variant="h6" gutterBottom sx={{ textAlign: 'right' }}>تصنيف الخدمة (للتغطية والموافقات)</Typography>
                                <Divider sx={{ mb: 3 }} />

                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexDirection: 'row-reverse' }}>
                                    <FormControl fullWidth sx={{ textAlign: 'right' }}>
                                        <InputLabel id="category-select-label">اختر التصنيف</InputLabel>
                                        <Select
                                            labelId="category-select-label"
                                            value={selectedCategory}
                                            label="اختر التصنيف"
                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                        >
                                            {categories?.map((cat) => (
                                                <MenuItem key={cat.id} value={cat.name} sx={{ justifyContent: 'flex-end' }}>
                                                    {cat.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        onClick={handleAssignCategory}
                                        disabled={assignCategoryMutation.isLoading || !selectedCategory}
                                        sx={{ px: 4 }}
                                    >
                                        تأكيد التصنيف
                                    </Button>
                                </Box>
                                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block', textAlign: 'right' }}>
                                    * سيتم استخدام هذا التصنيف لتحديد قواعد التغطية في حال عدم وجود ربط مباشر مع القاموس الطبي الموحد
                                </Typography>
                            </Paper>
                        </Stack>
                    ) : (
                        <Box display="flex" alignItems="center" justifyContent="center" height="60vh">
                            <Typography color="textSecondary">يرجى اختيار خدمة من القائمة اليمنى للبدء بالتصنيف</Typography>
                        </Box>
                    )}
                </Grid>
            </Grid>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default EnterpriseMappingCenter;
