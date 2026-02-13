/**
 * RBAC User Details Page - Phase D3 Step 2
 * Manages user roles and shows effective permissions with toggle ON/OFF
 *
 * ⚠️ Key Features:
 * 1. User info header
 * 2. Roles tab - toggle roles ON/OFF
 * 3. Permissions tab - shows effective permissions (read-only, derived from roles)
 * 4. SUPER_ADMIN toggles disabled with tooltip
 * 5. Optimistic UI updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// MUI Components
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Stack,
  Chip,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
  Paper,
  IconButton,
  Button
} from '@mui/material';

// MUI Icons
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import LockIcon from '@mui/icons-material/Lock';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import CircularLoader from 'components/CircularLoader';

// Services
import { usersService, rolesService, permissionsService } from 'services/rbac';

// Hooks
import useAuth from 'hooks/useAuth';

// ============================================================================
// CONSTANTS
// ============================================================================

const PERMISSION_MODULES = {
  users: { label: 'المستخدمين', icon: PersonIcon },
  roles: { label: 'الأدوار', icon: AdminPanelSettingsIcon },
  permissions: { label: 'الصلاحيات', icon: SecurityIcon },
  members: { label: 'الأعضاء', icon: PersonIcon },
  employers: { label: 'جهات العمل', icon: PersonIcon },
  providers: { label: 'مقدمي الخدمات', icon: PersonIcon },
  claims: { label: 'المطالبات', icon: PersonIcon },
  policies: { label: 'الوثائق', icon: PersonIcon },
  pre_approvals: { label: 'الموافقات المسبقة', icon: PersonIcon },
  medical_services: { label: 'الخدمات الطبية', icon: PersonIcon },
  medical_packages: { label: 'الباقات الطبية', icon: PersonIcon },
  benefit_packages: { label: 'باقات المنافع', icon: PersonIcon },
  reports: { label: 'التقارير', icon: PersonIcon },
  settings: { label: 'الإعدادات', icon: PersonIcon },
  audit: { label: 'سجل التدقيق', icon: PersonIcon }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get initials from name
 */
const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Get role color based on role name
 */
const getRoleColor = (roleName) => {
  const roleColors = {
    SUPER_ADMIN: 'error',
    INSURANCE_ADMIN: 'warning',
    EMPLOYER_ADMIN: 'primary',
    REVIEWER: 'secondary',
    PROVIDER: 'info',
    USER: 'default',
    MEMBER: 'default'
  };
  return roleColors[roleName] || 'default';
};

/**
 * Group permissions by module
 */
const groupPermissionsByModule = (permissions) => {
  const grouped = {};

  permissions.forEach((perm) => {
    // Extract module from permission name (e.g., "users.view" → "users")
    const parts = (perm?.name || '').split('.');
    const module = parts[0] || 'other';

    if (!grouped[module]) {
      grouped[module] = [];
    }
    grouped[module].push(perm);
  });

  return grouped;
};

// ============================================================================
// TAB PANEL COMPONENT
// ============================================================================

const TabPanel = ({ children, value, index, ...other }) => (
  <div role="tabpanel" hidden={value !== index} {...other}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

// ============================================================================
// ROLES TAB COMPONENT
// ============================================================================

const RolesTab = ({ user, allRoles, userRoleIds, onToggleRole, isSuperAdmin, loading }) => {
  // Check if the user being edited is SUPER_ADMIN
  const userIsSuperAdmin = user?.roles?.some((r) => r?.name === 'SUPER_ADMIN');

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        قم بتفعيل أو تعطيل الأدوار للمستخدم. الصلاحيات الفعلية مشتقة من الأدوار المفعّلة.
      </Alert>

      <Grid container spacing={2}>
        {allRoles.map((role) => {
          const isAssigned = userRoleIds.includes(role?.id);
          const roleName = role?.name || '';
          const isProtectedRole = roleName === 'SUPER_ADMIN';
          const isDisabled = isProtectedRole || loading;

          return (
            <Grid item xs={12} sm={6} md={4} key={role?.id}>
              <Paper
                elevation={isAssigned ? 3 : 0}
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: isAssigned ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  bgcolor: isAssigned ? 'primary.lighter' : 'background.paper',
                  transition: 'all 0.2s ease'
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: isAssigned ? `${getRoleColor(roleName)}.main` : 'grey.300'
                      }}
                    >
                      <AdminPanelSettingsIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {role?.name || '-'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {role?.description || roleName}
                      </Typography>
                    </Box>
                  </Stack>

                  <Tooltip title={isProtectedRole ? 'لا يمكن تغيير دور المدير الأعلى' : isAssigned ? 'إلغاء تعيين الدور' : 'تعيين الدور'}>
                    <span>
                      <Switch
                        checked={isAssigned}
                        onChange={() => onToggleRole(role?.id, !isAssigned)}
                        disabled={isDisabled}
                        color="primary"
                      />
                    </span>
                  </Tooltip>
                </Stack>

                {/* Role permissions count */}
                <Stack direction="row" spacing={1} mt={1.5}>
                  <Chip
                    label={`${role?.permissions?.length || 0} صلاحية`}
                    size="small"
                    variant="outlined"
                    icon={<SecurityIcon sx={{ fontSize: '14px !important' }} />}
                  />
                  {isProtectedRole && (
                    <Chip
                      label="محمي"
                      size="small"
                      color="error"
                      variant="light"
                      icon={<LockIcon sx={{ fontSize: '14px !important' }} />}
                    />
                  )}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {allRoles.length === 0 && <Alert severity="warning">لا توجد أدوار متاحة في النظام</Alert>}
    </Box>
  );
};

// ============================================================================
// PERMISSIONS TAB COMPONENT (READ-ONLY)
// ============================================================================

const PermissionsTab = ({ effectivePermissions, allPermissions }) => {
  const groupedPermissions = useMemo(() => groupPermissionsByModule(allPermissions), [allPermissions]);
  const effectivePermissionIds = useMemo(() => new Set(effectivePermissions.map((p) => p?.id)), [effectivePermissions]);

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        الصلاحيات مشتقة تلقائياً من الأدوار المعيّنة للمستخدم. لتغيير الصلاحيات، قم بتعديل الأدوار.
      </Alert>

      {Object.entries(groupedPermissions).map(([module, permissions]) => {
        const moduleInfo = PERMISSION_MODULES[module] || { label: module, icon: SecurityIcon };
        const ModuleIcon = moduleInfo.icon;
        const activeCount = permissions.filter((p) => effectivePermissionIds.has(p?.id)).length;

        return (
          <Paper key={module} sx={{ mb: 2, overflow: 'hidden' }}>
            {/* Module Header */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: 'grey.100',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1} alignItems="center">
                  <ModuleIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="medium">
                    {moduleInfo.label}
                  </Typography>
                </Stack>
                <Chip
                  label={`${activeCount} / ${permissions.length}`}
                  size="small"
                  color={activeCount === permissions.length ? 'success' : activeCount > 0 ? 'warning' : 'default'}
                />
              </Stack>
            </Box>

            {/* Permissions Grid */}
            <Box sx={{ p: 2 }}>
              <Grid container spacing={1}>
                {permissions.map((permission) => {
                  const isActive = effectivePermissionIds.has(permission?.id);
                  const permName = permission?.name || '';
                  const action = permName.split('.')[1] || permName;

                  // Arabic labels for common actions
                  const actionLabels = {
                    view: 'عرض',
                    create: 'إنشاء',
                    edit: 'تعديل',
                    delete: 'حذف',
                    manage: 'إدارة',
                    assign_roles: 'تعيين أدوار',
                    assign_permissions: 'تعيين صلاحيات',
                    export: 'تصدير',
                    import: 'استيراد',
                    approve: 'موافقة',
                    reject: 'رفض'
                  };

                  return (
                    <Grid item xs={6} sm={4} md={3} key={permission?.id}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: isActive ? 'success.lighter' : 'grey.50',
                          border: '1px solid',
                          borderColor: isActive ? 'success.light' : 'grey.200'
                        }}
                      >
                        {isActive ? <CheckCircleIcon color="success" fontSize="small" /> : <BlockIcon color="disabled" fontSize="small" />}
                        <Typography variant="body2" color={isActive ? 'success.dark' : 'text.disabled'} noWrap>
                          {actionLabels[action] || action}
                        </Typography>
                      </Stack>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Paper>
        );
      })}

      {Object.keys(groupedPermissions).length === 0 && <Alert severity="warning">لا توجد صلاحيات معرّفة في النظام</Alert>}
    </Box>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // ========================================
  // VALIDATE ID - Must be numeric
  // ========================================

  const numericId = Number(id);
  const isValidId = id && !isNaN(numericId) && numericId > 0;

  // State
  const [user, setUser] = useState(null);
  const [allRoles, setAllRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  // Derived state
  const userRoleIds = useMemo(() => (user?.roles || []).map((r) => r?.id), [user]);
  const effectivePermissions = useMemo(() => {
    const permSet = new Set();
    (user?.roles || []).forEach((role) => {
      (role?.permissions || []).forEach((perm) => {
        permSet.add(JSON.stringify(perm));
      });
    });
    return Array.from(permSet).map((p) => JSON.parse(p));
  }, [user]);

  // Check if current user is SUPER_ADMIN
  const isSuperAdmin = currentUser?.roles?.includes('SUPER_ADMIN');

  // ========================================
  // DATA LOADING
  // ========================================

  const loadData = useCallback(async () => {
    // Guard: Don't load if ID is invalid
    if (!isValidId) return;

    try {
      setLoading(true);
      setError(null);

      const [userRes, rolesRes, permsRes] = await Promise.all([
        usersService.getUserById(numericId),
        rolesService.getAllRoles(),
        permissionsService.getAllPermissions()
      ]);

      setUser(userRes?.data?.data || userRes?.data || null);
      setAllRoles(rolesRes?.data?.data || rolesRes?.data || []);
      setAllPermissions(permsRes?.data?.data || permsRes?.data || []);
    } catch (err) {
      console.error('[UserDetails] Load error:', err);
      setError(err?.response?.data?.message || 'فشل تحميل بيانات المستخدم');
    } finally {
      setLoading(false);
    }
  }, [numericId, isValidId]);

  useEffect(() => {
    // Redirect to users list if ID is invalid
    if (!isValidId) {
      console.warn('[UserDetails] Invalid user ID:', id);
      navigate('/rbac/users', { replace: true });
      return;
    }
    loadData();
  }, [loadData, isValidId, id, navigate]);

  // ========================================
  // ROLE TOGGLE HANDLER
  // ========================================

  const handleToggleRole = useCallback(
    async (roleId, shouldAssign) => {
      if (!isValidId) return;

      try {
        setSaving(true);

        // Optimistic update
        setUser((prev) => {
          if (!prev) return prev;

          if (shouldAssign) {
            const roleToAdd = allRoles.find((r) => r?.id === roleId);
            return {
              ...prev,
              roles: [...(prev.roles || []), roleToAdd]
            };
          } else {
            return {
              ...prev,
              roles: (prev.roles || []).filter((r) => r?.id !== roleId)
            };
          }
        });

        // API call
        if (shouldAssign) {
          await usersService.assignRoles(numericId, [roleId]);
        } else {
          await usersService.removeRoles(numericId, [roleId]);
        }
      } catch (err) {
        console.error('[UserDetails] Toggle role error:', err);
        // Revert on error
        loadData();
        alert(err?.response?.data?.message || 'فشل تحديث الدور');
      } finally {
        setSaving(false);
      }
    },
    [numericId, isValidId, allRoles, loadData]
  );

  // ========================================
  // LOADING STATE
  // ========================================

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularLoader />
      </Box>
    );
  }

  // ========================================
  // ERROR STATE
  // ========================================

  if (error) {
    return (
      <Box>
        <ModernPageHeader
          title="تفاصيل المستخدم"
          icon={PersonIcon}
          breadcrumbs={[
            { label: 'الرئيسية', path: '/' },
            { label: 'الصلاحيات', path: '/rbac' },
            { label: 'المستخدمين', path: '/rbac/users' },
            { label: 'تفاصيل' }
          ]}
        />
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  // ========================================
  // MAIN RENDER
  // ========================================

  return (
    <Box>
      {/* ====== PAGE HEADER ====== */}
      <ModernPageHeader
        title={user?.fullName || user?.username || 'تفاصيل المستخدم'}
        subtitle="إدارة أدوار وصلاحيات المستخدم"
        icon={PersonIcon}
        breadcrumbs={[
          { label: 'الرئيسية', path: '/' },
          { label: 'الصلاحيات', path: '/rbac' },
          { label: 'المستخدمين', path: '/rbac/users' },
          { label: user?.username || 'تفاصيل' }
        ]}
        actions={
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/rbac/users')}>
            العودة للقائمة
          </Button>
        }
      />

      {/* ====== USER INFO CARD ====== */}
      <MainCard sx={{ mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem' }}>
            {getInitials(user?.fullName || user?.username)}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" gutterBottom>
              {user?.fullName || user?.username || '-'}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {user?.email || '-'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={user?.enabled !== false ? 'نشط' : 'معطل'} color={user?.enabled !== false ? 'success' : 'default'} size="small" />
              {(user?.roles || []).map((role) => (
                <Chip key={role?.id} label={role?.nameAr || role?.name} color={getRoleColor(role?.name)} size="small" variant="light" />
              ))}
            </Stack>
          </Box>

          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography variant="caption" color="text.secondary" display="block">
              آخر دخول
            </Typography>
            <Typography variant="body2">
              {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ar-SA') : 'لم يسجل الدخول'}
            </Typography>
          </Box>
        </Stack>
      </MainCard>

      {/* ====== TABS ====== */}
      <MainCard>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tab label="الأدوار" icon={<AdminPanelSettingsIcon />} iconPosition="start" />
          <Tab label="الصلاحيات الفعلية" icon={<SecurityIcon />} iconPosition="start" />
        </Tabs>

        {/* Saving indicator */}
        {saving && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} />
              <span>جاري الحفظ...</span>
            </Stack>
          </Alert>
        )}

        {/* Roles Tab */}
        <TabPanel value={tabValue} index={0}>
          <RolesTab
            user={user}
            allRoles={allRoles}
            userRoleIds={userRoleIds}
            onToggleRole={handleToggleRole}
            isSuperAdmin={isSuperAdmin}
            loading={saving}
          />
        </TabPanel>

        {/* Permissions Tab */}
        <TabPanel value={tabValue} index={1}>
          <PermissionsTab effectivePermissions={effectivePermissions} allPermissions={allPermissions} />
        </TabPanel>
      </MainCard>
    </Box>
  );
};

export default UserDetails;
