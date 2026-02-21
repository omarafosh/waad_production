
import { generate } from '@ant-design/colors';
import { ThemeMode } from 'config';

// ==============================|| PRESET THEME - DYNAMIC ||============================== //

export default function DynamicTheme(colors, mode, primaryColor) {
    const { grey } = colors;
    const greyColors = {
        0: grey[0],
        50: grey[1],
        100: grey[2],
        200: grey[3],
        300: grey[4],
        400: grey[5],
        500: grey[6],
        600: grey[7],
        700: grey[8],
        800: grey[9],
        900: grey[10],
        A50: grey[15],
        A100: grey[11],
        A200: grey[12],
        A400: grey[13],
        A700: grey[14],
        A800: grey[16]
    };
    const contrastText = '#fff';

    // Generate primary colors based on the provided hex
    const primaryColors = generate(primaryColor);

    // For dark mode, we might want to regenerate or specific logic
    // Ant Design generate supports dark mode
    let finalPrimaryColors = primaryColors;

    if (mode === ThemeMode.DARK) {
        finalPrimaryColors = generate(primaryColor, { theme: 'dark', backgroundColor: '#141414' });
    }

    // Fallback fixed colors for other states (same as Theme1)
    let errorColors = ['#FFE7D3', '#FF805D', '#FF4528', '#DB271D', '#930C1A'];
    let warningColors = ['#FFF6D0', '#FFCF4E', '#FFB814', '#DB970E', '#935B06'];
    let infoColors = ['#DCF0FF', '#7EB9FF', '#549BFF', '#3D78DB', '#1A3D93'];
    let successColors = ['#EAFCD4', '#8AE65B', '#58D62A', '#3DB81E', '#137C0D'];

    if (mode === ThemeMode.DARK) {
        errorColors = ['#341d1b', '#b03725', '#dd3f27', '#e9664d', '#fbd6c9'];
        warningColors = ['#342a1a', '#83631a', '#dda116', '#e9ba3a', '#fbefb5'];
        infoColors = ['#202734', '#416fb0', '#4c88dd', '#74a8e9', '#ecf4fb'];
        successColors = ['#1f2e1c', '#449626', '#4fba28', '#74cf4d', '#e3fbd2'];
    }

    return {
        primary: {
            lighter: finalPrimaryColors[0],
            100: finalPrimaryColors[1],
            200: finalPrimaryColors[2],
            light: finalPrimaryColors[3],
            400: finalPrimaryColors[4],
            main: finalPrimaryColors[5],
            dark: finalPrimaryColors[6],
            700: finalPrimaryColors[7],
            darker: finalPrimaryColors[8],
            900: finalPrimaryColors[9],
            contrastText
        },
        secondary: {
            lighter: greyColors[100],
            100: greyColors[100],
            200: greyColors[200],
            light: greyColors[300],
            400: greyColors[400],
            main: greyColors[500],
            600: greyColors[600],
            dark: greyColors[700],
            800: greyColors[800],
            darker: greyColors[900],
            A100: greyColors[0],
            A200: greyColors.A400,
            A300: greyColors.A700,
            contrastText: greyColors[0]
        },
        error: {
            lighter: errorColors[0],
            light: errorColors[1],
            main: errorColors[2],
            dark: errorColors[3],
            darker: errorColors[4],
            contrastText
        },
        warning: {
            lighter: warningColors[0],
            light: warningColors[1],
            main: warningColors[2],
            dark: warningColors[3],
            darker: warningColors[4],
            contrastText: greyColors[100]
        },
        info: {
            lighter: infoColors[0],
            light: infoColors[1],
            main: infoColors[2],
            dark: infoColors[3],
            darker: infoColors[4],
            contrastText
        },
        success: {
            lighter: successColors[0],
            light: successColors[1],
            main: successColors[2],
            dark: successColors[3],
            darker: successColors[4],
            contrastText
        },
        grey: greyColors
    };
}
