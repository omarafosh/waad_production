import { TextField, InputAdornment, FormControl, FormHelperText } from '@mui/material';

/**
 * Reusable Form Input Component
 */
const FormInput = ({
    label,
    name,
    value,
    error,
    helperText,
    onChange,
    onBlur,
    icon: Icon,
    fullWidth = true,
    ...props
}) => {
    return (
        <FormControl fullWidth={fullWidth} error={!!error}>
            <TextField
                label={label}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                error={!!error}
                fullWidth={fullWidth}
                variant="outlined"
                slotProps={{
                    input: {
                        startAdornment: Icon ? (
                            <InputAdornment position="start">
                                <Icon sx={{ fontSize: 20, color: 'text.secondary' }} />
                            </InputAdornment>
                        ) : null,
                    }
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        transition: 'all 0.2s',
                        '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.1)'
                        }
                    }
                }}
                {...props}
            />
            {error && <FormHelperText sx={{ mx: 0 }}>{helperText || error}</FormHelperText>}
        </FormControl>
    );
};

export default FormInput;
