import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Avatar, Box, CircularProgress, Tooltip } from '@mui/material';
import { Star as VIPIcon, Bolt as FlashIcon } from '@mui/icons-material';

/**
 * MemberAvatar - Reusable Enterprise Component
 *
 * A robust component for displaying member photos with:
 * - Automatic URL resolution and cache busting
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

  // 1. Resolve effective photo URL with professional cache-busting
  useEffect(() => {
    if (member?.photoUrl) {
      // CRITICAL: Don't add timestamp to blob: or data: URLs (local previews) as it breaks them
      if (member.photoUrl.startsWith('blob:') || member.photoUrl.startsWith('data:')) {
        setPhotoUrl(member.photoUrl);
      } else {
        // Check if url already has a timestamp param to avoid duplication
        const hasTimestamp = member.photoUrl.includes('?t=') || member.photoUrl.includes('&t=');
        if (hasTimestamp) {
          setPhotoUrl(member.photoUrl);
        } else {
          const timestamp = refreshTrigger || new Date().getTime();
          setPhotoUrl(`${member.photoUrl}${member.photoUrl.includes('?') ? '&' : '?'}t=${timestamp}`);
        }
      }
      setImgError(false);
    } else {
      setPhotoUrl(null);
    }
  }, [member?.photoUrl, member?.id, refreshTrigger]);

  // 2. Derive initials for professional Fallback
  const getInitials = () => {
    if (!member?.fullName) return '?';
    return member.fullName.trim().charAt(0).toUpperCase();
  };

  const handleImageError = () => {
    // Suppress warning for expected 404s/fallbacks
    // console.debug(`[MemberAvatar] Failed to load image for: ${member?.fullName}`);
    setImgError(true);
    setLoading(false);
  };

  const handleLoadStart = () => setLoading(true);
  const handleLoadEnd = () => setLoading(false);

  // 3. Render logic
  return (
    <Box sx={{ position: 'relative', width: size, height: size, display: 'inline-flex' }}>
      <Avatar
        src={imgError ? undefined : photoUrl}
        alt={member?.fullName}
        onError={handleImageError}
        onLoad={handleLoadEnd}
        sx={{
          width: size,
          height: size,
          fontSize: typeof size === 'number' ? size * 0.45 : '1rem',
          bgcolor: 'primary.lighter',
          color: 'primary.main',
          fontWeight: 'bold',
          border: '2px solid',
          borderColor: 'primary.light',
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
