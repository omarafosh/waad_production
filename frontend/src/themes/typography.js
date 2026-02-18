// ==============================|| DEFAULT THEME - TYPOGRAPHY ||============================== //

export default function Typography(fontFamily, fontSize = 12) {
  // Tajawal Font - Primary font for Arabic-only system
  const activeFont = fontFamily === 'Cairo'
    ? `'Cairo', 'Segoe UI Arabic', sans-serif`
    : `'Tajawal', 'Segoe UI Arabic', sans-serif`;

  // Scale factor based on base fontSize (default 12px -> 0.75rem)
  // We use rems for everything to allow document-level scaling
  return {
    htmlFontSize: 16,
    fontFamily: activeFont,
    fontSize: fontSize,
    fontVariantNumeric: 'tabular-nums lining-nums',
    fontWeightLight: 300,
    fontWeightRegular: 500, // Level 2: Content (Normal)
    fontWeightMedium: 600,  // Level 1: Titles (Medium-Bold)
    fontWeightBold: 700,    // Level 2-b: Labels/Table Headers (Bold)
    // SYSTEM LEVEL 1 (L1) - Bold Titles
    h1: { fontSize: '1.4rem', fontWeight: 700, lineHeight: 1.4 },
    h2: { fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.4 },
    h3: { fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.5 },
    h4: { fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.5 }, // Breadcrumbs/Windows
    h5: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },   // Minor Titles
    h6: { fontSize: '0.9rem', fontWeight: 600, lineHeight: 1.6 },
    // SYSTEM LEVEL 2 (L2 & L2-b) - Base Content Size (1rem/14px)
    body1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.7 },       // L2: Values/Content
    subtitle1: { fontSize: '1rem', fontWeight: 700, lineHeight: 1.7 },   // L2-b: Bold Labels/Headers
    // SYSTEM LEVEL 3 (L3) - Descriptions/Metadata
    body2: { fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.7 },     // L3: Small Content
    subtitle2: { fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.7 }, // L3: Small Labels
    button: { fontSize: '1.0rem', fontWeight: 700, textTransform: 'none', lineHeight: 1.7 },
    caption: { fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.7 }   // L3: Descriptions
  };
}
