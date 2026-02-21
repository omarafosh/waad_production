/**
 * RBAC Role Details Page - Granular Permissions Grid
 * Replaced Accordion list with Resource-Action Matrix
 * 
 * Features:
 * - Grid Layout: Rows (Resources) x Columns (Actions)
 * - Granular Control: View, Create, Edit, Delete, Print, Export
 * - Bulk Actions: Select All Row / Select All Column
 * - Optimistic Updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// MUI Components
import {
  Box,
  Typography,
  Avatar,
  Stack,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton
} from '@mui/material';

// MUI Icons
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';
import SaveIcon from '@mui/icons-material/Save';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import CircularLoader from 'components/CircularLoader';

// Services
import { rolesService, permissionsService } from 'services/rbac';
import useAuth from 'hooks/useAuth';
import { openSnackbar } from 'api/snackbar';

// ============================================================================
// CONSTANTS & MAPPINGS
// ============================================================================

const PROTECTED_ROLES = ['SUPER_ADMIN'];

// Resource Definitions (Rows)
// Resource Definitions (Rows) - Ordered by Navbar
const RESOURCES = [
  { key: 'DASHBOARD', labels: ['DASHBOARD'], title: 'لوحة المعلومات' },
  { key: 'MEMBERS', labels: ['MEMBER'], title: 'المستفيدين' },
  { key: 'PROVIDER_PORTAL', labels: ['PROVIDER_PORTAL_VIEW'], title: 'بوابة الخدمة' },
  { key: 'EMPLOYERS', labels: ['EMPLOYER'], title: 'جهات العمل' },
  { key: 'PROVIDERS', labels: ['PROVIDER'], title: 'مقدمو الخدمات' },
  { key: 'PROVIDER_CONTRACTS', labels: ['PROVIDER_CONTRACT'], title: 'عقود مقدمي الخدمات' },
  { key: 'CLAIMS', labels: ['CLAIM'], title: 'المطالبات' },
  { key: 'PREAUTH', labels: ['PREAUTH', 'PRE_AUTH'], title: 'الموافقات المسبقة' },
  { key: 'FINANCIAL', labels: ['SETTLEMENT'], title: 'التسويات المالية' },
  { key: 'REPORTS', labels: ['REPORT'], title: 'التقارير' },
  { key: 'DOCUMENTS', labels: ['DOCUMENT'], title: 'الوثائق' },
  { key: 'MEDICAL', labels: ['MEDICAL_SERVICE', 'MEDICAL_PACKAGE', 'CATEGORY'], title: 'التصنيف الطبي' },
  { key: 'COMPANIES', labels: ['COMPANY'], title: 'معلومات المؤسسة' },
  { key: 'USERS', labels: ['USER'], title: 'إدارة المستخدمين' },
  { key: 'ROLES', labels: ['ROLE', 'RBAC', 'PERMISSION'], title: 'إدارة الأدوار' }
];

// Action Definitions (Columns)
const ACTIONS = [
  { key: 'VIEW', label: 'عرض', icon: VisibilityIcon, color: 'info' },
  { key: 'CREATE', label: 'إضافة', icon: AddCircleIcon, color: 'success' },
  { key: 'UPDATE', label: 'تعديل', icon: EditIcon, color: 'warning' },
  { key: 'DELETE', label: 'حذف', icon: DeleteIcon, color: 'error' },
  { key: 'PRINT', label: 'طباعة', icon: PrintIcon, color: 'secondary' },
  { key: 'EXPORT', label: 'تصدير', icon: FileDownloadIcon, color: 'primary' },
  { key: 'IMPORT', label: 'استيراد', icon: UploadFileIcon, color: 'success' }
];

// Helper to determine role color
const getRoleColor = (roleName) => {
  const roleColors = {
    SUPER_ADMIN: 'error',
    INSURANCE_ADMIN: 'warning',
    EMPLOYER_ADMIN: 'primary',
    REVIEWER: 'secondary',
    PROVIDER: 'info',
    USER: 'default'
  };
  return roleColors[roleName] || 'primary';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const RoleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth(); // Available for logic if needed

  // State
  const [role, setRole] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const numericId = Number(id);
  const isValidId = id && !isNaN(numericId) && numericId > 0;
  const isProtected = PROTECTED_ROLES.includes(role?.name);

  // Derived Mappings
  const permissionGridMap = useMemo(() => {
    const map = {}; // Keys: RESOURCE_KEY, Values: { ACTION_KEY: PermissionObject }

    // Initialize map
    RESOURCES.forEach(res => {
      map[res.key] = {};
    });

    // Populate map
    allPermissions.forEach(perm => {
      const name = perm.name;

      // Find Resource: Match the most specific (longest) label first to avoid collisions
      // (e.g., PROVIDER_CONTRACT should match before PROVIDER)
      let bestMatch = null;
      let longestLabelLength = 0;

      RESOURCES.forEach(res => {
        res.labels.forEach(label => {
          if (name.includes(label) && label.length > longestLabelLength) {
            longestLabelLength = label.length;
            bestMatch = res;
          }
        });
      });

      if (!bestMatch) return; // Skip unknown permissions
      const resourceObj = bestMatch;

      // Find Action
      const actionObj = ACTIONS.find(a => {
        // Direct match or suffix match
        if (name.startsWith(a.key) || name.includes(`_${a.key}`)) return true;

        // Aliases
        if (a.key === 'UPDATE' && name.includes('_EDIT')) return true;
        if (a.key === 'CREATE' && (name.includes('_ADD') || name.includes('_CREATE'))) return true;

        return false;
      });

      // Special Handling for "MANAGE_" (Legacy) -> Map to all? No, just list it if strictly needed, 
      // or ignore if we want strict grid. For now, let's try to map MANAGE to UPDATE for fallback?
      // Better: The backend now has granular permissions. Focus on those.

      if (actionObj) {
        map[resourceObj.key][actionObj.key] = perm;
      }
    });

    return map;
  }, [allPermissions]);

  const assignedPermissionIds = useMemo(() => {
    return new Set((role?.permissions || []).map(p => p.id));
  }, [role]);

  // ========================================
  // LOAD DATA
  // ========================================
  const loadData = useCallback(async () => {
    if (!isValidId) return;
    setLoading(true);
    try {
      const [roleRes, permsRes] = await Promise.all([
        rolesService.getRoleById(numericId),
        permissionsService.getAllPermissions()
      ]);
      setRole(roleRes?.data?.data || roleRes?.data);
      setAllPermissions(permsRes?.data?.data || permsRes?.data || []);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error loading role details:', err);
      openSnackbar({
        open: true,
        message: 'فشل تحميل البيانات',
        variant: 'alert',
        alert: { color: 'error' }
      });
    } finally {
      setLoading(false);
    }
  }, [numericId, isValidId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========================================
  // TOGGLE HANDLERS
  // ========================================

  const handleToggle = (permissionId) => {
    if (isProtected) return;

    setRole(prev => {
      const currentPerms = prev.permissions || [];
      const exists = currentPerms.find(p => p.id === permissionId);

      let newPerms;
      if (exists) {
        newPerms = currentPerms.filter(p => p.id !== permissionId);
      } else {
        const permObj = allPermissions.find(p => p.id === permissionId);
        newPerms = [...currentPerms, permObj];
      }
      return { ...prev, permissions: newPerms };
    });
    setHasUnsavedChanges(true);
  };

  const handleRowToggle = (resourceKey, selectAll) => {
    if (isProtected) return;

    // Get all permissions for this row
    const rowPerms = Object.values(permissionGridMap[resourceKey] || {})
      .filter(p => p) // valid perms
      .map(p => p.id);

    setRole(prev => {
      const currentIds = new Set((prev.permissions || []).map(p => p.id));

      rowPerms.forEach(id => {
        if (selectAll) currentIds.add(id);
        else currentIds.delete(id);
      });

      const newPermList = allPermissions.filter(p => currentIds.has(p.id));
      return { ...prev, permissions: newPermList };
    });
    setHasUnsavedChanges(true);
  };

  const handleColumnToggle = (actionKey, selectAll) => {
    if (isProtected) return;

    // Get all permissions for this column across all rows
    const colPerms = [];
    RESOURCES.forEach(res => {
      const perm = permissionGridMap[res.key]?.[actionKey];
      if (perm) colPerms.push(perm.id);
    });

    setRole(prev => {
      const currentIds = new Set((prev.permissions || []).map(p => p.id));

      colPerms.forEach(id => {
        if (selectAll) currentIds.add(id);
        else currentIds.delete(id);
      });

      const newPermList = allPermissions.filter(p => currentIds.has(p.id));
      return { ...prev, permissions: newPermList };
    });
    setHasUnsavedChanges(true);
  };

  // ========================================
  // SAVE
  // ========================================

  // ========================================
  // SAVE
  // ========================================

  const handleSave = async () => {
    if (!hasUnsavedChanges || isProtected) return;
    setSaving(true);
    try {
      const ids = (role.permissions || []).map(p => p.id);
      await rolesService.assignPermissions(numericId, ids);

      openSnackbar({
        open: true,
        message: 'تم حفظ الصلاحيات بنجاح',
        variant: 'alert',
        alert: { color: 'success' }
      });

      // CRITICAL: Reload data to ensure frontend state matches backend reality
      // This fixes the "State Mismatch" issue where user sees one thing but backend has another
      await loadData();

      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Save error:', err);
      openSnackbar({
        open: true,
        message: 'فشل حفظ الصلاحيات',
        variant: 'alert',
        alert: { color: 'error' }
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularLoader /></Box>;

  return (
    <Box>
      <ModernPageHeader
        title={role?.name || 'تفاصيل الدور'}
        subtitle="إدارة الصلاحيات المتقدمة"
        icon={AdminPanelSettingsIcon}
        breadcrumbs={[
          { label: 'الرئيسية', path: '/' },
          { label: 'الصلاحيات', path: '/rbac' },
          { label: 'الأدوار', path: '/rbac/roles' },
          { label: role?.name || 'تفاصيل' }
        ]}
        actions={
          <Stack direction="row" spacing={2}>
            {!isProtected && (
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={!hasUnsavedChanges || saving}
                color={hasUnsavedChanges ? "primary" : "inherit"}
                sx={{
                  minWidth: 140,
                  opacity: (!hasUnsavedChanges && !saving) ? 0.7 : 1
                }}
              >
                {saving ? 'جاري الحفظ...' : (hasUnsavedChanges ? 'حفظ التغييرات' : 'تم الحفظ')}
              </Button>
            )}
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/rbac/roles')}>
              العودة
            </Button>
          </Stack>
        }
      />

      {/* Role Info */}
      <MainCard sx={{ mb: 3 }} content={false}>
        <Box sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={3}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: `${getRoleColor(role?.name)}.main` }}>
              <AdminPanelSettingsIcon fontSize="large" />
            </Avatar>
            <Box flex={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h4">{role?.name || '-'}</Typography>
                {isProtected && <Chip label="دور محمي" color="error" size="small" icon={<LockIcon />} />}
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>{role?.description || role?.descriptionAr || '-'}</Typography>
            </Box>
            <Stack alignItems="end">
              <Typography variant="caption" color="text.secondary">عدد الصلاحيات</Typography>
              <Typography variant="h3" color="primary">{(role?.permissions || []).length}</Typography>
            </Stack>
          </Stack>
        </Box>
      </MainCard>

      {/* Permissions Grid */}
      <MainCard
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <SecurityIcon color="primary" />
            <Typography variant="h5">مصفوفة الصلاحيات (Resource-Action Matrix)</Typography>
          </Stack>
        }
        content={false}
      >
        <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
          <Table sx={{ minWidth: 800 }}>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>القسم / المورد</TableCell>
                {ACTIONS.map(action => (
                  <TableCell key={action.key} align="center" sx={{ minWidth: 100 }}>
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                      <action.icon fontSize="small" color={action.color} />
                      <Typography variant="subtitle2">{action.label}</Typography>
                    </Stack>
                    {/* Column Select All */}
                    {!isProtected && (
                      <Tooltip title={`تحديد الكل: ${action.label}`}>
                        <Checkbox
                          size="small"
                          icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                          checkedIcon={<CheckBoxIcon fontSize="small" />}
                          onChange={(e) => handleColumnToggle(action.key, e.target.checked)}
                          sx={{ p: 0.5, mt: 0.5 }}
                        />
                      </Tooltip>
                    )}
                  </TableCell>
                ))}
                <TableCell align="center" width="5%">الكل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {RESOURCES.map((resource) => {
                const rowActions = permissionGridMap[resource.key] || {};
                const hasPermissions = Object.keys(rowActions).length > 0;

                // If this resource has no permissions at all, skip it or show disabled
                if (!hasPermissions) {
                  // Optional: enable this to hide empty rows
                  // return null; 
                }

                // Check row state
                const rowPerms = Object.values(rowActions).filter(p => p);
                const activeCount = rowPerms.filter(p => assignedPermissionIds.has(p.id)).length;
                const isFullRow = rowPerms.length > 0 && activeCount === rowPerms.length;

                return (
                  <TableRow key={resource.key} hover>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">{resource.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{resource.key}</Typography>
                    </TableCell>

                    {ACTIONS.map(action => {
                      const perm = rowActions[action.key];
                      const isAssigned = perm && assignedPermissionIds.has(perm.id);

                      return (
                        <TableCell key={action.key} align="center">
                          {perm ? (
                            <Checkbox
                              checked={isAssigned}
                              onChange={() => handleToggle(perm.id)}
                              disabled={isProtected}
                              color={action.color}
                              size="small"
                            />
                          ) : (
                            <Typography variant="caption" color="text.disabled">-</Typography>
                          )}
                        </TableCell>
                      );
                    })}

                    {/* Row Select All */}
                    <TableCell align="center">
                      {rowPerms.length > 0 && !isProtected && (
                        <Checkbox
                          checked={isFullRow}
                          onChange={(e) => handleRowToggle(resource.key, e.target.checked)}
                          color="primary"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </MainCard>
    </Box>
  );
};

export default RoleDetails;
