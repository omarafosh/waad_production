import { Grid, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { MEMBERS_AR } from 'locales/ar/members.ar';
import { GENDERS, MARITAL_STATUSES, RELATIONSHIPS, RELATIONSHIP_GENDER_MAP } from 'services/api/unified-members.service';
import { RELATIONSHIP_AR } from '../UnifiedMemberView';

/**
 * PersonalInfoTab Component
 * عرض وتعديل البيانات الشخصية للمنتفع
 * 
 * @param {Object} props
 * @param {Object} props.form - بيانات النموذج
 * @param {Object} props.errors - أخطاء التحقق
 * @param {Function} props.handleChange - دالة معالجة التغييرات
 * @param {boolean} props.isPrincipal - هل المنتفع رئيسي أم تابع
 */
const PersonalInfoTab = ({ form, errors, handleChange, isPrincipal }) => {
    const menuProps = {
        PaperProps: {
            style: {
                maxHeight: 300,
            },
        },
    };

    return (
        <Grid container spacing={3}>
            {/* Left Column: Form Fields */}
            <Grid size={{ xs: 12, md: 9 }}>
                <Grid container spacing={2}>
                    {/* Full Name */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label={MEMBERS_AR.labels.fullName}
                            value={form.fullName}
                            onChange={handleChange('fullName')}
                            error={!!errors.fullName}
                            helperText={errors.fullName}
                            required
                            size="small"
                        />
                    </Grid>

                    {/* National Number */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label={MEMBERS_AR.labels.nationalNumber}
                            value={form.nationalNumber}
                            onChange={handleChange('nationalNumber')}
                            error={!!errors.nationalNumber}
                            helperText={errors.nationalNumber || MEMBERS_AR.validation.hints.nationalNumber}
                            size="small"
                            inputProps={{ maxLength: 12 }}
                        />
                    </Grid>

                    {/* Birth Date */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <DatePicker
                            label={MEMBERS_AR.labels.birthDate}
                            value={form.birthDate}
                            onChange={handleChange('birthDate')}
                            disableFuture
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    size: 'small',
                                    error: !!errors.birthDate,
                                    helperText: errors.birthDate,
                                    required: true
                                }
                            }}
                        />
                    </Grid>

                    {/* Gender */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <FormControl fullWidth required error={!!errors.gender} size="small">
                            <InputLabel>{MEMBERS_AR.labels.gender}</InputLabel>
                            <Select
                                value={form.gender}
                                onChange={handleChange('gender')}
                                label={MEMBERS_AR.labels.gender}
                                MenuProps={menuProps}
                            >
                                <MenuItem value="">{MEMBERS_AR.info.selectGender}</MenuItem>
                                <MenuItem value={GENDERS.MALE}>{MEMBERS_AR.genders.male}</MenuItem>
                                <MenuItem value={GENDERS.FEMALE}>{MEMBERS_AR.genders.female}</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Marital Status */}
                    <Grid size={{ xs: 12, md: 4 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{MEMBERS_AR.labels.maritalStatus}</InputLabel>
                            <Select
                                value={form.maritalStatus}
                                onChange={handleChange('maritalStatus')}
                                label={MEMBERS_AR.labels.maritalStatus}
                                MenuProps={menuProps}
                            >
                                <MenuItem value="">{MEMBERS_AR.info.selectMaritalStatus}</MenuItem>
                                <MenuItem value={MARITAL_STATUSES.SINGLE}>{MEMBERS_AR.maritalStatuses.single}</MenuItem>
                                <MenuItem value={MARITAL_STATUSES.MARRIED}>{MEMBERS_AR.maritalStatuses.married}</MenuItem>
                                <MenuItem value={MARITAL_STATUSES.DIVORCED}>{MEMBERS_AR.maritalStatuses.divorced}</MenuItem>
                                <MenuItem value={MARITAL_STATUSES.WIDOWED}>{MEMBERS_AR.maritalStatuses.widowed}</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Relationship (for Dependents only) */}
                    {!isPrincipal && (
                        <Grid size={{ xs: 12, md: 4 }}>
                            <FormControl fullWidth required error={!!errors.relationship} size="small">
                                <InputLabel>{MEMBERS_AR.labels.relationship}</InputLabel>
                                <Select
                                    value={form.relationship}
                                    onChange={handleChange('relationship')}
                                    label={MEMBERS_AR.labels.relationship}
                                    MenuProps={menuProps}
                                >
                                    {Object.entries(RELATIONSHIPS)
                                        .filter(([key, value]) => {
                                            const targetGender = RELATIONSHIP_GENDER_MAP[value];
                                            if (form.gender && targetGender) {
                                                return targetGender === form.gender;
                                            }
                                            return true;
                                        })
                                        .map(([key, value]) => (
                                            <MenuItem key={key} value={value}>
                                                {RELATIONSHIP_AR[value] || value}
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    )}

                    {/* Nationality */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label={MEMBERS_AR.labels.nationality}
                            value={form.nationality}
                            onChange={handleChange('nationality')}
                            size="small"
                        />
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default PersonalInfoTab;
