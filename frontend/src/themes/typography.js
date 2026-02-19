// ==============================|| DEFAULT THEME - TYPOGRAPHY ||============================== //

import { typographyConfig as config } from './typographyConfig';

export default function Typography(fontFamily, fontSize = 12) {
  // Tajawal Font - Primary font for Arabic-only system
  const activeFont = fontFamily === 'Cairo'
    ? `'Cairo', 'Segoe UI Arabic', sans-serif`
    : `'Tajawal', 'Segoe UI Arabic', sans-serif`;

  // We use rems for everything to allow document-level scaling
  // All sizes are derived from typographyConfig.js ratios
  return {
    htmlFontSize: 16,
    fontFamily: activeFont,
    fontSize: fontSize,
    fontVariantNumeric: 'tabular-nums lining-nums',
    fontWeightLight: 300,
    fontWeightRegular: config.body1.fontWeight,
    fontWeightMedium: config.h3.fontWeight,
    fontWeightBold: config.subtitle1.fontWeight,

    // SYSTEM LEVEL 1 (L1) - Thick Titles
    h1: { fontSize: `${config.h1.ratio}rem`, fontWeight: config.h1.fontWeight, lineHeight: config.h1.lineHeight },
    h2: { fontSize: `${config.h2.ratio}rem`, fontWeight: config.h2.fontWeight, lineHeight: config.h2.lineHeight },
    h3: { fontSize: `${config.h3.ratio}rem`, fontWeight: config.h3.fontWeight, lineHeight: config.h3.lineHeight },
    h4: { fontSize: `${config.h4.ratio}rem`, fontWeight: config.h4.fontWeight, lineHeight: config.h4.lineHeight },
    h5: { fontSize: `${config.h5.ratio}rem`, fontWeight: config.h5.fontWeight, lineHeight: config.h5.lineHeight },
    h6: { fontSize: `${config.h6.ratio}rem`, fontWeight: config.h6.fontWeight, lineHeight: config.h6.lineHeight },

    // SYSTEM LEVEL 2 (L2 & L2-b) - Base Content Size
    body1: { fontSize: `${config.body1.ratio}rem`, fontWeight: config.body1.fontWeight, lineHeight: config.body1.lineHeight },
    subtitle1: { fontSize: `${config.subtitle1.ratio}rem`, fontWeight: config.subtitle1.fontWeight, lineHeight: config.subtitle1.lineHeight },

    // SYSTEM LEVEL 3 (L3) - Descriptions/Metadata
    body2: { fontSize: `${config.body2.ratio}rem`, fontWeight: config.body2.fontWeight, lineHeight: config.body2.lineHeight },
    subtitle2: { fontSize: `${config.subtitle2.ratio}rem`, fontWeight: config.subtitle2.fontWeight, lineHeight: config.subtitle2.lineHeight },
    caption: { fontSize: `${config.caption.ratio}rem`, fontWeight: config.caption.fontWeight, lineHeight: config.caption.lineHeight },
    button: { fontSize: `${config.button.ratio}rem`, fontWeight: config.button.fontWeight, textTransform: 'none', lineHeight: config.button.lineHeight }
  };
}
