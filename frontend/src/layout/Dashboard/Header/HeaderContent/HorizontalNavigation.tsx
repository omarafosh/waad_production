import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useAuth from 'hooks/useAuth';

// Material-UI
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Paper,
  Stack,
  alpha
} from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';

// Project imports
import useRBACSidebar from 'hooks/useRBACSidebar';

/**
 * HorizontalNavigation - شريط تنقل أفقي احترافي
 * 
 * يعرض المجموعات الرئيسية كأزرار في الأعلى، مع dropdown للصفحات الفرعية
 */
export default function HorizontalNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Hook to check user role
  const { sidebarGroups, roles } = useRBACSidebar();
  const [anchorEls, setAnchorEls] = useState({});

  // ... (handlers remain the same) ...
  // فتح dropdown menu
  const handleMenuOpen = (groupId, event) => {
    setAnchorEls({ ...anchorEls, [groupId]: event.currentTarget });
  };

  // إغلاق dropdown menu
  const handleMenuClose = (groupId) => {
    const newAnchors = { ...anchorEls };
    delete newAnchors[groupId];
    setAnchorEls(newAnchors);
  };

  // التنقل إلى صفحة
  const handleNavigate = (url, groupId) => {
    navigate(url);
    handleMenuClose(groupId);
  };

  // التحقق إذا كانت الصفحة نشطة
  const isActive = (url) => {
    if (!url) return false;
    return location.pathname === url || location.pathname.startsWith(url + '/');
  };

  // التحقق إذا كانت المجموعة نشطة
  const isGroupActive = (group) => {
    if (!group.children) return false;
    return group.children.some(child => {
      if (child.type === 'item') {
        return isActive(child.url);
      }
      if (child.type === 'collapse' && child.children) {
        return child.children.some(subChild => isActive(subChild.url));
      }
      return false;
    });
  };

  // عرض عنصر قائمة فرعية
  const renderMenuItem = (item, groupId) => {
    if (!item || !item.url) return null;

    const active = isActive(item.url);
    const Icon = item.icon;

    return (
      <MenuItem
        key={item.id}
        onClick={() => handleNavigate(item.url, groupId)}
        sx={{
          py: 1,
          px: 2,
          minWidth: 220,
          borderRadius: 1,
          mx: 0.5,
          my: 0.25,
          backgroundColor: active ? 'primary.lighter' : 'transparent',
          color: active ? 'primary.main' : 'text.primary',
          '&:hover': {
            backgroundColor: active ? 'primary.lighter' : 'action.hover'
          }
        }}
      >
        {Icon && (
          <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
            <Icon sx={{ fontSize: '1.25rem' }} />
          </ListItemIcon>
        )}
        <ListItemText
          primary={item.title}
          primaryTypographyProps={{
            variant: 'body2',
            fontWeight: active ? 600 : 400
          }}
        />
      </MenuItem>
    );
  };

  // عرض مجموعة منطوية (collapse)
  const renderCollapseGroup = (collapse, groupId) => {
    if (!collapse.children || collapse.children.length === 0) return null;

    const Icon = collapse.icon;

    return (
      <Box key={collapse.id} sx={{ mb: 0.5 }}>
        {/* عنوان المجموعة الفرعية */}
        <Box sx={{ px: 2, py: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            {Icon && <Icon sx={{ fontSize: '1rem', color: 'text.secondary' }} />}
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase' }}>
              {collapse.title}
            </Typography>
          </Stack>
        </Box>

        {/* عناصر المجموعة */}
        {collapse.children.map(child => {
          if (child.type === 'item') {
            return renderMenuItem(child, groupId);
          }
          return null;
        })}
      </Box>
    );
  };

  // Filter groups based on context
  // FIX: Use normalized roles from RBAC store for detection
  const isProviderRole = roles?.includes('PROVIDER');
  const isProviderPortalRoute = location.pathname === '/provider' || location.pathname.startsWith('/provider/');

  // Show only Provider Menu if: User is Provider AND is in Provider Portal routes
  // If Admin is in Provider Portal, they see full menu (Separation of concern)
  const shouldFilterForProvider = isProviderRole && isProviderPortalRoute;

  const filteredGroups = shouldFilterForProvider
    ? sidebarGroups?.filter(group => ['group-provider-portal', 'group-my-services'].includes(group.id))
    : sidebarGroups;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
      {filteredGroups?.map((group) => {
        if (!group.children || group.children.length === 0) return null;

        const groupActive = isGroupActive(group);
        const anchorEl = anchorEls[group.id];
        const open = Boolean(anchorEl);

        // إذا كانت المجموعة تحتوي على عنصر واحد مباشر
        const hasDirectUrl = group.children.length === 1 && group.children[0].type === 'item';
        const directItem = hasDirectUrl ? group.children[0] : null;

        return (
          <Box key={group.id}>
            <Button
              onClick={(e) => {
                if (directItem?.url) {
                  navigate(directItem.url);
                } else {
                  handleMenuOpen(group.id, e);
                }
              }}
              endIcon={!hasDirectUrl ? <KeyboardArrowDown sx={{ fontSize: '1rem' }} /> : null}
              sx={{
                color: groupActive ? 'primary.main' : 'text.primary',
                backgroundColor: groupActive ? alpha('#1976d2', 0.1) : 'transparent',
                px: 2,
                height: 48,
                fontWeight: groupActive ? 700 : 500,
                fontSize: '1rem',
                textTransform: 'none',
                minWidth: 'auto',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: groupActive ? alpha('#1976d2', 0.15) : 'action.hover'
                },
                borderBottom: groupActive ? '3px solid' : 'none',
                borderColor: 'primary.main',
                borderRadius: '6px 6px 0 0',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {group.title}
            </Button>

            {/* Dropdown Menu */}
            {!hasDirectUrl && (
              <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => handleMenuClose(group.id)}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left'
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left'
                }}
                sx={{
                  '& .MuiPaper-root': {
                    mt: 0.5,
                    minWidth: 240,
                    maxWidth: 360,
                    boxShadow: (theme) => theme.shadows[8],
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }
                }}
              >
                <Box sx={{ py: 0.5 }}>
                  {group.children.map((child) => {
                    if (child.type === 'item') {
                      return renderMenuItem(child, group.id);
                    }
                    if (child.type === 'collapse') {
                      return renderCollapseGroup(child, group.id);
                    }
                    return null;
                  })}
                </Box>
              </Menu>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
