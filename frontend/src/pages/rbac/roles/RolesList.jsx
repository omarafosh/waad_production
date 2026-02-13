/**
 * RBAC Roles List Page - Simple Format
 * Similar to UsersList - uses basic MUI Table
 * 
 * Features:
 * - Simple table with pagination
 * - View and Edit actions
 * - Protected roles indicator
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  CircularProgress,
  Avatar
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  Lock as LockIcon
} from '@mui/icons-material';

import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import { rolesService } from 'services/rbac';
import { openSnackbar } from 'api/snackbar';
import { useTableRefresh } from 'contexts/TableRefreshContext';

// ============================================================================
// CONSTANTS
// ============================================================================

// Protected roles that cannot be modified
const PROTECTED_ROLES = ['SUPER_ADMIN'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
    USER: 'default'
  };
  return roleColors[roleName] || 'primary';
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const RolesList = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const { refreshKey } = useTableRefresh();

  // State
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [totalElements, setTotalElements] = useState(0);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch roles
  useEffect(() => {
    fetchRoles();
  }, [page, rowsPerPage, refreshKey]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await rolesService.getAllRoles();
      const allRoles = response?.data?.data || response?.data || response || [];

      // Client-side filtering by search term
      let filtered = allRoles;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = allRoles.filter(
          (r) =>
            r.name?.toLowerCase().includes(term) ||
            r.description?.toLowerCase().includes(term)
        );
      }

      // Client-side pagination
      const total = filtered.length;
      const start = page * rowsPerPage;
      const paginated = filtered.slice(start, start + rowsPerPage);

      setRoles(paginated);
      setTotalElements(total);
    } catch (error) {
      console.error('Error fetching roles:', error);
      openSnackbar({
        open: true,
        message: 'خطأ في جلب الأدوار',
        variant: 'alert',
        alert: { color: 'error' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchRoles();
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRefresh = () => {
    fetchRoles();
  };

  return (
    <Box>
      {/* Page Header - Only show if not embedded */}
      {!isEmbedded && (
        <ModernPageHeader
          title="إدارة الأدوار"
          subtitle="عرض وإدارة أدوار النظام وصلاحياتها"
          icon={AdminPanelSettingsIcon}
          breadcrumbs={[
            { label: 'الرئيسية', path: '/' },
            { label: 'الصلاحيات', path: '/rbac' },
            { label: 'الأدوار' }
          ]}
          actions={
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
                تحديث
              </Button>
            </Stack>
          }
        />
      )}

      <Grid container spacing={3}>
        {/* Search */}
        <Grid item xs={12}>
          <MainCard title="البحث">
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="بحث"
                  placeholder="اسم الدور، الوصف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="contained" onClick={handleSearch}>
                  بحث
                </Button>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setSearchTerm('');
                    setPage(0);
                    fetchRoles();
                  }}
                >
                  إعادة تعيين
                </Button>
              </Grid>
            </Grid>
          </MainCard>
        </Grid>

        {/* Roles Table */}
        <Grid item xs={12}>
          <MainCard
            content={false}
            title={
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5">الأدوار ({totalElements})</Typography>
                {loading && <CircularProgress size={24} />}
              </Stack>
            }
          >
            <TableContainer component={Paper} elevation={0}>
              <Table aria-label="roles table">
                <TableHead>
                  <TableRow>
                    <TableCell width="5%">#</TableCell>
                    <TableCell width="25%">الدور</TableCell>
                    <TableCell width="30%">الوصف</TableCell>
                    <TableCell width="15%">الصلاحيات</TableCell>
                    <TableCell width="10%">المستخدمين</TableCell>
                    <TableCell align="center" width="15%">إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                        <CircularProgress />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                          جاري تحميل الأدوار...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                        <Typography variant="h6" color="text.secondary">
                          لا توجد نتائج
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role, index) => {
                      const isProtected = PROTECTED_ROLES.includes(role?.name);
                      const permissionsCount = role?.permissions?.length || 0;
                      const usersCount = role?.usersCount || role?.users?.length || 0;

                      return (
                        <TableRow key={role.id} hover>
                          <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Avatar
                                sx={{
                                  width: 36,
                                  height: 36,
                                  bgcolor: `${getRoleColor(role?.name)}.main`
                                }}
                              >
                                <AdminPanelSettingsIcon fontSize="small" />
                              </Avatar>
                              <Box>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Typography variant="body2" fontWeight="medium">
                                    {role?.nameAr || role?.name || '-'}
                                  </Typography>
                                  {isProtected && (
                                    <Tooltip title="دور محمي من النظام">
                                      <LockIcon sx={{ fontSize: 14, color: 'error.main' }} />
                                    </Tooltip>
                                  )}
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                  {role?.name || '-'} {role?.nameAr ? `(${role.name})` : ''}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 250 }}>
                              {role?.description || role?.descriptionAr || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${permissionsCount} صلاحية`}
                              size="small"
                              color={permissionsCount > 10 ? 'success' : permissionsCount > 0 ? 'info' : 'default'}
                              variant="outlined"
                              icon={<SecurityIcon sx={{ fontSize: '14px !important' }} />}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${usersCount} مستخدم`}
                              size="small"
                              color={usersCount > 0 ? 'primary' : 'default'}
                              variant="outlined"
                              icon={<PeopleIcon sx={{ fontSize: '14px !important' }} />}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <Tooltip title="عرض وإدارة الصلاحيات">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => navigate(`/rbac/roles/${role.id}`)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={isProtected ? 'دور محمي لا يمكن تعديله' : 'تعديل الدور'}>
                                <span>
                                  <IconButton
                                    size="small"
                                    color="info"
                                    onClick={() => navigate(`/rbac/roles/${role.id}`)}
                                    disabled={isProtected}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={totalElements}
              page={page}
              onPageChange={handlePageChange}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[10, 20, 50, 100]}
              labelRowsPerPage="عدد الصفوف:"
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
              }
            />
          </MainCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RolesList;
