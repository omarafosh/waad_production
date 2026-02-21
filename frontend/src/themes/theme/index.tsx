// project imports
import Default from './default';
import DynamicTheme from './dynamic';

// ==============================|| PRESET THEME - THEME SELECTOR ||============================== //

/**
 * Theme Selector - Simplified to Dynamic + Default
 * 
 * Architecture Decision:
 * - DynamicTheme: Used when company has custom primary color
 * - Default: Fallback theme with preset colors
 * - Removed: theme1-8 (unnecessary complexity)
 */
export default function Theme(colors, presetColor, mode, primaryColorStr) {
  // If we have a custom primary color string, use DynamicTheme
  if (primaryColorStr && typeof primaryColorStr === 'string' && primaryColorStr.startsWith('#')) {
    return DynamicTheme(colors, mode, primaryColorStr);
  }

  // Fallback to default theme
  return Default(colors);
}
