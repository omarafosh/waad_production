package com.waad.tba.modules.member.service.util;

import com.waad.tba.modules.member.entity.Member;

/**
 * Unified Member Generator Service.
 * Consolidates Barcode and Smart Card Number generation logic.
 */
public interface MemberGeneratorService {

    /**
     * Generate a unique barcode for a principal member.
     */
    String generateBarcode(Member member);

    /**
     * Generate a smart card number based on member type (Principal/Dependent).
     */
    String generateCardNumber(Member member);

    /**
     * Ensure all necessary database sequences exist (Self-healing).
     */
    void ensureSequencesExist();
}
