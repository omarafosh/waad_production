// ==============================|| THEME CONSTANT ||============================== //

export const twitterColor = '#1DA1F2';
export const facebookColor = '#3b5998';
export const linkedInColor = '#0e76a8';

export const APP_DEFAULT_PATH = '/dashboard';
export const HORIZONTAL_MAX_ITEM = 7;
export const DRAWER_WIDTH = 260;
export const MINI_DRAWER_WIDTH = 60;

export const CSS_VAR_PREFIX = '';

export enum SimpleLayoutType {
  SIMPLE = 'simple',
  LANDING = 'landing'
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

export enum MenuOrientation {
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal',
  MINI_VERTICAL = 'mini-vertical'
}

export enum ThemeDirection {
  LTR = 'ltr',
  RTL = 'rtl'
}

export enum NavActionType {
  FUNCTION = 'function',
  LINK = 'link'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female'
}

export enum DropzoneType {
  DEFAULT = 'default',
  STANDARD = 'standard'
}

export enum AuthProvider {
  JWT = 'jwt',
  FIREBASE = 'firebase',
  AUTH0 = 'auth0',
  AWS = 'aws',
  SUPABASE = 'supabase'
}

export const APP_AUTH = AuthProvider.JWT;
export const DEFAULT_THEME_MODE = ThemeMode.SYSTEM;

// ==============================|| THEME CONFIG ||============================== //

export interface ConfigProps {
  fontFamily: string;
  i18n: string;
  numberSystem: string;
  dateCalendar: string;
  menuOrientation: MenuOrientation;
  container: boolean;
  presetColor: string;
  themeDirection: ThemeDirection;
}

const config: ConfigProps = {
  fontFamily: `'Tajwal', 'Cairo', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif`,
  i18n: 'ar', // Phase D1.5: Arabic as default language
  numberSystem: 'latn', // Default to Western digits
  dateCalendar: 'gregory', // Default to Gregorian
  menuOrientation: MenuOrientation.VERTICAL,
  container: true,
  presetColor: 'default',
  themeDirection: ThemeDirection.RTL // RTL for Arabic
};

export default config;

// ==============================|| PROJECT SETTINGS - TBA SYSTEM ||============================== //

export const projectSettings = {
  // Control visibility of non-TBA menu items (Mantis template components)
  showEcommerce: false,
  showChat: false,
  showKanban: false,
  showWidgets: false,
  showCustomer: false,
  showAnalytics: false,
  showCharts: false,
  showCalendar: false,
  showInvoice: false,
  showProfiles: false,

  // Keep useful tools visible
  showTools: true,
  showAdministration: true,

  // TBA modules are always visible
  showTBAManagement: true
};
