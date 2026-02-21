import PropTypes from 'prop-types';
import { createContext, useContext, useEffect, useCallback } from 'react';
import { useColorScheme } from '@mui/material/styles';
import useAuth from 'hooks/useAuth';

// ==============================|| THEME MODE CONTEXT ||============================== //

const ThemeModeContext = createContext(null);

export const useThemeMode = () => {
  const context = useContext(ThemeModeContext);
  if (!context) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return context;
};

export const ThemeModeProvider = ({ children }) => {
  const { user } = useAuth();
  const { mode, setMode } = useColorScheme();

  // 1️⃣ Determine userId (Fallback to 'guest')
  const userId = user?.id || 'guest';
  const storageKey = `theme-mode:${userId}`;

  // 2️⃣ Rehydrate on user change
  useEffect(() => {
    // 🧯 Hotfix: Cleanup legacy keys to prevent conflicts
    try {
      localStorage.removeItem('theme-mode');
      localStorage.removeItem('provider-theme-mode');
    } catch (e) {
      console.error(e);
    }

    const savedMode = localStorage.getItem(storageKey);
    const validModes = ['light', 'dark'];

    if (savedMode && validModes.includes(savedMode)) {
      // Restore user preference
      if (mode !== savedMode) {
        setMode(savedMode);
      }
    } else {
      // 3️⃣ Safeguard: Force 'light' if invalid or missing
      localStorage.setItem(storageKey, 'light');
      if (mode !== 'light') {
        setMode('light');
      }
    }
  }, [userId, setMode, storageKey, mode]);

  // 4️⃣ Toggle function
  const toggleTheme = useCallback(() => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem(storageKey, newMode);
  }, [mode, setMode, storageKey]);

  return <ThemeModeContext.Provider value={{ mode, toggleTheme, userId }}>{children}</ThemeModeContext.Provider>;
};

ThemeModeProvider.propTypes = {
  children: PropTypes.node
};

export default ThemeModeContext;
