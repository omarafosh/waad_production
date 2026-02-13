// Tajawal font loaded via Google Fonts CDN in index.html

import PropTypes from 'prop-types';
import { useMemo } from 'react';

// material-ui
import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// project imports
import { CSS_VAR_PREFIX, DEFAULT_THEME_MODE, ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import { useCompanySettings } from 'contexts/CompanySettingsContext';
import CustomShadows from './custom-shadows';
import componentsOverride from './overrides';
import { buildPalette } from './palette';
import Typography from './typography';

// ==============================|| DEFAULT THEME - MAIN ||============================== //

export default function ThemeCustomization({ children }) {
  const { state: configState } = useConfig();
  const state = configState || {};
  // Get Company Settings to access primaryColor
  const { settings } = useCompanySettings();

  // Prioritize local user preference (state), then company settings, then default
  const fontFamily = state.fontFamily || settings?.fontFamily;
  const fontSize = state.fontSize || settings?.fontSize || 12;

  // Use company primary color if available
  const primaryColor = settings?.primaryColor;

  // Apply Font and Scaling to document root for global rem consistency
  useMemo(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      // Set Font Family
      const fontValue = fontFamily === 'Cairo'
        ? `'Cairo', 'Segoe UI Arabic', sans-serif`
        : `'Tajawal', 'Segoe UI Arabic', sans-serif`;
      root.style.setProperty('--app-font-family', fontValue);
      root.style.fontFamily = fontValue;

      // Set Global Font Size (1rem will equal this size)
      root.style.fontSize = `${fontSize}px`;
    }
  }, [fontFamily, fontSize]);

  const themeTypography = useMemo(() => Typography(fontFamily, fontSize), [fontFamily, fontSize]);

  const palette = useMemo(() => buildPalette(state.presetColor, primaryColor), [state.presetColor, primaryColor]);

  const themeOptions = useMemo(
    () => ({
      breakpoints: {
        values: {
          xs: 0,
          sm: 768,
          md: 1024,
          lg: 1266,
          xl: 1440
        }
      },
      direction: state.themeDirection,
      mixins: {
        toolbar: {
          minHeight: 60,
          paddingTop: 8,
          paddingBottom: 8
        }
      },
      typography: themeTypography,
      colorSchemes: {
        light: {
          palette: palette.light,
          customShadows: CustomShadows(palette.light, ThemeMode.LIGHT)
        },
        dark: {
          palette: palette.dark,
          customShadows: CustomShadows(palette.dark, ThemeMode.DARK)
        }
      },
      cssVariables: {
        cssVarPrefix: CSS_VAR_PREFIX,
        colorSchemeSelector: 'data-color-scheme'
      }
    }),
    [state.themeDirection, themeTypography, palette]
  );

  const themes = useMemo(() => {
    const t = createTheme(themeOptions);
    t.components = componentsOverride(t);
    return t;
  }, [themeOptions]);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider disableTransitionOnChange theme={themes} modeStorageKey="theme-mode" defaultMode={DEFAULT_THEME_MODE}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

ThemeCustomization.propTypes = { children: PropTypes.node };
