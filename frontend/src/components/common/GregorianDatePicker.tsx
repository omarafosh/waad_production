import React from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';

/**
 * GregorianDatePicker
 * 
 * A wrapper around MUI DatePicker that enforces Gregorian (Miladi) calendar.
 * It accepts and returns date strings in 'YYYY-MM-DD' format, making it compatible
 * with existing form handlers that expect string values.
 * 
 * @param {string} value - Date string in 'YYYY-MM-DD' format
 * @param {function} onChange - Callback receiving an event-like object { target: { name, value } }
 * @param {string} label - Input label
 * @param {string} name - Field name
 */
const GregorianDatePicker = ({ value, onChange, label, name, ...props }) => {
    // Convert string value "YYYY-MM-DD" to dayjs object
    const dateValue = value ? dayjs(value) : null;

    const handleChange = (newValue) => {
        // Convert dayjs back to "YYYY-MM-DD" string
        // Mimic event object for compatibility with common handleChange handlers
        const formattedDate = newValue ? newValue.format('YYYY-MM-DD') : '';

        if (onChange) {
            onChange({
                target: {
                    name: name,
                    value: formattedDate
                }
            });
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
            <DatePicker
                label={label}
                value={dateValue}
                onChange={handleChange}
                slotProps={{
                    textField: {
                        fullWidth: true,
                        ...props
                    }
                }}
            />
        </LocalizationProvider>
    );
};

export default GregorianDatePicker;
