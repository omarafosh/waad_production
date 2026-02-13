/**
 * RBAC Users List Page - Simple Format
 * Similar to UnifiedMembersList - uses basic MUI Table
 * 
 * Features:
 * - Simple table with pagination
 * - Toggle status (activate/deactivate)
 * - View and Edit actions
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
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { useIntl } from 'react-intl';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  PeopleAlt as PeopleAltIcon,
  Business as BusinessIcon,
  LocalHospital as HospitalIcon,
  Home as HomeIcon,
  AdminPanelSettings as AdminPanelSettingsIcon
} from '@mui/icons-material';

import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import { usersService } from 'services/rbac';
import { openSnackbar } from 'api/snackbar';
import { useTableRefresh } from 'contexts/TableRefreshContext';
import ConfirmDialog from 'components/common/ConfirmDialog';

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
 * Users List Component
 */
const UsersList = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const { refreshKey, triggerRefresh } = useTableRefresh();
  const intl = useIntl();

  // State
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [totalElements, setTotalElements] = useState(0);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Toggle Status Dialog
  const [toggleDialog, setToggleDialog] = useState({ open: false, user: null });
  const [toggling, setToggling] = useState(false);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, [page, rowsPerPage, refreshKey]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const users = await usersService.getAllUsers();

      // Client-side filtering by search term
      let filtered = users;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = users.filter(
          (u) =>
            u.username?.toLowerCase().includes(term) ||
            u.fullName?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term)
        );
      }

      // Client-side pagination
      const total = filtered.length;
      const start = page * rowsPerPage;
      const paginated = filtered.slice(start, start + rowsPerPage);

      setUsers(paginated);
      setTotalElements(total);
    } catch (error) {
      console.error('Error fetching users:', error);
      openSnackbar({
        open: true,
        message: intl.formatMessage({ id: 'rbac.users.table.errors.fetch' || 'common.error' }),
        variant: 'alert',
        alert: { color: 'error' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchUsers();
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
    fetchUsers();
  };

  // Toggle Status
  const handleToggleClick = (user) => {
    setToggleDialog({ open: true, user });
  };

  const handleToggleClose = () => {
    setToggleDialog({ open: false, user: null });
  };

  const handleToggleConfirm = async () => {
    if (!toggleDialog.user) return;

    setToggling(true);
    try {
      const response = await usersService.toggleUserStatus(toggleDialog.user.id);

      openSnackbar({
        open: true,
        message: response?.message || intl.formatMessage({ id: 'rbac.users.status.toggleSuccess' }),
        variant: 'alert',
        alert: { color: 'success' }
      });

      handleToggleClose();
      fetchUsers();

      // Global Refresh for other elements (like permissions check)
      triggerRefresh();
    } catch (error) {
      console.error('Error toggling user status:', error);
      openSnackbar({
        open: true,
        message: error?.response?.data?.message || intl.formatMessage({ id: 'rbac.users.status.toggleError' }),
        variant: 'alert',
        alert: { color: 'error' }
      });
    } finally {
      setToggling(false);
    }
  };

  const getStatusChip = (user) => {
    const isActive = user?.active !== false;
    return (
      <Chip
        label={isActive ? intl.formatMessage({ id: 'rbac.users.status.active' }) : intl.formatMessage({ id: 'rbac.users.status.inactive' })}
        color={isActive ? 'success' : 'default'}
        size="small"
      />
    );
  };

  const isSuperAdmin = (user) => {
    return user?.roles?.some((role) => role?.name === 'SUPER_ADMIN');
  };

  return (
    <Box>
      {/* Page Header - Only show if not embedded */}
      {!isEmbedded && (
        <ModernPageHeader
          title={intl.formatMessage({ id: 'rbac.users.title' })}
          subtitle={intl.formatMessage({ id: 'rbac.users.subtitle' })}
          icon={PeopleAltIcon}
          breadcrumbs={[
            { label: intl.formatMessage({ id: 'common.nav.home' }), path: '/' },
            { label: intl.formatMessage({ id: 'common.nav.rbac' }), path: '/rbac' },
            { label: intl.formatMessage({ id: 'rbac.users.list' }) }
          ]}
          actions={
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
                {intl.formatMessage({ id: 'common.actions.refresh' })}
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/rbac/users/create')}>
                {intl.formatMessage({ id: 'rbac.users.add' })}
              </Button>
            </Stack>
          }
        />
      )}

      <Grid container spacing={3}>
        {/* Search */}
        <Grid item xs={12}>
          <MainCard title={intl.formatMessage({ id: 'rbac.users.search.title' })}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={intl.formatMessage({ id: 'rbac.users.search.title' })}
                  placeholder={intl.formatMessage({ id: 'rbac.users.search.placeholder' })}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="contained" onClick={handleSearch}>
                  {intl.formatMessage({ id: 'rbac.users.search.submit' })}
                </Button>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setSearchTerm('');
                    setPage(0);
                    fetchUsers();
                  }}
                >
                  {intl.formatMessage({ id: 'rbac.users.search.reset' })}
                </Button>
              </Grid>
            </Grid>
          </MainCard>
        </Grid>

        {/* Users Table */}
        <Grid item xs={12}>
          <MainCard
            content={false}
            title={
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5">
                  {intl.formatMessage({ id: 'rbac.users.list' })} ({totalElements})
                </Typography>
                {loading && <CircularProgress size={24} />}
              </Stack>
            }
          >
            <TableContainer component={Paper} elevation={0}>
              <Table aria-label="users table">
                <TableHead>
                  <TableRow>
                    <TableCell width="5%">{intl.formatMessage({ id: 'rbac.users.table.header.number' })}</TableCell>
                    <TableCell width="25%">{intl.formatMessage({ id: 'rbac.users.table.header.user' })}</TableCell>
                    <TableCell width="20%">{intl.formatMessage({ id: 'rbac.users.table.header.email' })}</TableCell>
                    <TableCell width="20%">{intl.formatMessage({ id: 'rbac.users.table.header.roles' })}</TableCell>
                    <TableCell width="15%">{intl.formatMessage({ id: 'rbac.users.table.header.affiliation' })}</TableCell>
                    <TableCell width="10%">{intl.formatMessage({ id: 'rbac.users.table.header.status' })}</TableCell>
                    <TableCell align="center" width="15%">{intl.formatMessage({ id: 'rbac.users.table.header.actions' })}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                        <CircularProgress />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                          {intl.formatMessage({ id: 'rbac.users.table.loading' })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 10 }}>
                        <Typography variant="h6" color="text.secondary">
                          {intl.formatMessage({ id: 'rbac.users.table.empty' })}
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => navigate('/rbac/users/create')}
                          sx={{ mt: 2 }}
                        >
                          {intl.formatMessage({ id: 'rbac.users.add' })}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user, index) => (
                      <TableRow key={user.id} hover>
                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                              {getInitials(user?.fullName || user?.username)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {user?.fullName || '-'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                @{user?.username || '-'}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {user?.email || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {user?.roles?.length > 0 ? (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {user.roles.slice(0, 3).map((role) => (
                                <Chip
                                  key={role?.id || role?.name}
                                  label={role?.nameAr || role?.name || '-'}
                                  size="small"
                                  color={getRoleColor(role?.name)}
                                  variant="outlined"
                                  icon={<AdminPanelSettingsIcon sx={{ fontSize: '14px !important' }} />}
                                />
                              ))}
                              {user.roles.length > 3 && (
                                <Chip label={`+${user.roles.length - 3}`} size="small" variant="outlined" />
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              {intl.formatMessage({ id: 'rbac.users.table.noRoles' })}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {user?.roles?.some((r) => r.name === 'PROVIDER') && user?.allowAllCompanies ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <HomeIcon sx={{ fontSize: 16, color: 'success.main' }} />
                              <Typography variant="body2" color="success.main" fontWeight="bold">
                                {intl.formatMessage({ id: 'rbac.users.affiliation.waadFull' })}
                              </Typography>
                            </Stack>
                          ) : user?.providerName ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <HospitalIcon sx={{ fontSize: 16, color: 'info.main' }} />
                              <Typography variant="body2">{user.providerName}</Typography>
                            </Stack>
                          ) : user?.roles?.some((r) => r.name === 'PROVIDER') && !user?.allowAllCompanies ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <HospitalIcon sx={{ fontSize: 16, color: 'error.main' }} />
                              <Typography variant="body2" color="error.main">
                                {intl.formatMessage({ id: 'rbac.users.affiliation.noProvider' })}
                              </Typography>
                            </Stack>
                          ) : user?.employerName ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <BusinessIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                              <Typography variant="body2">{user.employerName}</Typography>
                            </Stack>
                          ) : (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <HomeIcon sx={{ fontSize: 16, color: 'success.main' }} />
                              <Typography variant="body2" color="success.main" fontWeight="bold">
                                {intl.formatMessage({ id: 'rbac.users.affiliation.waad' })}
                              </Typography>
                            </Stack>
                          )}
                        </TableCell>
                        <TableCell>{getStatusChip(user)}</TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title={intl.formatMessage({ id: 'common.actions.view' })}>
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => navigate(`/rbac/users/${user.id}`)}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={intl.formatMessage({ id: 'common.actions.edit' })}>
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => navigate(`/rbac/users/${user.id}/edit`)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={user?.active !== false ? intl.formatMessage({ id: 'rbac.users.status.deactivate' }) : intl.formatMessage({ id: 'rbac.users.status.activate' })}>
                              <span>
                                <IconButton
                                  size="small"
                                  color={user?.active !== false ? 'warning' : 'success'}
                                  onClick={() => handleToggleClick(user)}
                                  disabled={isSuperAdmin(user)}
                                >
                                  {user?.active !== false ? (
                                    <BlockIcon fontSize="small" />
                                  ) : (
                                    <CheckCircleIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
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
              labelRowsPerPage={intl.formatMessage({ id: 'common.table.rowsPerPage' })}
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to} ${intl.formatMessage({ id: 'common.table.of' })} ${count !== -1 ? count : `${intl.formatMessage({ id: 'common.table.moreThan' })} ${to}`}`
              }
            />
          </MainCard>
        </Grid>
      </Grid>

      {/* Toggle Status Confirmation Dialog */}
      <ConfirmDialog
        open={toggleDialog.open}
        variant={toggleDialog.user?.active !== false ? 'warning' : 'confirm'}
        title={toggleDialog.user?.active !== false ? intl.formatMessage({ id: 'rbac.users.dialog.deactivateTitle' }) : intl.formatMessage({ id: 'rbac.users.dialog.activateTitle' })}
        message={
          toggleDialog.user?.active !== false
            ? intl.formatMessage({ id: 'rbac.users.dialog.deactivateMessage' }, { name: toggleDialog.user?.fullName || toggleDialog.user?.username })
            : intl.formatMessage({ id: 'rbac.users.dialog.activateMessage' }, { name: toggleDialog.user?.fullName || toggleDialog.user?.username })
        }
        confirmText={toggleDialog.user?.active !== false ? intl.formatMessage({ id: 'rbac.users.status.deactivate' }) : intl.formatMessage({ id: 'rbac.users.status.activate' })}
        onConfirm={handleToggleConfirm}
        onCancel={handleToggleClose}
        loading={toggling}
      />
    </Box>
  );
};

export default UsersList;
