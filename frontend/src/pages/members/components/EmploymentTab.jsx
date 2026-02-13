import { Grid, TextField, FormControl, InputLabel, Select, MenuItem, Typography, Box } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { MEMBERS_AR } from 'locales/ar/members.ar';

/**
 * EmploymentTab Component
 * عرض وتعديل بيانات العمل للمنتفع الرئيسي
 * 
 * @param {Object} props
 * @param {Object} props.form - بيانات النموذج
 * @param {Object} props.errors - أخطاء التحقق
 * @param {Function} props.handleChange - دالة معالجة التغييرات
 * @param {boolean} props.isPrincipal - هل المنتفع رئيسي أم تابع
 * @param {Array} props.employers - قائمة جهات العمل
 * @param {Array} props.benefitPolicies - قائمة وثائق المنافع
 */
const EmploymentTab = ({ form, errors, handleChange, isPrincipal, employers = [], benefitPolicies = [] }) => {
    const menuProps = {
        PaperProps: {
            style: {
                maxHeight: 300,
            },
        },
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
        <Grid container spacing={2}>
            {/* Employer */}
            <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth required error={!!errors.employerId} size="small">
                    <InputLabel>{MEMBERS_AR.labels.employer}</InputLabel>
                    <Select
                        value={form.employerId}
                        onChange={handleChange('employerId')}
                        label={MEMBERS_AR.labels.employer}
                        MenuProps={menuProps}
                    >
                        <MenuItem value="">{MEMBERS_AR.info.selectEmployer}</MenuItem>
                        {employers.map((emp) => (
                            <MenuItem key={emp.id} value={emp.id}>
                                {emp.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>

            {/* Employee Number */}
            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    fullWidth
                    label={MEMBERS_AR.labels.employeeNumber}
                    value={form.employeeNumber}
                    onChange={handleChange('employeeNumber')}
                    error={!!errors.employeeNumber}
                    helperText={errors.employeeNumber}
                    size="small"
                />
            </Grid>

            {/* Join Date */}
            <Grid size={{ xs: 12, md: 6 }}>
                <DatePicker
                    label={MEMBERS_AR.labels.joinDate}
                    value={form.joinDate}
                    onChange={handleChange('joinDate')}
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            size: 'small',
                            error: !!errors.joinDate,
                            helperText: errors.joinDate
                        }
                    }}
                />
            </Grid>

            {/* Occupation */}
            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    fullWidth
                    label={MEMBERS_AR.labels.occupation}
                    value={form.occupation}
                    onChange={handleChange('occupation')}
                    error={!!errors.occupation}
                    helperText={errors.occupation}
                    size="small"
                />
            </Grid>

            {/* Occupation */}
            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    fullWidth
                    label={MEMBERS_AR.labels.occupation}
                    value={form.occupation}
                    onChange={handleChange('occupation')}
                    error={!!errors.occupation}
                    helperText={errors.occupation}
                    size="small"
                />
            </Grid>
        </Grid>
    );
};

export default EmploymentTab;
