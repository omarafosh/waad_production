import { Autocomplete, TextField, CircularProgress, Stack, Typography, Avatar } from '@mui/material';

/**
 * Reusable Form Autocomplete Component
 * Designed to NOT be shrunken and provide professional UX.
 */
const FormAutocomplete = ({
    label,
    options,
    value,
    onChange,
    loading = false,
    error,
    helperText,
    placeholder,
    icon: Icon,
    getOptionLabel = (option) => option.name || '',
    renderOption,
    ...props
}) => {
    return (
        <Autocomplete
            fullWidth
            options={options}
            value={value}
            onChange={(event, newValue) => onChange(newValue)}
            loading={loading}
            getOptionLabel={getOptionLabel}
            sx={{
                '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    p: 1, // Ensure it has good vertical presence
                    '&:hover': {
                        borderColor: 'primary.main'
                    }
                },
                // Ensure dropdown popover is wide enough
                '& .MuiAutocomplete-popper': {
                    minWidth: 300
                }
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder={placeholder}
                    error={!!error}
                    helperText={helperText}
                    slotProps={{
                        input: {
                            ...params.InputProps,
                            startAdornment: (
                                <>
                                    {Icon && (
                                        <Stack direction="row" alignItems="center" sx={{ ml: 1, mr: 0.5 }}>
                                            <Icon sx={{ fontSize: 20, color: 'text.secondary' }} />
                                        </Stack>
                                    )}
                                    {params.InputProps.startAdornment}
                                </>
                            ),
                            endAdornment: (
                                <>
                                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            ),
                        }
                    }}
                />
            )}
            renderOption={renderOption || ((props, option) => (
                <li {...props} key={option.id || option.code}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 0.5 }}>
                        <Typography variant="body2">{getOptionLabel(option)}</Typography>
                    </Stack>
                </li>
            ))}
            {...props}
        />
    );
};

export default FormAutocomplete;
