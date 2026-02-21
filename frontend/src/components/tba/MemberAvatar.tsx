import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Avatar, Box, CircularProgress, Tooltip } from '@mui/material';
import { Star as VIPIcon, Bolt as FlashIcon } from '@mui/icons-material';
import axios from 'utils/axios';

/**
 * MemberAvatar - Reusable Enterprise Component
 * 
 * A robust component for displaying member photos with:
 * - Automatic URL resolution and JWT-aware fetching
 * - Graceful fallback to name initials
 * - Loading states and error handling
 * - Theme-consistent styling
 * 
 * @param {Object} props
 * @param {Object} props.member - Member data object
 * @param {number|string} [props.size=40] - Avatar size
 * @param {Object} [props.sx] - Additional MUI styles
 * @param {string} [props.refreshTrigger] - Optional seed to force refresh
 */
const MemberAvatar = ({ member, size = 40, sx = {}, refreshTrigger }) => {
    const [imgError, setImgError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [photoUrl, setPhotoUrl] = useState(null);

    // 1. Resolve effective photo URL and Fetch if needed
    useEffect(() => {
        let isMounted = true;
        let objectUrl = null;

        const loadPhoto = async () => {
            const rawPath = member?.photoUrl || member?.profilePhotoPath || member?.photoPath || member?.imagePath;
            let effectiveUrl = null;

            if (rawPath) {
                effectiveUrl = rawPath;
            } else if (member?.id) {
                effectiveUrl = `/api/unified-members/${member.id}/photo`;
            }

            if (!effectiveUrl) {
                if (isMounted) setPhotoUrl(null);
                return;
            }

            // A. Handle Local Previews (Blobs/Data URLs)
            if (effectiveUrl.startsWith('blob:') || effectiveUrl.startsWith('data:')) {
                if (isMounted) {
                    setPhotoUrl(effectiveUrl);
                    setImgError(false);
                }
                return;
            }

            // B. Resolve Relative API Paths
            if (effectiveUrl.startsWith('/') && !effectiveUrl.startsWith('//')) {
                const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
                if (effectiveUrl.startsWith('/api/') && baseUrl.endsWith('/api')) {
                    effectiveUrl = baseUrl + effectiveUrl.replace('/api', '');
                } else if (!effectiveUrl.startsWith('/api/') && !baseUrl.endsWith('/api')) {
                    effectiveUrl = `${baseUrl}/api${effectiveUrl}`;
                } else {
                    effectiveUrl = baseUrl + effectiveUrl;
                }
            }

            // C. Fetch with JWT if it's an API URL (Stateless JWT Security)
            try {
                if (isMounted) setLoading(true);

                // Add cache busting
                if (!effectiveUrl.includes('?t=')) {
                    const sep = effectiveUrl.includes('?') ? '&' : '?';
                    effectiveUrl += `${sep}t=${refreshTrigger || new Date().getTime()}`;
                }

                // SECURE FETCH: Using axios ensures the Bearer Token is attached
                const response = await axios.get(effectiveUrl, { responseType: 'blob' });

                if (isMounted) {
                    objectUrl = URL.createObjectURL(response.data);
                    setPhotoUrl(objectUrl);
                    setImgError(false);
                }
            } catch (error) {
                console.debug('[MemberAvatar] Photo fetch failed:', effectiveUrl);
                if (isMounted) setImgError(true);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadPhoto();

        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [member?.photoUrl, member?.profilePhotoPath, member?.photoPath, member?.id, refreshTrigger]);

    // 2. Derive initials for professional Fallback
    const getInitials = () => {
        if (!member?.fullName) return '?';
        const parts = member.fullName.trim().split(' ');
        if (parts.length > 1) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return member.fullName.trim().charAt(0).toUpperCase();
    };

    const handleLoadEnd = () => setLoading(false);

    // 3. Render logic
    return (
        <Box sx={{ position: 'relative', width: size, height: size, display: 'inline-flex', verticalAlign: 'middle' }}>
            <Avatar
                src={imgError ? undefined : photoUrl}
                alt={member?.fullName}
                onLoad={handleLoadEnd}
                sx={{
                    width: size,
                    height: size,
                    fontSize: typeof size === 'number' ? size * 0.4 : '0.875rem',
                    bgcolor: 'primary.lighter',
                    color: 'primary.main',
                    fontWeight: 600,
                    border: '1.5px solid',
                    borderColor: 'primary.light',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    ...sx
                }}
            >
                {getInitials()}
            </Avatar>

            {loading && (
                <CircularProgress
                    size={size}
                    thickness={2}
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 1,
                        color: 'primary.main',
                        opacity: 0.5
                    }}
                />
            )}

            {/* VIP/Urgent Badges */}
            {member?.isVip && (
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        bgcolor: '#ffc107',
                        borderRadius: '50%',
                        width: size * 0.35,
                        height: size * 0.35,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 1,
                        border: '1.5px solid #fff',
                        zIndex: 2
                    }}
                >
                    <VIPIcon sx={{ color: '#fff', fontSize: size * 0.25 }} />
                </Box>
            )}
            {!member?.isVip && member?.isUrgent && (
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        bgcolor: '#ff5722',
                        borderRadius: '50%',
                        width: size * 0.35,
                        height: size * 0.35,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 1,
                        border: '1.5px solid #fff',
                        zIndex: 2
                    }}
                >
                    <FlashIcon sx={{ color: '#fff', fontSize: size * 0.25 }} />
                </Box>
            )}
        </Box>
    );
};

MemberAvatar.propTypes = {
    member: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        fullName: PropTypes.string,
        photoUrl: PropTypes.string
    }),
    size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    sx: PropTypes.object,
    refreshTrigger: PropTypes.string
};

export default MemberAvatar;
