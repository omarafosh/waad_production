import { Grid, TextField } from '@mui/material';
import { MEMBERS_AR } from 'locales/ar/members.ar';

/**
 * ContactInfoTab Component
 * عرض وتعديل معلومات الاتصال للمنتفع
 * 
 * @param {Object} props
 * @param {Object} props.form - بيانات النموذج
 * @param {Object} props.errors - أخطاء التحقق
 * @param {Function} props.handleChange - دالة معالجة التغييرات
 */
const ContactInfoTab = ({ form, errors, handleChange }) => {
    return (
        <Grid container spacing={2}>
            {/* Phone */}
            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    fullWidth
                    label={MEMBERS_AR.labels.phone}
                    value={form.phone}
                    onChange={handleChange('phone')}
                    error={!!errors.phone}
                    helperText={errors.phone || MEMBERS_AR.validation.hints.phone}
                    size="small"
                    inputProps={{ maxLength: 10 }}
                />
            </Grid>

            {/* Email */}
            <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                    fullWidth
                    label={MEMBERS_AR.labels.email}
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    error={!!errors.email}
                    helperText={errors.email || MEMBERS_AR.validation.hints.email}
                    size="small"
                />
            </Grid>

            {/* Address */}
            <Grid size={{ xs: 12 }}>
                <TextField
                    fullWidth
                    label={MEMBERS_AR.labels.address}
                    value={form.address}
                    onChange={handleChange('address')}
                    error={!!errors.address}
                    helperText={errors.address}
                    size="small"
                    multiline
                    rows={3}
                />
            </Grid>

            {/* Notes */}
            <Grid size={{ xs: 12 }}>
                <TextField
                    fullWidth
                    label={MEMBERS_AR.labels.notes}
                    value={form.notes}
                    onChange={handleChange('notes')}
                    error={!!errors.notes}
                    helperText={errors.notes}
                    size="small"
                    multiline
                    rows={4}
                />
            </Grid>
        </Grid>
    );
};

export default ContactInfoTab;
