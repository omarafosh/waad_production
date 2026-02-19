
import PropTypes from 'prop-types';
import { Suspense, useMemo } from 'react';

// MUI X Date Pickers
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb'; // English locale for Gregorian calendar

// Configure dayjs globally to use English numerals and Gregorian calendar
dayjs.locale('en-gb');

// project imports
import { getAppLocale } from 'utils/locale-helper';
import ThemeCustomization from 'themes';
import Locales from 'components/Locales';
import RTLLayout from 'components/RTLLayout';
import ScrollTop from 'components/ScrollTop';
import Notistack from 'components/third-party/Notistack';
import Loader from 'components/Loader';
import { SystemErrorBoundary } from 'components/ErrorBoundary';

// auth-provider
import { AuthProvider } from 'contexts/AuthContext';
import { EmployerFilterProvider } from 'contexts/EmployerFilterContext';
import { SystemSettingsProvider, useSystemSettings } from 'contexts/SystemSettingsContext'; // Changed from CompanySettingsProvider
import { GlobalImportProgressProvider } from 'contexts/GlobalImportProgressContext';
import { TableRefreshProvider } from 'contexts/TableRefreshContext';

/**
 * LocalizationWrapper - Reactive wrapper for MUI X Date Pickers
 */
const LocalizationWrapper = ({ children }) => {
    const { settings } = useSystemSettings();
    const locale = useMemo(() => getAppLocale(), [settings?.numberSystem, settings?.dateCalendar]);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={locale}>
            {children}
        </LocalizationProvider>
    );
};

/**
 * AppProviders - Centralized Context Providers
 * Phase D2 - Context Standardization
 */
const AppProviders = ({ children }) => {
    return (
        <SystemErrorBoundary>
            <TableRefreshProvider>
                <SystemSettingsProvider> {/* Changed from CompanySettingsProvider */}
                    <ThemeCustomization>
                        <RTLLayout>
                            <Locales>
                                <LocalizationWrapper>
                                    <ScrollTop>
                                        <AuthProvider>
                                            <EmployerFilterProvider>
                                                <GlobalImportProgressProvider>
                                                    <Notistack>
                                                        {children}
                                                    </Notistack>
                                                </GlobalImportProgressProvider>
                                            </EmployerFilterProvider>
                                        </AuthProvider>
                                    </ScrollTop>
                                </LocalizationWrapper>
                            </Locales>
                        </RTLLayout>
                    </ThemeCustomization>
                </SystemSettingsProvider>
            </TableRefreshProvider>
        </SystemErrorBoundary>
    );
};

LocalizationWrapper.propTypes = { children: PropTypes.node };

AppProviders.propTypes = {
    children: PropTypes.node
};

export default AppProviders;
