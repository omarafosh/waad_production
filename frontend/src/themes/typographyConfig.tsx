/**
 * Typography Control Center - SYSTEM-WIDE STANDARDS
 * 
 * This file serves as the single source of truth for font scaling and weights.
 * It defines the ratio (in rem) and fontWeight for each MUI Typography variant.
 * 
 * Formulas used in typography.js:
 * fontSize = baseFontSize * ratio (rem)
 */

export const typographyConfig = {
    // SYSTEM LEVEL 1 (L1) - Thick Titles
    h1: {
        ratio: 1.4,
        fontWeight: 700,
        lineHeight: 1.4
    },
    h2: {
        ratio: 1.3,
        fontWeight: 700,
        lineHeight: 1.4
    },
    h3: {
        ratio: 1.2,
        fontWeight: 600,
        lineHeight: 1.5
    },
    h4: {
        ratio: 1.1,
        fontWeight: 600,
        lineHeight: 1.5
    },
    h5: {
        ratio: 1.0,
        fontWeight: 600,
        lineHeight: 1.5
    },
    h6: {
        ratio: 0.9,
        fontWeight: 600,
        lineHeight: 1.6
    },

    // SYSTEM LEVEL 2 (L2 & L2-b) - Base Content Size (1rem/14px)
    body1: {
        ratio: 1.0,
        fontWeight: 500,
        lineHeight: 1.7
    },
    subtitle1: {
        ratio: 1.0,
        fontWeight: 700,
        lineHeight: 1.7
    },

    // SYSTEM LEVEL 3 (L3) - Descriptions/Metadata
    body2: {
        ratio: 0.9,
        fontWeight: 500,
        lineHeight: 1.7
    },
    subtitle2: {
        ratio: 0.85,
        fontWeight: 600,
        lineHeight: 1.7
    },

    caption: {
        ratio: 0.85,
        fontWeight: 500,
        lineHeight: 1.7
    },

    button: {
        ratio: 1.0,
        fontWeight: 700,
        lineHeight: 1.7
    }
};

export default typographyConfig;
