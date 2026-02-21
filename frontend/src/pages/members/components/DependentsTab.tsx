import { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { MEMBERS_AR } from 'locales/ar/members.ar';
import { RELATIONSHIP_AR } from '../UnifiedMemberView';
import DependentModal from '../DependentModal';
import dayjs from 'dayjs';

/**
 * DependentsTab Component
 * عرض وإدارة التابعين للمنتفع الرئيسي
 * 
 * @param {Object} props
 * @param {boolean} props.isPrincipal - هل المنتفع رئيسي
 * @param {Array} props.dependents - قائمة التابعين
 * @param {number} props.principalId - معرف المنتفع الرئيسي
 * @param {Function} props.onDependentSaved - دالة تُنفذ عند حفظ تابع
 * @param {Function} props.onDependentDeleted - دالة تُنفذ عند حذف تابع
 */
const DependentsTab = ({ isPrincipal, dependents = [], principalId, onDependentSaved, onDependentDeleted }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDependent, setSelectedDependent] = useState(null);

    const handleAddDependent = () => {
        setSelectedDependent(null);
        setModalOpen(true);
    };

    const handleEditDependent = (dependent) => {
        setSelectedDependent(dependent);
        setModalOpen(true);
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedDependent(null);
    };

    const handleDependentSave = (savedDependent) => {
        handleModalClose();
        if (onDependentSaved) {
            onDependentSaved(savedDependent);
        }
    };

    // إذا كان المنتفع تابعاً، عرض رسالة إعلامية
    if (!isPrincipal) {
        return (
            <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                    {MEMBERS_AR.info.noEmploymentData}
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header with Add Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    {MEMBERS_AR.tabs.dependents} ({dependents.length})
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={handleAddDependent}
                >
                    {MEMBERS_AR.buttons.addDependent}
                </Button>
            </Box>

            {/* Dependents Table */}
            {dependents.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                        {MEMBERS_AR.info.noDependents}
                    </Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>{MEMBERS_AR.tableHeaders.name}</TableCell>
                                <TableCell>{MEMBERS_AR.tableHeaders.relationship}</TableCell>
                                <TableCell>{MEMBERS_AR.tableHeaders.gender}</TableCell>
                                <TableCell>{MEMBERS_AR.tableHeaders.birthDate}</TableCell>
                                <TableCell>{MEMBERS_AR.tableHeaders.cardNumber}</TableCell>
                                <TableCell align="center">{MEMBERS_AR.tableHeaders.actions}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dependents.map((dep) => (
                                <TableRow key={dep.id} hover>
                                    <TableCell>{dep.fullName || dep.nameAr || dep.nameEn}</TableCell>
                                    <TableCell>{RELATIONSHIP_AR[dep.relationship] || dep.relationship}</TableCell>
                                    <TableCell>{MEMBERS_AR.genders[dep.gender?.toLowerCase()] || dep.gender}</TableCell>
                                    <TableCell>
                                        {dep.birthDate ? dayjs(dep.birthDate).format('YYYY-MM-DD') : '-'}
                                    </TableCell>
                                    <TableCell>{dep.cardNumber || '-'}</TableCell>
                                    <TableCell align="center">
                                        <Tooltip title={MEMBERS_AR.buttons.edit}>
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleEditDependent(dep)}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={MEMBERS_AR.buttons.delete}>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => onDependentDeleted && onDependentDeleted(dep)}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Dependent Modal */}
            <DependentModal
                open={modalOpen}
                onClose={handleModalClose}
                dependent={selectedDependent}
                principalId={principalId}
                onSave={handleDependentSave}
            />
        </Box>
    );
};

export default DependentsTab;
