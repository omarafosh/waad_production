import { IconButton, Tooltip, useColorScheme } from '@mui/material';
import { LightMode as LightModeIcon, DarkMode as DarkModeIcon } from '@mui/icons-material';

/**
 * ThemeModeToggle - Switch between Light and Dark mode
 */
const ThemeModeToggle = () => {
    const { mode, setMode } = useColorScheme();

    const handleToggle = () => {
        setMode(mode === 'dark' ? 'light' : 'dark');
    };

    return (
        <Tooltip title={mode === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}>
            <IconButton
                onClick={handleToggle}
                color="inherit"
                sx={{
                    ml: 1,
                    bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    '&:hover': {
                        bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    }
                }}
            >
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
        </Tooltip>
    );
};

export default ThemeModeToggle;
