package com.waad.tba.modules.member.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * ==================== UNIFIED MEMBER ARCHITECTURE ====================
 * Service to generate unified card numbers for members.
 * 
 * Card Number Strategy:
 * - PRINCIPAL: Base card number (6 digits, zero-padded)
 *   Example: 000001, 000123, 012345
 * 
 * - DEPENDENT: Principal's card number + suffix (2 digits)
 *   Example: 000123-01, 000123-02, 000123-03
 * 
 * Business Rules:
 * - Each family shares the same base card number
 * - Dependents get automatic suffix based on their order
 * - Suffix starts at 01 and increments
 * - Card numbers are UNIQUE system-wide
 * - Immutable after creation (cannot be changed)
 * 
 * Uses database sequence `member_card_number_seq` for principal card numbers.
 * =====================================================================
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CardNumberGeneratorService {

    @PersistenceContext
    private EntityManager entityManager;
    
    private final MemberRepository memberRepository;

    private final com.waad.tba.common.repository.SystemSettingRepository systemSettingRepository;

    /**
     * Requirement 1: Generate Smart Card Number
     * Format: Configurable via Company Settings (CARD_NUMBER_FORMAT)
     * Default: [PRO]-[YEAR]-[EMP_NO][REL_SUFFIX]
     */
    @Transactional
    public String generateSmartCardNumber(Member member) {
        if (member == null) {
            throw new IllegalArgumentException("Member cannot be null");
        }

        // 1. Get Format from System Settings
        String format = systemSettingRepository.findBySettingKey("CARD_NUMBER_FORMAT")
                .map(com.waad.tba.common.entity.SystemSetting::getSettingValue)
                .filter(f -> !f.isBlank())
                .orElse("[PRO]-[YEAR]-[EMP_NO][REL_SUFFIX]");

        // 0. Dependent Strategy: Inherit from Parent
        if (member.getParent() != null) {
            Member parent = member.getParent();
            String parentCard = parent.getCardNumber();
            
            // Safety check: if parent has no card yet (shouldn't happen in new flow), fallback to base generation using parent data? 
            // Better to rely on parent card.
            if (parentCard != null && !parentCard.isEmpty()) {
                String suffix = determineRelationshipSuffix(member);
                // Ensure suffix has a separator if not present, but standard requirement is usually dash
                // Format: PARENT_CARD-SUFFIX
                return parentCard + "-" + suffix; 
            }
        }

        // 2. Prepare Tokens
        String proCode = determineProviderCode(member);
        String year = String.valueOf(java.time.Year.now().getValue());
        
        // Emp No or ID Part
        String empNo = member.getEmployeeNumber();
        if (empNo == null || empNo.trim().isEmpty()) {
             // If no employee number, fallback to internal ID sequence
             empNo = determineIdPart(member);
        }
        
        // Suffix Logic
        String suffix = determineRelationshipSuffix(member);

        // 3. Replace Tokens (Case Insensitive Support)
        String smartCardNumber = format
                .replace("[PRO]", proCode)
                .replace("{PRO}", proCode)
                .replace("[YEAR]", year)
                .replace("{YEAR}", year)
                .replace("[EMP_NO]", empNo)
                .replace("{EMP_NO}", empNo)
                .replace("[REL_SUFFIX]", suffix)
                .replace("{REL_SUFFIX}", suffix)
                .replace("[R]", suffix) // Backward compatibility
                .replace("{R}", suffix)
                .replace("[COMP]", determineCompanyCode(member))
                .replace("{COMP}", determineCompanyCode(member))
                .replace("[ID]", determineIdPart(member))
                .replace("{ID}", determineIdPart(member));
        
        // Update member fields for auditing
        member.setProviderCode(proCode);
        member.setIsSmartCard(true);
        
        log.info("Generated Enterprise Smart Card Number: {} (Format: {})", smartCardNumber, format);
        
        return smartCardNumber;
    }

    /**
     * Determines the relationship suffix for a dependent member.
     * Includes a sequence number to ensure uniqueness when multiple dependents
     * have the same relationship type (e.g., multiple sons: S1, S2, S3).
     * 
     * Format: [REL_CODE][SEQ] where:
     * - REL_CODE: W=Wife, H=Husband, S=Son, D=Daughter, F=Father, M=Mother, O=Other
     * - SEQ: Sequence number (1, 2, 3...) for same relationship types
     * 
     * @param member The dependent member
     * @return Suffix string (e.g., "W", "S1", "S2", "D1")
     */
    private String determineRelationshipSuffix(Member member) {
        if (member.isPrincipal()) {
            return ""; // Principal has no suffix
        }
        
        // Get the relationship code
        String relCode = getRelationshipCode(member.getRelationship());
        
        // For dependents, calculate sequence number among siblings with same relationship
        int sequenceNumber = calculateRelationshipSequence(member);
        
        // If only one dependent of this type, omit the number for cleaner format
        // Otherwise, append the sequence number
        if (sequenceNumber <= 1) {
            return relCode;
        }
        return relCode + sequenceNumber;
    }
    
    /**
     * Get the single-character code for a relationship type.
     */
    private String getRelationshipCode(Member.Relationship relationship) {
        if (relationship == null) {
            return "O";
        }
        switch (relationship) {
            case WIFE: return "W";
            case HUSBAND: return "H";
            case SON: return "S";
            case DAUGHTER: return "D";
            case FATHER: return "F";
            case MOTHER: return "M";
            default: return "O";
        }
    }
    
    /**
     * Calculate the sequence number for a dependent among siblings with the same relationship type.
     * 
     * Example: If principal has 3 sons, they get sequences 1, 2, 3.
     * The sequence is determined by counting existing dependents with same relationship
     * under the same parent and adding 1.
     * 
     * @param member The dependent member being created
     * @return Sequence number (1-based)
     */
    private int calculateRelationshipSequence(Member member) {
        if (member.getParent() == null || member.getRelationship() == null) {
            return 1;
        }
        
        Long parentId = member.getParent().getId();
        Member.Relationship relationship = member.getRelationship();
        
        // Count existing dependents with same parent and relationship
        // This counts siblings already saved to database
        java.util.List<Member> existingSiblings = memberRepository.findByParentIdAndRelationship(parentId, relationship);
        
        // If the member already has an ID (update case), don't count itself
        if (member.getId() != null) {
            existingSiblings = existingSiblings.stream()
                .filter(m -> !m.getId().equals(member.getId()))
                .collect(java.util.stream.Collectors.toList());
        }
        
        // Return next sequence number
        return existingSiblings.size() + 1;
    }

    private String determineProviderCode(Member member) {
        // Requirement: TPA prefix from system settings or fallback
        return systemSettingRepository.findBySettingKey("TPA_CODE_PREFIX")
            .map(s -> s.getSettingValue().toUpperCase())
            .orElse("WAAD");
    }

    private String determineCompanyCode(Member member) {
        return systemSettingRepository.findBySettingKey("SYSTEM_IDENTIFIER")
            .map(s -> s.getSettingValue().toUpperCase())
            .orElse("GEN"); 
    }

    private String determineIdPart(Member member) {
        // Generate from sequence if Employee Number is missing
        Number nextVal = (Number) entityManager
            .createNativeQuery("SELECT nextval('seq_smart_card_random_id')")
            .getSingleResult();
        return String.format("%06d", nextVal.longValue());
    }

    /**
     * Legacy support (Deprecated)
     */
    @Deprecated
    @Transactional
    public String generateForPrincipalLegacy() {
        Number nextVal = (Number) entityManager
            .createNativeQuery("SELECT nextval('member_card_number_seq')")
            .getSingleResult();
        return String.format("%06d", nextVal.longValue());
    }
}
