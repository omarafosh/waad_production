// material-ui
import { CalendarOutlined } from '@ant-design/icons';
import { typographyConfig as config } from '../typographyConfig';

// ==============================|| OVERRIDES - DATE PICKER & CALENDAR ||============================== //

/**
 * Ensures all DatePicker sub-components (Calendar, Days, Years, etc.)
 * follow the centralized scaling system.
 */
export default function DatePicker(theme) {
  return {
    MuiDatePicker: {
      defaultProps: {
        slots: { openPickerIcon: () => <CalendarOutlined /> }
      }
    },
    MuiPickersDay: {
      styleOverrides: {
        root: {
          fontSize: `${config.body2.ratio}rem`,
          fontWeight: config.body2.fontWeight,
          fontFamily: 'inherit'
        }
      }
    },
    MuiPickersCalendarHeader: {
      styleOverrides: {
        label: {
          fontSize: `${config.subtitle2.ratio}rem`,
          fontWeight: config.subtitle2.fontWeight
        }
      }
    },
    MuiPickersYear: {
      styleOverrides: {
        yearButton: {
          fontSize: `${config.body2.ratio}rem`,
          fontWeight: config.body2.fontWeight
        }
      }
    }
  };
}
