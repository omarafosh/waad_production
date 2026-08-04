package com.waad.tba.modules.medicaltaxonomy.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MedicalTextNormalizerTest {
    @Test void normalizesArabicVariantsAndDiacritics() {
        assertEquals("ازاله انابيب بالاذن", MedicalTextNormalizer.normalize("إزالةُ أنابيب بالأُذن"));
    }
    @Test void normalizesPunctuationAndSpaces() {
        assertEquals("gpt alt", MedicalTextNormalizer.normalize(" GPT ( ALT ) "));
    }
    @Test void rejectsShortFuzzyInput() {
        assertFalse(MedicalTextNormalizer.isSafeForFuzzy("ct"));
        assertTrue(MedicalTextNormalizer.isSafeForFuzzy("ct scan chest"));
    }
}
