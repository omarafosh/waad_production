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
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    // Titles - Using rem for relative scaling
    h1: { fontSize: '2.375rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.3 },
    h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.35 },
    h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
    h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.5 },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.6 },
    // Body & Subtitles
    subtitle1: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.6 },
    subtitle2: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.65 },
    body1: { fontSize: '1rem', lineHeight: 1.6 },
    body2: { fontSize: '1rem', lineHeight: 1.65 },
    button: { fontSize: '1rem', fontWeight: 500, textTransform: 'none' },
    caption: { fontSize: '1rem', lineHeight: 1.7 }
  };
}
