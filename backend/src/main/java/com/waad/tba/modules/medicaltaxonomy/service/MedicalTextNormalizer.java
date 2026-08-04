package com.waad.tba.modules.medicaltaxonomy.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public final class MedicalTextNormalizer {
    private static final Pattern ARABIC_DIACRITICS = Pattern.compile("[\\u064B-\\u065F\\u0670]");
    private static final Pattern PUNCTUATION = Pattern.compile("[()\\[\\]{}:;,.،\\-+&_/\\\\]+");
    private static final Pattern SPACES = Pattern.compile("\\s+");

    private MedicalTextNormalizer() {}

    public static String normalize(String value) {
        if (value == null) return "";
        String s = Normalizer.normalize(value, Normalizer.Form.NFKC)
                .trim().toLowerCase(Locale.ROOT);
        s = ARABIC_DIACRITICS.matcher(s).replaceAll("");
        s = s.replace('أ','ا').replace('إ','ا').replace('آ','ا')
             .replace('ة','ه').replace('ى','ي');
        s = PUNCTUATION.matcher(s).replaceAll(" ");
        return SPACES.matcher(s).replaceAll(" ").trim();
    }

    public static boolean isSafeForFuzzy(String normalized) {
        if (normalized == null || normalized.length() < 6) return false;
        String[] tokens = normalized.split(" ");
        return tokens.length >= 2;
    }
}
