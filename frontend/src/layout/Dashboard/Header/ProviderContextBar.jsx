import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { providersService } from 'services/api/providers.service';

// material-ui
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';

// icons
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BusinessIcon from '@mui/icons-material/Business';
import DomainIcon from '@mui/icons-material/Domain';

import useAuth from 'hooks/useAuth';
import { ROLES } from 'constants/permissions.constants';

const ProviderContextBar = () => {
    const theme = useTheme();
    const { user } = useAuth();
    // Allow SUPER_ADMIN to see the bar for debugging/monitoring if they are on provider pages
    const isProvider = user?.roles?.some(role => role === ROLES.PROVIDER) || user?.roles?.includes('SUPER_ADMIN');

    // 1. Determine ID (Robust check)
    // If Admin, they won't have providerId, so we might show placeholders or handle gracefully
    const providerId = user?.providerId || user?.entityId || user?.pId;

    // 2. Fetch Provider Details
    const { data: providerDetails, isLoading } = useQuery({
        queryKey: ['header-provider-context', providerId],
        queryFn: async () => {
            if (!providerId) return null;
            return providersService.getById(providerId);
        },
        enabled: isProvider && !!providerId,
        staleTime: 1000 * 60 * 5 // 5 minutes
    });

    const badges = useMemo(() => {
        if (!providerDetails) return null;

        // 1. Global Network
        if (providerDetails.allowAllEmployers) {
            return (
                <Chip
                    icon={<VerifiedUserIcon sx={{ fontSize: '1rem !important' }} />}
                    label="الشبكة العامة"
                    color="success"
                    size="small"
                    variant="filled"
                    sx={{ height: 24, fontWeight: 'bold' }}
                />
            );
        }

        const names = providerDetails.contractedEmployerNames || [];

        // Check for string-based Global Network
        if (names.some(n => n.includes('الشبكة العامة'))) {
            return (
                <Chip
                    icon={<VerifiedUserIcon sx={{ fontSize: '1rem !important' }} />}
                    label="الشبكة العامة"
                    color="success"
                    size="small"
                    variant="filled"
                    sx={{ height: 24, fontWeight: 'bold' }}
                />
            );
        }

        // 2. Not Contracted
        if (names.length === 0) {
            return (
                <Chip
                    label="غير متعاقد"
                    color="warning" // Changed to warning for visibility
                    size="small"
                    variant="outlined"
                    sx={{ height: 24 }}
                />
            );
        }

        // 3. Contracted Companies
        return (
            <Stack direction="row" spacing={0.5}>
                {names.slice(0, 3).map((name, idx) => (
                    <Tooltip key={idx} title={name}>
                        <Chip
                            icon={<BusinessIcon sx={{ fontSize: '0.9rem !important' }} />}
                            label={name}
                            color="info"
                            size="small"
                            variant="outlined"
                            sx={{ height: 24, maxWidth: 150 }}
                        />
                    </Tooltip>
                ))}
                {names.length > 3 && (
                    <Tooltip title={names.slice(3).join('، ')}>
                        <Chip
                            label={`+${names.length - 3}`}
                            size="small"
                            color="info"
                            variant="filled"
                            sx={{ height: 24, minWidth: 24, px: 0.5 }}
                        />
                    </Tooltip>
                )}
            </Stack>
        );
    }, [providerDetails]);

    // 3. Fallback for Names if missing in details but present in user (unlikely but safe)
    const displayNames = providerDetails?.contractedEmployerNames || [];

    // ✅ Always show bar if isProvider, handle loading within
    if (!isProvider) return null;

    return (
        <Box
            sx={{
                width: '100%',
                bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'grey.50',
                borderBottom: `1px solid ${theme.palette.divider}`,
                py: 1,
                px: { xs: 2, sm: 3 },
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                zIndex: 1100, // Below Header (1200)
                boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
                minHeight: 48 // Ensure height even if empty
            }}
        >
            {/* Icon */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: 'primary.lighter',
                    color: 'primary.main'
                }}
            >
                <LocalHospitalIcon />
            </Box>

            {/* Provider Name */}
            <Typography variant="h6" color="text.primary" sx={{ fontWeight: 600 }}>
                {isLoading ? (
                    <Skeleton width={150} />
                ) : (
                    user?.providerName || providerDetails?.name || (user?.roles?.includes('SUPER_ADMIN') ? 'عرض المسؤول (Admin)' : 'مقدم خدمة')
                )}
            </Typography>

            <Divider orientation="vertical" flexItem sx={{ height: 20, alignSelf: 'center' }} />

            {/* Provider Type */}
            <Stack direction="row" alignItems="center" spacing={0.5}>
                <DomainIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                    {isLoading ? <Skeleton width={80} /> : (providerDetails?.providerTypeLabel || 'مقدم خدمة طبية')}
                </Typography>
            </Stack>

            <Divider orientation="vertical" flexItem sx={{ height: 20, alignSelf: 'center' }} />

            {/* Badges */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {isLoading ? (
                    <Skeleton width={120} />
                ) : (
                    badges || (
                        // Show something if no badges found but loaded
                        (!badges && !isLoading && displayNames.length === 0) ? (
                            <Chip label="لا توجد جهات متعاقدة" size="small" variant="outlined" color="default" sx={{ opacity: 0.7 }} />
                        ) : null
                    )
                )}
            </Box>
        </Box>
    );
};

export default ProviderContextBar;
