/**
 * Unified Member View Page
 * 
 * Displays Principal member with expandable Dependents list.
 * Refactored to match UnifiedMemberCreate layout (Tabs).
 * 
 * @module UnifiedMemberView
 * @since 2026-01-11
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Avatar,
  Tooltip,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  FormControlLabel,
  Switch,
  useTheme
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Badge as BadgeIcon,
  ContactPhone as ContactPhoneIcon,
  Delete as DeleteIcon,
  DeleteOutline as DeleteOutlineIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  FamilyRestroom as FamilyRestroomIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  Print as PrintIcon,
  QrCode as QrCodeIcon,
  RestoreFromTrash as RestoreFromTrashIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TablePagination } from '@mui/material';
import dayjs from 'dayjs';

import { openSnackbar } from 'api/snackbar';

import { MEMBERS_AR } from 'locales/ar/members.ar';
import { COMMON_AR } from 'locales/ar/common.ar';

// Services
import { getMember, deleteMember, restoreMember } from 'services/api/unified-members.service';

// Project Components
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import RBACGuard from 'components/tba/RBACGuard';
import MemberAvatar from 'components/tba/MemberAvatar';
import DependentModal from './DependentModal';

// Constants
import { PERMISSIONS } from 'constants/permissions.constants';
import { MEMBER_TYPES, GENDERS } from 'services/api/unified-members.service';

// Relationship Translation Map (using centralized i18n)
export const RELATIONSHIP_AR = {
  WIFE: MEMBERS_AR.relationships.wife,
  HUSBAND: MEMBERS_AR.relationships.husband,
  SON: MEMBERS_AR.relationships.son,
  DAUGHTER: MEMBERS_AR.relationships.daughter,
  FATHER: MEMBERS_AR.relationships.father,
  MOTHER: MEMBERS_AR.relationships.mother,
  BROTHER: MEMBERS_AR.relationships.brother,
  SISTER: MEMBERS_AR.relationships.sister
};

/**
 * Unified Member View Component
 */
const UnifiedMemberView = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [dependents, setDependents] = useState([]);
  const [tabValue, setTabValue] = useState(0);

  // Refactored Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDependent, setSelectedDependent] = useState(null); // null = Add Mode
  const [showDeleted, setShowDeleted] = useState(false);

  // Pagination
  const [pg, setPg] = useState(0);
  const [rpp, setRpp] = useState(3);

  // Dialog States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingMember, setDeletingMember] = useState(null);

  const handleChangePage = (event, newPage) => {
    setPg(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRpp(parseInt(event.target.value, 10));
    setPg(0);
  };

  useEffect(() => {
    if (id) {
      fetchMemberData();
    }
  }, [id]);

  const fetchMemberData = async () => {
    setLoading(true);
    try {
      const response = await getMember(id);
      setMember(response);
      setDependents(response.dependents || []);
    } catch (error) {
      console.error('Error fetching member:', error);
      openSnackbar({
        open: true,
        message: MEMBERS_AR.errors.loadFailed,
        variant: 'alert',
        alert: { color: 'error' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // --- Action Handlers ---
  const handleAddClick = () => {
    setSelectedDependent(null);
    setModalOpen(true);
  };

  const handleEditClick = (dep) => {
    setSelectedDependent(dep);
    setModalOpen(true);
  };

  const handleModalSave = () => {
    fetchMemberData();
    setModalOpen(false);
  };

  const handleRestore = async (id) => {
    try {
      await restoreMember(id);
      fetchMemberData(); // Refresh list
    } catch (error) {
      console.error('Error restoring member:', error);
    }
  };

  const handleDeleteConfirm = (targetMember) => {
    setDeletingMember(targetMember);
    setDeleteDialogOpen(true);
  };

  const handleDeleteExecute = async () => {
    if (!deletingMember) return;

    try {
      await deleteMember(deletingMember.id);

      const isPrincipal = deletingMember.type === MEMBER_TYPES.PRINCIPAL;

      openSnackbar({
        open: true,
        message: isPrincipal
          ? MEMBERS_AR.success.deleted
          : MEMBERS_AR.success.dependentDeleted,
        variant: 'alert',
        alert: { color: 'success' }
      });

      if (isPrincipal) {
        navigate('/members');
      } else {
        fetchMemberData();
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      openSnackbar({
        open: true,
        message: error.response?.data?.message || MEMBERS_AR.errors.deleteFailed,
        variant: 'alert',
        alert: { color: 'error' }
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingMember(null);
    }
  };



  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!member) {
    return (
      <Box>
        <Alert severity="error">{MEMBERS_AR.errors.notFound}</Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/members')} sx={{ mt: 2 }}>
          {MEMBERS_AR.buttons.back}
        </Button>
      </Box>
    );
  }

  const isPrincipal = member.type === MEMBER_TYPES.PRINCIPAL;


  return (
    <RBACGuard requiredPermissions={[PERMISSIONS.MEMBER_VIEW]}>
      <ModernPageHeader
        title={member.fullName}
        subtitle={isPrincipal ? MEMBERS_AR.statuses.principal || 'منتفع رئيسي' : MEMBERS_AR.statuses.dependent || 'منتفع تابع'}
        icon={isPrincipal ? <BadgeIcon /> : <FamilyRestroomIcon />}
        breadcrumbs={[
          { label: COMMON_AR.labels?.home || 'الرئيسية', href: '/' },
          { label: MEMBERS_AR.titles.list, href: '/members' },
          { label: member.fullName }
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/members')}>
              {MEMBERS_AR.buttons.back}
            </Button>
            <RBACGuard requiredPermissions={[PERMISSIONS.MANAGE_MEMBERS]}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/members/${id}/edit`)}
              >
                {MEMBERS_AR.buttons.edit}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleDeleteConfirm(member)}
              >
                {MEMBERS_AR.buttons.delete}
              </Button>
            </RBACGuard>
          </Stack>
        }
      />

      <MainCard
        content={false}
        sx={{
          height: 'calc(100vh - 180px)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="member tabs"
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                minHeight: 48,
                fontSize: theme.typography.body2.fontSize,
                fontWeight: 500,
                color: 'text.secondary',
                transition: 'all 0.2s',
                px: 3,
                '&.Mui-selected': {
                  color: 'primary.main',
                  bgcolor: 'primary.lighter',
                  fontWeight: 600
                }
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab label={MEMBERS_AR.tabs.personalInfo} icon={<PersonIcon />} iconPosition="start" />
            {isPrincipal && <Tab label={`${MEMBERS_AR.tabs.dependents} (${dependents.length})`} icon={<FamilyRestroomIcon />} iconPosition="start" />}
          </Tabs>
        </Box>

        {/* Scrollable Content Area */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>

          {/* Tab 0: Personal Info */}
          <div role="tabpanel" hidden={tabValue !== 0}>
            {tabValue === 0 && (
              <Grid container spacing={2}>
                {/* Side: Photo & IDs (Stretches across both rows) */}
                <Grid size={{ xs: 12, md: 3 }} sx={{ display: 'flex' }}>
                  <Paper variant="outlined" sx={{ p: 1.5, flex: 1, bgcolor: 'grey.50', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <MemberAvatar member={member} size={110} sx={{ mb: 1.5 }} />

                    <Stack spacing={1.5} alignItems="center" width="100%">
                      <Stack direction="row" spacing={1.5} justifyContent="center" width="100%">
                        <Chip label={isPrincipal ? MEMBERS_AR.statuses.principal || 'رئيسي' : MEMBERS_AR.statuses.dependent || 'تابع'} color={isPrincipal ? 'primary' : 'secondary'} size="small" sx={{ height: 24, fontSize: '0.75rem' }} />
                        <Chip label={member.status === 'ACTIVE' ? MEMBERS_AR.statuses.active : member.status} color={member.status === 'ACTIVE' ? 'success' : 'default'} size="small" sx={{ height: 24, fontSize: '0.75rem' }} />
                      </Stack>

                      <Divider flexItem sx={{ width: '100%', my: 0.5 }} />

                      <Box sx={{ width: '100%', textAlign: 'center', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
                        <Typography variant="caption" color="text.secondary" display="block" fontWeight="600">{MEMBERS_AR.labels.cardNumber}</Typography>
                        <Typography variant="subtitle2" fontFamily="monospace" fontWeight="bold" sx={{ mt: 0.5 }}>{member.cardNumber || '-'}</Typography>
                      </Box>

                      {isPrincipal && member.barcode && (
                        <Box sx={{ width: '100%', textAlign: 'center', p: 1, bgcolor: 'primary.lighter', border: '1px solid', borderColor: 'primary.light', borderRadius: 1 }}>
                          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ mb: 0.5 }}>
                            <QrCodeIcon color="primary" sx={{ fontSize: 18 }} />
                            <Typography variant="caption" color="primary.main" fontWeight="600">Barcode</Typography>
                          </Stack>
                          <Typography variant="subtitle2" color="primary.main" fontWeight="bold" fontFamily="monospace">{member.barcode}</Typography>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                </Grid>

                {/* Content: Personal Info (Row 1) + Secondary Info (Row 2) */}
                <Grid size={{ xs: 12, md: 9 }}>
                  <Stack spacing={2}>
                    {/* Personal Info Card */}
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>البيانات الشخصية</Typography>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Typography variant="caption" color="text.secondary">{MEMBERS_AR.labels.fullName}</Typography>
                          <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1.2 }}>{member.fullName}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary">{MEMBERS_AR.labels.nationalNumber}</Typography>
                          <Typography variant="body2" fontFamily="monospace">{member.nationalNumber || '-'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 2 }}>
                          <Typography variant="caption" color="text.secondary">{MEMBERS_AR.labels.nationality}</Typography>
                          <Typography variant="body2">{member.nationality || '-'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="caption" color="text.secondary">{MEMBERS_AR.labels.birthDate}</Typography>
                          <Typography variant="body2">{member.birthDate || '-'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 2 }}>
                          <Typography variant="caption" color="text.secondary">{MEMBERS_AR.labels.gender}</Typography>
                          <Typography variant="body2">{member.gender === GENDERS.MALE ? MEMBERS_AR.genders.male : member.gender === GENDERS.FEMALE ? MEMBERS_AR.genders.female : '-'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, md: 10 }}>
                          {member.notes && (
                            <Typography variant="caption" sx={{ display: 'block', bgcolor: 'warning.lighter', color: 'warning.dark', p: 0.5, borderRadius: 0.5 }}>
                              ملاحظات: {member.notes}
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    </Paper>

                    {/* Employment & Contact Container */}
                    <Grid container spacing={2}>
                      {isPrincipal && (
                        <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}>
                          <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                              <BadgeIcon fontSize="small" color="action" />
                              <Typography variant="subtitle2" fontWeight="bold">بيانات العمل</Typography>
                            </Stack>
                            <Stack spacing={1.5}>
                              <Box>
                                <Typography variant="caption" color="text.secondary">{MEMBERS_AR.labels.employer}</Typography>
                                <Typography variant="body2" fontWeight="medium">{member.employerName || '-'}</Typography>
                              </Box>
                              <Grid container>
                                <Grid size={6}>
                                  <Typography variant="caption" color="text.secondary">{MEMBERS_AR.labels.employeeNumber}</Typography>
                                  <Typography variant="body2" fontFamily="monospace">{member.employeeNumber || '-'}</Typography>
                                </Grid>
                                <Grid size={6}>
                                  <Typography variant="caption" color="text.secondary">{MEMBERS_AR.labels.occupation}</Typography>
                                  <Typography variant="body2">{member.occupation || '-'}</Typography>
                                </Grid>
                              </Grid>
                            </Stack>
                          </Paper>
                        </Grid>
                      )}

                      <Grid size={{ xs: 12, md: isPrincipal ? 6 : 12 }} sx={{ display: 'flex' }}>
                        <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
                          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                            <ContactPhoneIcon fontSize="small" color="action" />
                            <Typography variant="subtitle2" fontWeight="bold">معلومات الاتصال</Typography>
                          </Stack>
                          <Stack spacing={2}>
                            <Grid container>
                              <Grid size={6}>
                                <Typography variant="caption" color="text.secondary">{MEMBERS_AR.labels.phone}</Typography>
                                <Typography variant="body2" dir="ltr">{member.phone || '-'}</Typography>
                              </Grid>
                              <Grid size={6}>
                                <Typography variant="caption" color="text.secondary">{MEMBERS_AR.labels.email}</Typography>
                                <Typography variant="caption" display="block" sx={{ wordBreak: 'break-all' }}>{member.email || '-'}</Typography>
                              </Grid>
                            </Grid>
                            <Box>
                              <Typography variant="caption" color="text.secondary">{MEMBERS_AR.labels.address}</Typography>
                              <Typography variant="body2">{member.address || '-'}</Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Stack>
                </Grid>
              </Grid>
            )}
          </div>

          {/* Tab 1: Dependents (Principal Only) */}
          <div role="tabpanel" hidden={tabValue !== 1}>
            {tabValue === 1 && isPrincipal && (
              <Stack spacing={3}>
                {/* Header Actions */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">{MEMBERS_AR.titles.manageDependents}</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showDeleted}
                          onChange={(e) => setShowDeleted(e.target.checked)}
                          color="warning"
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" color={showDeleted ? 'warning.main' : 'text.secondary'}>
                          {MEMBERS_AR.buttons.showDeleted || 'عرض المحذوفات'}
                        </Typography>
                      }
                    />
                  </Stack>
                  <RBACGuard requiredPermissions={[PERMISSIONS.MANAGE_MEMBERS]}>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleAddClick}
                      disabled={showDeleted} // Disable add in deleted view
                    >
                      {MEMBERS_AR.buttons.addDependent}
                    </Button>
                  </RBACGuard>
                </Stack>

                <Divider />

                {/* Dependents List */}
                <Box>
                  {dependents.length === 0 ? (
                    <Typography variant="body2" align="center" color="text.secondary" sx={{ py: 3 }}>
                      لا يوجد تابعين مسجلين حالياً.
                    </Typography>
                  ) : (
                    <>
                      <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ minHeight: 230 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell align="center">#</TableCell>
                              <TableCell align="center">{MEMBERS_AR.labels.photo}</TableCell>
                              <TableCell align="center">{MEMBERS_AR.tableHeaders.name}</TableCell>
                              <TableCell align="center">{MEMBERS_AR.tableHeaders.relationship}</TableCell>
                              <TableCell align="center">{MEMBERS_AR.tableHeaders.cardNumber}</TableCell>
                              <TableCell align="center">{MEMBERS_AR.tableHeaders.nationalNumber}</TableCell>
                              <TableCell align="center">{MEMBERS_AR.tableHeaders.gender}</TableCell>
                              <TableCell align="center">{MEMBERS_AR.tableHeaders.birthDate}</TableCell>
                              <TableCell align="center">{MEMBERS_AR.tableHeaders.status}</TableCell>
                              <TableCell align="center">{MEMBERS_AR.tableHeaders.actions}</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dependents
                              // TODO: Improve filter logic if backend provides 'deleted' flag. 
                              // For now, assuming deleted members are not returned by default OR we filter by status if soft deleted manually.
                              // If 'restore' feature is needed, we must ensure deleted members are FETCHED.
                              // Assuming for now that we filter based on a hypothetical 'deleted' property or specific status if available.
                              .filter(dep => showDeleted ? dep.active === false || dep.status === 'TERMINATED' : dep.status !== 'TERMINATED')
                              .slice(pg * rpp, pg * rpp + rpp)
                              .map((dep, index) => (
                                <TableRow key={dep.id} hover>
                                  <TableCell align="center">{pg * rpp + index + 1}</TableCell>
                                  <TableCell align="center">
                                    <MemberAvatar member={dep} size={32} />
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" fontWeight="medium">{dep.fullName}</Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip label={RELATIONSHIP_AR[dep.relationship] || dep.relationship} size="small" variant="outlined" color="primary" />
                                  </TableCell>
                                  <TableCell align="center">{dep.cardNumber || '-'}</TableCell>
                                  <TableCell align="center">{dep.nationalNumber || dep.civilId || '-'}</TableCell>
                                  <TableCell align="center">
                                    {dep.gender === GENDERS.MALE ? MEMBERS_AR.genders.male : dep.gender === GENDERS.FEMALE ? MEMBERS_AR.genders.female : '-'}
                                  </TableCell>
                                  <TableCell align="center">{dep.birthDate || '-'}</TableCell>
                                  <TableCell align="center">
                                    <Chip
                                      label={dep.status === 'ACTIVE' ? MEMBERS_AR.statuses.active : dep.status}
                                      color={dep.status === 'ACTIVE' ? 'success' : 'default'}
                                      size="small"
                                      sx={{ height: 24 }}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Stack direction="row" spacing={1} justifyContent="center">
                                      {showDeleted ? (
                                        <RBACGuard requiredPermissions={[PERMISSIONS.MANAGE_MEMBERS]}>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            color="warning"
                                            onClick={() => handleRestore(dep.id)}
                                            startIcon={<RestoreFromTrashIcon />}
                                          >
                                            {MEMBERS_AR.buttons.restore}
                                          </Button>
                                        </RBACGuard>
                                      ) : (
                                        <>
                                          <Tooltip title="عرض التفاصيل">
                                            <IconButton size="small" color="primary" onClick={() => navigate(`/members/${dep.id}`)}>
                                              <BadgeIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                          <RBACGuard requiredPermissions={[PERMISSIONS.MANAGE_MEMBERS]}>
                                            <Tooltip title="تعديل">
                                              <IconButton size="small" color="secondary" onClick={() => handleEditClick(dep)}>
                                                <EditIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="حذف">
                                              <IconButton size="small" color="error" onClick={() => handleDeleteConfirm(dep)}>
                                                <DeleteIcon fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                          </RBACGuard>
                                        </>
                                      )}
                                    </Stack>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <TablePagination
                        rowsPerPageOptions={[3, 6, 9]}
                        component="div"
                        count={dependents.length}
                        rowsPerPage={rpp}
                        page={pg}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage={COMMON_AR.labels?.rowsPerPage || 'صفوف لكل صفحة:'}
                        labelDisplayedRows={({ from, to, count }) => `${from}-${to} ${COMMON_AR.labels?.of || 'من'} ${count}`}
                      />
                    </>
                  )}
                </Box>
              </Stack>
            )}
          </div>
        </Box>
      </MainCard >

      <DependentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        principalId={member?.id}
        dependent={selectedDependent}
        onSave={handleModalSave}
      />

      {/* Delete Confirmation Dialog */}
      < Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>{MEMBERS_AR.confirmations.deleteTitle || 'تأكيد الحذف'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deletingMember?.type === MEMBER_TYPES.PRINCIPAL ? (
              <>
                {MEMBERS_AR.confirmations.deletePrincipal.replace('{name}', deletingMember?.fullName)}
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <strong>تنبيه:</strong> {MEMBERS_AR.info.cascadeDeleteNotice.replace('{count}', member.dependentsCount || 0)}
                </Alert>
              </>
            ) : (
              <>
                {MEMBERS_AR.confirmations.deleteDependent.replace('{name}', deletingMember?.fullName)}
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{COMMON_AR.actions.cancel}</Button>
          <Button onClick={handleDeleteExecute} color="error" variant="contained" autoFocus>
            {MEMBERS_AR.buttons.delete}
          </Button>
        </DialogActions>

      </Dialog >


    </RBACGuard >
  );
};

export default UnifiedMemberView;
