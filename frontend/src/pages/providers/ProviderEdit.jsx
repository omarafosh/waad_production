import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { getEmployerSelectors } from 'services/api/employers.service';
import { providersService } from 'services/api/providers.service';
import { usersService } from 'services/rbac/users.service';
import { rolesService } from 'services/rbac/roles.service';
import { useTableRefresh } from 'contexts/TableRefreshContext';
import {
    Box,
    Button,
    Grid,
    TextField,
    MenuItem,
    Typography,
    Tabs,
    Tab,
    Paper,
    Divider,
    Alert,
    InputAdornment,
    Chip,
    Switch,
    FormControlLabel,
    Avatar,
    Stack,
    IconButton,
    CircularProgress,
    Autocomplete,
    Card,
    CardContent,
    CardActions,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination
} from '@mui/material';
import {
    ArrowBack,
    Save,
    LocalHospital as ProviderIcon,
    Business,
    LocationOn,
    Phone,
    Description,
    Handshake,
    People,
    Person,
    Lock,
    VpnKey,
    Block,
    CheckCircle,
    VerifiedUser,
    Link as LinkIcon,
    LinkOff,
    PersonAdd,
    Email,
    Add as AddIcon,
    Delete as DeleteIcon,
    Visibility,
    Warning
} from '@mui/icons-material';
import GregorianDatePicker from 'components/common/GregorianDatePicker';
import MainCard from 'components/MainCard';
import ModernPageHeader from 'components/tba/ModernPageHeader';
import RBACGuard from 'components/tba/RBACGuard';
import { PERMISSIONS } from 'constants/permissions.constants';
import { useProviderDetails, useUpdateProvider } from 'hooks/useProviders';

const PROVIDER_TYPES = [
    { value: 'HOSPITAL', label: 'مستشفى' },
    { value: 'CLINIC', label: 'عيادة' },
    { value: 'LAB', label: 'مختبر' },
    { value: 'PHARMACY', label: 'صيدلية' },
    { value: 'RADIOLOGY', label: 'مركز أشعة' }
];

const NETWORK_STATUS_OPTIONS = [
    { value: 'IN_NETWORK', label: 'داخل الشبكة', description: 'مقدم خدمة معتمد داخل الشبكة' },
    { value: 'OUT_OF_NETWORK', label: 'خارج الشبكة', description: 'مقدم خدمة خارج الشبكة' },
    { value: 'PREFERRED', label: 'مزود مفضل', description: 'مقدم خدمة مفضل بخصومات أعلى' }
];

const ProviderEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();
    const { provider, loading } = useProviderDetails(id);
    const { update, updating } = useUpdateProvider();
    const { triggerRefresh } = useTableRefresh();

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────────────────────────────────

    const [activeTab, setActiveTab] = useState(0);

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        licenseNumber: '',
        taxNumber: '',
        city: '',
        address: '',
        phone: '',
        email: '',
        providerType: '',
        networkStatus: '',
        contractStartDate: '',
        contractEndDate: '',
        defaultDiscountRate: '',
        active: true,
        allowAllEmployers: false
    });
    const [errors, setErrors] = useState({});

    // Partners / Payers State
    const [payers, setPayers] = useState([]);
    const [loadingPayers, setLoadingPayers] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, payerId: null, action: 'enable', payerName: '' });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(3);

    // Documents State
    const [documents, setDocuments] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [docDialog, setDocDialog] = useState({ open: false, type: 'LICENSE', expiryDate: '', notes: '', fileName: '', file: null });
    const [deleteDocDialog, setDeleteDocDialog] = useState({ open: false, docId: null });
    const [previewDialog, setPreviewDialog] = useState({ open: false, url: '', title: '' });
    const [previewLoading, setPreviewLoading] = useState(false);
    const [docPage, setDocPage] = useState(0);
    const [docRowsPerPage, setDocRowsPerPage] = useState(3);

    const DOC_TYPE_LABELS = {
        'LICENSE': 'رخصة مزاولة مهنة',
        'COMMERCIAL_REGISTER': 'سجل تجاري',
        'TAX_CERTIFICATE': 'شهادة ضريبية',
        'CONTRACT_COPY': 'نسخة العقد',
        'OTHER': 'أخرى'
    };

    // User Management State (Single Responsible)
    const [activeUser, setActiveUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(false);
    const [linkMode, setLinkMode] = useState('LINK'); // 'LINK' | 'CREATE'
    const [unassignedUsers, setUnassignedUsers] = useState([]);
    const [selectedUserToLink, setSelectedUserToLink] = useState(null);
    const [loadingUnassigned, setLoadingUnassigned] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ username: '', password: '', confirmPassword: '', fullName: '' });

    // Unlink Dialog Confirmation State
    const [unlinkDialog, setUnlinkDialog] = useState({ open: false, confirmationText: '' });

    // ─────────────────────────────────────────────────────────────────────────────
    // EFFECTS
    // ─────────────────────────────────────────────────────────────────────────────

    // Load Provider Data
    useEffect(() => {
        if (provider) {
            setFormData({
                name: provider.name || '',
                licenseNumber: provider.licenseNumber || '',
                taxNumber: provider.taxNumber || '',
                city: provider.city || '',
                address: provider.address || '',
                phone: provider.phone || '',
                email: provider.email || '',
                providerType: provider.providerType || '',
                networkStatus: provider.networkStatus || '',
                contractStartDate: provider.contractStartDate || '',
                contractEndDate: provider.contractEndDate || '',
                defaultDiscountRate: provider.defaultDiscountRate || '',
                active: provider.active !== undefined ? provider.active : true,
                allowAllEmployers: provider.allowAllEmployers || false
            });
        }
    }, [provider]);

    // Load Payers
    useEffect(() => {
        const loadPartnersData = async () => {
            if (!id) return;
            setLoadingPayers(true);
            try {
                const employersRes = await getEmployerSelectors();
                const allEmployers = Array.isArray(employersRes) ? employersRes : (employersRes.data || []);
                const allowedIds = await providersService.getAllowedEmployerIds(id);
                const allowedSet = new Set(Array.isArray(allowedIds) ? allowedIds : []);

                const mapped = allEmployers.map(emp => ({
                    id: emp.id || emp.value,
                    name: emp.label || emp.name,
                    code: emp.code || 'EMP',
                    logo: (emp.label || emp.name || 'X').charAt(0).toUpperCase(),
                    enabled: allowedSet.has(emp.id || emp.value)
                }));
                setPayers(mapped);
            } catch (error) {
                console.error(error);
                enqueueSnackbar('فشل تحميل بيانات الشركاء', { variant: 'error' });
            } finally {
                setLoadingPayers(false);
            }
        };
        if (activeTab === 3) loadPartnersData();
    }, [activeTab, id, enqueueSnackbar]);

    // Load User
    const fetchLinkedUser = async () => {
        if (!id) return;
        setLoadingUser(true);
        try {
            const users = await usersService.getUsersByProvider(id);
            if (Array.isArray(users) && users.length > 0) {
                setActiveUser(users[0]);
            } else {
                setActiveUser(null);
                fetchUnassignedUsers();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingUser(false);
        }
    };

    const fetchUnassignedUsers = async () => {
        setLoadingUnassigned(true);
        try {
            const users = await usersService.getUnassignedProviders();
            setUnassignedUsers(users || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingUnassigned(false);
        }
    };

    useEffect(() => {
        if (activeTab === 4) fetchLinkedUser();
    }, [activeTab, id]);

    // Load Documents
    const fetchDocuments = async () => {
        try {
            setLoadingDocs(true);
            const docs = await providersService.getDocuments(id);
            setDocuments(docs || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingDocs(false);
        }
    };

    useEffect(() => {
        if (activeTab === 5 && id) fetchDocuments();
    }, [activeTab, id]);

    // ─────────────────────────────────────────────────────────────────────────────
    // HANDLERS
    // ─────────────────────────────────────────────────────────────────────────────

    // Form Handlers
    const handleChange = (field) => (event) => {
        setFormData({ ...formData, [field]: event.target.value });
        if (errors[field]) setErrors({ ...errors, [field]: '' });
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name) newErrors.name = 'اسم مقدم الخدمة مطلوب';
        if (!formData.licenseNumber) newErrors.licenseNumber = 'رقم الترخيص مطلوب';
        if (!formData.providerType) newErrors.providerType = 'نوع المزود مطلوب';
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'بريد غير صحيح';
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) setActiveTab(0);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        const payload = { ...formData, allowedPayers: payers.filter(p => p.enabled).map(p => p.id) };
        const result = await update(id, payload);
        if (result.success) {
            enqueueSnackbar('تم التحديث بنجاح', { variant: 'success' });
            triggerRefresh();
            navigate('/providers');
        } else {
            enqueueSnackbar(result.error || 'فشل التحديث', { variant: 'error' });
        }
    };

    // Partners Handlers
    const handlePayerToggleRequest = (payer) => {
        setConfirmDialog({ open: true, payerId: payer.id, action: payer.enabled ? 'disable' : 'enable', payerName: payer.name });
    };

    const handleConfirmToggle = () => {
        const { payerId } = confirmDialog;
        setPayers(prev => prev.map(p => p.id === payerId ? { ...p, enabled: !p.enabled } : p));
        setConfirmDialog({ ...confirmDialog, open: false });
        triggerRefresh(); // Notify other tabs that partner visibility changed
    };

    // User Link/Unlink Handlers
    const handleUnlinkUser = async () => {
        if (!activeUser) return;
        try {
            setLoadingUser(true);
            const rawUserRes = await usersService.getUserById(activeUser.id);
            const userDto = rawUserRes?.data?.data || rawUserRes?.data || rawUserRes;
            await usersService.updateUser(activeUser.id, { ...userDto, providerId: null });
            enqueueSnackbar('تم فك الارتباط بنجاح', { variant: 'success' });
            setActiveUser(null);
            fetchUnassignedUsers();
        } catch (error) {
            enqueueSnackbar('فشل فك الارتباط', { variant: 'error' });
        } finally {
            setLoadingUser(false);
        }
    };

    const handleLinkUser = async () => {
        if (!selectedUserToLink) {
            enqueueSnackbar('اختر مستخدماً للربط', { variant: 'warning' });
            return;
        }
        try {
            setLoadingUser(true);
            const rawUserRes = await usersService.getUserById(selectedUserToLink.id);
            const userDto = rawUserRes?.data?.data || rawUserRes?.data || rawUserRes;
            await usersService.updateUser(selectedUserToLink.id, { ...userDto, providerId: id });
            enqueueSnackbar('تم الربط بنجاح', { variant: 'success' });
            fetchLinkedUser();
        } catch (error) {
            enqueueSnackbar('فشل الربط', { variant: 'error' });
            setLoadingUser(false);
        }
    };

    const handleCreateAndLinkUser = async () => {
        const { username, password, confirmPassword, fullName } = newUserForm;
        if (!username || !password) return;
        if (password !== confirmPassword) {
            enqueueSnackbar('كلمة المرور غير متطابقة', { variant: 'error' });
            return;
        }
        try {
            setLoadingUser(true);
            const userPayload = {
                username, password, fullName: fullName || formData.name,
                email: `${username}@provider.local`, providerId: id, enabled: true
            };
            const userRes = await usersService.createUser(userPayload);
            const userId = userRes?.data?.data?.id || userRes?.data?.id || userRes?.id;
            if (userId) {
                const rolesRes = await rolesService.getAllRoles();
                const providerRole = (rolesRes?.data?.data || rolesRes?.data || []).find(r => r.name === 'PROVIDER');
                if (providerRole) await usersService.assignRoles(userId, [providerRole.id]);
                enqueueSnackbar('تم إنشاء الحساب وربطه بنجاح', { variant: 'success' });
                setNewUserForm({ username: '', password: '', confirmPassword: '', fullName: '' });
                fetchLinkedUser();
            }
        } catch (error) {
            enqueueSnackbar('فشل إنشاء الحساب', { variant: 'error' });
            setLoadingUser(false);
        }
    };

    // Documents Handlers
    const handleAddDocument = async () => {
        if (!docDialog.fileName || !docDialog.type) {
            enqueueSnackbar('بيانات المستند ناقصة', { variant: 'warning' });
            return;
        }
        try {
            const formDataDocs = new FormData();
            const dto = {
                providerId: id, type: docDialog.type, fileName: docDialog.fileName,
                expiryDate: docDialog.expiryDate || null, notes: docDialog.notes,
                documentNumber: `DOC-${Date.now()}`
            };
            formDataDocs.append('data', new Blob([JSON.stringify(dto)], { type: 'application/json' }));
            if (docDialog.file) formDataDocs.append('file', docDialog.file);

            await providersService.addDocument(id, formDataDocs);
            enqueueSnackbar('تم الإضافة بنجاح', { variant: 'success' });
            setDocDialog({ open: false, type: 'LICENSE', expiryDate: '', notes: '', fileName: '', file: null });
            fetchDocuments();
        } catch (error) {
            enqueueSnackbar('فشل رفع المستند', { variant: 'error' });
        }
    };

    const handlePreview = async (doc) => {
        try {
            if (!doc.fileUrl) throw new Error('No URL');
            setPreviewLoading(true);
            setPreviewDialog({ open: true, url: '', title: doc.fileName });
            const blob = await providersService.downloadDocument(doc.fileUrl);
            const objectUrl = URL.createObjectURL(blob);
            setPreviewDialog({ open: true, url: objectUrl, title: doc.fileName });
        } catch (error) {
            enqueueSnackbar('فشل المعاينة', { variant: 'error' });
            setPreviewDialog({ ...previewDialog, open: false });
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleConfirmDeleteDoc = async () => {
        if (!deleteDocDialog.docId) return;
        try {
            await providersService.deleteDocument(id, deleteDocDialog.docId);
            enqueueSnackbar('تم الحذف بنجاح', { variant: 'success' });
            fetchDocuments();
        } catch {
            enqueueSnackbar('فشل الحذف', { variant: 'error' });
        } finally {
            setDeleteDocDialog({ open: false, docId: null });
        }
    };


    // ─────────────────────────────────────────────────────────────────────────────
    const handleOpenUnlinkDialog = () => {
        setUnlinkDialog({ open: true, confirmationText: '' });
    };

    const handleConfirmUnlink = async () => {
        if (!activeUser) return;

        if (unlinkDialog.confirmationText !== activeUser.username) {
            enqueueSnackbar('النص المدخل غير صحيح. يجب كتابة اسم المستخدم للتأكيد.', { variant: 'error' });
            return;
        }

        try {
            setLoadingUser(true);
            const rawUserRes = await usersService.getUserById(activeUser.id);
            const user = rawUserRes?.data?.data || rawUserRes?.data || rawUserRes;

            // Construct a clean UserUpdateDto payload
            const updatePayload = {
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                active: user.active,
                employerId: user.employerId,
                providerId: null, // Critical: Unlink
                allowAllCompanies: user.allowAllCompanies,
                permittedCompanyIds: user.permittedCompanies?.map(c => c.id) || []
            };

            await usersService.updateUser(activeUser.id, updatePayload);

            enqueueSnackbar('تم فك الارتباط بنجاح', { variant: 'success' });

            // Update local state and close dialog
            setActiveUser(null);
            setUnlinkDialog({ open: false, confirmationText: '' });

            // Refresh the unassigned list
            await fetchUnassignedUsers();
        } catch (error) {
            console.error('Unlink error:', error);
            enqueueSnackbar('فشل فك الارتباط: ' + (error.response?.data?.message || error.message), { variant: 'error' });
        } finally {
            setLoadingUser(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // RENDERERS
    // ─────────────────────────────────────────────────────────────────────────────

    const renderBasicInfo = () => (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Business color="primary" /> <Typography variant="h5">البيانات الأساسية</Typography>
            </Box>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <TextField fullWidth required label="اسم مقدم الخدمة" value={formData.name} onChange={handleChange('name')} error={!!errors.name} helperText={errors.name} />
                </Grid>
                <Grid item xs={12} md={6}><TextField fullWidth required label="رقم الترخيص" value={formData.licenseNumber} disabled /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="الرقم الضريبي" value={formData.taxNumber} onChange={handleChange('taxNumber')} /></Grid>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth required select label="نوع مقدم الخدمة" value={formData.providerType} onChange={handleChange('providerType')}>
                        {PROVIDER_TYPES.map(op => <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>)}
                    </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth select label="حالة الشبكة" value={formData.networkStatus} onChange={handleChange('networkStatus')}>
                        {NETWORK_STATUS_OPTIONS.map(op => <MenuItem key={op.value} value={op.value}>{op.label}</MenuItem>)}
                    </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField fullWidth select label="الحالة التشغيلية" value={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}>
                        <MenuItem value={true}>نشط</MenuItem><MenuItem value={false}>غير نشط</MenuItem>
                    </TextField>
                </Grid>
            </Grid>
        </Box>
    );

    const renderLocationContact = () => (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <LocationOn color="primary" /> <Typography variant="h5">الموقع والتواصل</Typography>
            </Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}><TextField fullWidth label="المدينة" value={formData.city} onChange={handleChange('city')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="العنوان" value={formData.address} onChange={handleChange('address')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="رقم الهاتف" value={formData.phone} onChange={handleChange('phone')} /></Grid>
                <Grid item xs={12} md={6}><TextField fullWidth label="البريد الإلكتروني" value={formData.email} onChange={handleChange('email')} error={!!errors.email} helperText={errors.email} /></Grid>
            </Grid>
        </Box>
    );

    const renderContractInfo = () => (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <VerifiedUser color="primary" /> <Typography variant="h5">معلومات العقد</Typography>
            </Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <GregorianDatePicker label="بداية العقد" name="contractStartDate" value={formData.contractStartDate} onChange={handleChange('contractStartDate')} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <GregorianDatePicker label="نهاية العقد" name="contractEndDate" value={formData.contractEndDate} onChange={handleChange('contractEndDate')} />
                </Grid>
                <Grid item xs={12} md={4}><TextField fullWidth type="number" label="نسبة الخصم %" value={formData.defaultDiscountRate} onChange={handleChange('defaultDiscountRate')} /></Grid>
            </Grid>
        </Box>
    );

    const renderPartners = () => (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex' }}><Handshake color="primary" sx={{ mr: 1 }} /> <Typography variant="h5">الشركاء</Typography></Box>
                <FormControlLabel control={<Switch checked={formData.allowAllEmployers} onChange={(e) => setFormData({ ...formData, allowAllEmployers: e.target.checked })} />} label="شبكة عامة" />
            </Box>
            {formData.allowAllEmployers ? (
                <Alert severity="success">وضع الشبكة العامة مفعل. جميع الجهات مسموح بها.</Alert>
            ) : loadingPayers ? <CircularProgress /> : (
                <>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead><TableRow><TableCell>شريك التأمين</TableCell><TableCell align="right">الحالة</TableCell></TableRow></TableHead>
                            <TableBody>
                                {payers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((payer) => (
                                    <TableRow key={payer.id}>
                                        <TableCell>{payer.name}</TableCell>
                                        <TableCell align="right">
                                            <Switch checked={payer.enabled} onChange={() => handlePayerToggleRequest(payer)} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[3, 5]} component="div" count={payers.length} rowsPerPage={rowsPerPage} page={page}
                        onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
                    />
                </>
            )}
        </Box>
    );

    const renderResponsibleUser = () => (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <People color="primary" /> <Typography variant="h5">مدير الحساب ({activeUser ? 'مرتبط' : 'غير مرتبط'})</Typography>
            </Box>
            {loadingUser ? <CircularProgress /> : activeUser ? (
                <Card variant="outlined" sx={{ maxWidth: 600, mx: 'auto', textAlign: 'center', p: 3 }}>
                    <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: 24 }}>{activeUser.fullName?.charAt(0)}</Avatar>
                    <Typography variant="h5">{activeUser.fullName}</Typography>
                    <Typography color="text.secondary" gutterBottom>{activeUser.email}</Typography>
                    <Chip label={activeUser.active ? 'نشط' : 'متوقف'} color={activeUser.active ? 'success' : 'error'} size="small" sx={{ mb: 2 }} />
                    <Divider sx={{ my: 2 }} />
                    <Button variant="outlined" color="error" startIcon={<LinkOff />} onClick={handleOpenUnlinkDialog}>فك الارتباط</Button>
                </Card>
            ) : (
                <Paper variant="outlined" sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
                    <Alert severity="warning" sx={{ mb: 3 }}>لا يوجد مدير حساب. يرجى الربط.</Alert>
                    <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                        <Button variant={linkMode === 'LINK' ? 'contained' : 'outlined'} onClick={() => setLinkMode('LINK')} startIcon={<LinkIcon />}>ربط موجود</Button>
                        <Button variant={linkMode === 'CREATE' ? 'contained' : 'outlined'} onClick={() => setLinkMode('CREATE')} startIcon={<PersonAdd />}>إنشاء جديد</Button>
                    </Stack>
                    {linkMode === 'LINK' ? (
                        <Box sx={{ maxWidth: 500, mx: 'auto' }}>
                            <Autocomplete
                                options={unassignedUsers} getOptionLabel={(o) => `${o.fullName} (${o.username})`}
                                loading={loadingUnassigned} value={selectedUserToLink} onChange={(e, v) => setSelectedUserToLink(v)}
                                renderInput={(p) => <TextField {...p} label="اختر مستخدماً" />} noOptionsText="لا يوجد مستخدمين"
                            />
                            <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={handleLinkUser} disabled={!selectedUserToLink}>ربط</Button>
                        </Box>
                    ) : (
                        <Grid container spacing={2} maxWidth="sm" sx={{ mx: 'auto' }}>
                            <Grid item xs={12}><TextField fullWidth label="الاسم الكامل" value={newUserForm.fullName} onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })} /></Grid>
                            <Grid item xs={12}><TextField fullWidth label="اسم المستخدم" value={newUserForm.username} onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })} /></Grid>
                            <Grid item xs={12}><TextField fullWidth type="password" label="كلمة المرور" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} /></Grid>
                            <Grid item xs={12}><TextField fullWidth type="password" label="تأكيد" value={newUserForm.confirmPassword} onChange={(e) => setNewUserForm({ ...newUserForm, confirmPassword: e.target.value })} /></Grid>
                            <Grid item xs={12}><Button fullWidth variant="contained" onClick={handleCreateAndLinkUser}>إنشاء وربط</Button></Grid>
                        </Grid>
                    )}
                </Paper>
            )}
        </Box>
    );

    const renderDocuments = () => (
        <Box sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex' }}><Description color="primary" sx={{ mr: 1 }} /> <Typography variant="h5">المستندات</Typography></Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDocDialog({ ...docDialog, open: true })}> إضافة</Button>
            </Box>
            {loadingDocs ? <CircularProgress /> : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead><TableRow><TableCell>اسم الملف</TableCell><TableCell>النوع</TableCell><TableCell>تاريخ الانتهاء</TableCell><TableCell>اجراءات</TableCell></TableRow></TableHead>
                        <TableBody>
                            {documents.slice(docPage * docRowsPerPage, docPage * docRowsPerPage + docRowsPerPage).map((doc) => (
                                <TableRow key={doc.id}>
                                    <TableCell>{doc.fileName}</TableCell>
                                    <TableCell><Chip label={DOC_TYPE_LABELS[doc.type] || doc.type} size="small" /></TableCell>
                                    <TableCell>{doc.expiryDate || '-'}</TableCell>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => handlePreview(doc)}><Visibility fontSize="small" /></IconButton>
                                        <IconButton size="small" color="error" onClick={() => setDeleteDocDialog({ open: true, docId: doc.id })}><DeleteIcon fontSize="small" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {documents.length === 0 && <TableRow><TableCell colSpan={4} align="center">لا يوجد مستندات</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            <TablePagination
                rowsPerPageOptions={[3]} component="div" count={documents.length} rowsPerPage={docRowsPerPage} page={docPage}
                onPageChange={(_, p) => setDocPage(p)} onRowsPerPageChange={(e) => setDocRowsPerPage(parseInt(e.target.value))}
            />
        </Box>
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN RENDER
    // ─────────────────────────────────────────────────────────────────────────────

    if (loading) return <CircularProgress />;

    return (
        <>
            <ModernPageHeader
                title="تعديل مقدم الخدمة" subtitle={provider?.name} icon={ProviderIcon}
                breadcrumbs={[{ label: 'مقدمو الخدمات', path: '/providers' }, { label: 'تعديل' }]}
                actions={
                    <Stack direction="row" spacing={2}>
                        <Button startIcon={<ArrowBack />} onClick={() => navigate('/providers')}>عودة</Button>
                        <RBACGuard requiredPermissions={[PERMISSIONS.MANAGE_PROVIDERS]}>
                            <Button variant="contained" startIcon={<Save />} onClick={handleSubmit} disabled={updating}>حفظ</Button>
                        </RBACGuard>
                    </Stack>
                }
            />

            <MainCard>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tab icon={<Business />} label="أساسي" iconPosition="start" />
                    <Tab icon={<LocationOn />} label="موقع" iconPosition="start" />
                    <Tab icon={<VerifiedUser />} label="عقود" iconPosition="start" />
                    <Tab icon={<Handshake />} label="شركاء" iconPosition="start" />
                    <Tab icon={<People />} label="مدير الحساب" iconPosition="start" />
                    <Tab icon={<Description />} label="مستندات" iconPosition="start" />
                </Tabs>
                <Box sx={{ minHeight: 400 }}>
                    {activeTab === 0 && renderBasicInfo()}
                    {activeTab === 1 && renderLocationContact()}
                    {activeTab === 2 && renderContractInfo()}
                    {activeTab === 3 && renderPartners()}
                    {activeTab === 4 && renderResponsibleUser()}
                    {activeTab === 5 && renderDocuments()}
                </Box>
            </MainCard>

            {/* Dialogs */}
            {/* Unlink Strict Confirmation Dialog */}
            <Dialog open={unlinkDialog.open} onClose={() => setUnlinkDialog({ open: false, confirmationText: '' })}>
                <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning /> تأكيد فك ارتباط المسؤول
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        هل أنت متأكد من رغبتك في فك ارتباط المستخدم <strong>{activeUser?.fullName}</strong> ({activeUser?.username})؟
                        <br />
                        سيؤدي هذا إلى إيقاف وصوله إلى لوحة تحكم هذا المزود فوراً.
                    </DialogContentText>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        للتأكيد، يرجى كتابة اسم المستخدم: <strong>{activeUser?.username}</strong>
                    </Alert>
                    <TextField
                        fullWidth
                        autoFocus
                        label="اكتب اسم المستخدم للتأكيد"
                        value={unlinkDialog.confirmationText}
                        onChange={(e) => setUnlinkDialog({ ...unlinkDialog, confirmationText: e.target.value })}
                        placeholder={activeUser?.username}
                        error={unlinkDialog.confirmationText !== '' && unlinkDialog.confirmationText !== activeUser?.username}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUnlinkDialog({ open: false, confirmationText: '' })}>إلغاء</Button>
                    <Button
                        onClick={handleConfirmUnlink}
                        variant="contained"
                        color="error"
                        disabled={unlinkDialog.confirmationText !== activeUser?.username}
                    >
                        تأكيد فك الارتباط
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialogs */}
            {/* Unlink Strict Confirmation Dialog */}
            <Dialog open={unlinkDialog.open} onClose={() => setUnlinkDialog({ open: false, confirmationText: '' })}>
                <DialogTitle sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Warning /> تأكيد فك ارتباط المسؤول
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        هل أنت متأكد من رغبتك في فك ارتباط المستخدم <strong>{activeUser?.fullName}</strong> ({activeUser?.username})؟
                        <br />
                        سيؤدي هذا إلى إيقاف وصوله إلى لوحة تحكم هذا المزود فوراً.
                    </DialogContentText>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        للتأكيد، يرجى كتابة اسم المستخدم: <strong>{activeUser?.username}</strong>
                    </Alert>
                    <TextField
                        fullWidth
                        autoFocus
                        label="اكتب اسم المستخدم للتأكيد"
                        value={unlinkDialog.confirmationText}
                        onChange={(e) => setUnlinkDialog({ ...unlinkDialog, confirmationText: e.target.value })}
                        placeholder={activeUser?.username}
                        error={unlinkDialog.confirmationText !== '' && unlinkDialog.confirmationText !== activeUser?.username}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setUnlinkDialog({ open: false, confirmationText: '' })}>إلغاء</Button>
                    <Button
                        onClick={handleConfirmUnlink}
                        variant="contained"
                        color="error"
                        disabled={unlinkDialog.confirmationText !== activeUser?.username}
                    >
                        تأكيد فك الارتباط
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
                <DialogTitle>تأكيد</DialogTitle>
                <DialogContent><DialogContentText>هل أنت متأكد من تغيير الصلاحية؟</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>إلغاء</Button>
                    <Button onClick={handleConfirmToggle} variant="contained">تأكيد</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={deleteDocDialog.open} onClose={() => setDeleteDocDialog({ open: false, docId: null })}>
                <DialogTitle>حذف المستند</DialogTitle>
                <DialogContent><DialogContentText>هل أنت متأكد؟</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDocDialog({ open: false, docId: null })}>إلغاء</Button>
                    <Button onClick={handleConfirmDeleteDoc} color="error" variant="contained">حذف</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={docDialog.open} onClose={() => setDocDialog({ ...docDialog, open: false })}>
                <DialogTitle>إضافة مستند</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1, minWidth: 400 }}>
                        <TextField select label="النوع" value={docDialog.type} onChange={(e) => setDocDialog({ ...docDialog, type: e.target.value })}>
                            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                        </TextField>
                        <Button variant="outlined" component="label">
                            {docDialog.fileName || 'اختر ملف'}
                            <input type="file" hidden onChange={(e) => e.target.files[0] && setDocDialog({ ...docDialog, fileName: e.target.files[0].name, file: e.target.files[0] })} />
                        </Button>
                        <TextField type="date" label="تاريخ الانتهاء" InputLabelProps={{ shrink: true }} value={docDialog.expiryDate} onChange={(e) => setDocDialog({ ...docDialog, expiryDate: e.target.value })} />
                        <TextField label="ملاحظات" value={docDialog.notes} onChange={(e) => setDocDialog({ ...docDialog, notes: e.target.value })} />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDocDialog({ ...docDialog, open: false })}>إلغاء</Button>
                    <Button onClick={handleAddDocument} variant="contained">حفظ</Button>
                </DialogActions>
            </Dialog>
            <Dialog open={previewDialog.open} onClose={() => setPreviewDialog({ ...previewDialog, open: false })} maxWidth="lg" fullWidth>
                <DialogTitle>{previewDialog.title}</DialogTitle>
                <DialogContent sx={{ height: '80vh' }}>
                    {previewDialog.url && <iframe src={previewDialog.url} style={{ width: '100%', height: '100%', border: 'none' }} title="preview" />}
                </DialogContent>
                <DialogActions><Button onClick={() => setPreviewDialog({ ...previewDialog, open: false })}>إغلاق</Button></DialogActions>
            </Dialog>
        </>
    );
};

export default ProviderEdit;
