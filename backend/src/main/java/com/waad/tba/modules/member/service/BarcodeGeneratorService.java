package com.waad.tba.modules.member.service;

import java.time.Year;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.modules.member.repository.MemberRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * ==================== UNIFIED MEMBER ARCHITECTURE ====================
 * Service to generate barcodes for PRINCIPAL members ONLY.
 * 
 * Format: WAHA-{YYYY}-{NNNNNN}
 * Example: WAHA-2026-000001
 * 
 * Business Rules:
 * - Only PRINCIPAL members have barcodes
 * - DEPENDENT members use parent's barcode (NO own barcode)
 * - Barcode is PERMANENT and IMMUTABLE after creation
 * - Used for family eligibility verification (one barcode per family)
 * 
 * Uses database sequence `member_barcode_seq` for atomic increments.
 * Ensures uniqueness within the system.
 * =====================================================================
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BarcodeGeneratorService {

    @PersistenceContext
    private EntityManager entityManager;
    
    private final MemberRepository memberRepository;
    private final com.waad.tba.modules.company.repository.CompanyRepository companyRepository;

    /**
     * SELF-HEALING: Ensure required sequences exist in the database.
     * This solves the issue of missed migrations when they are merged into 
     * already-applied Flyway files.
     */
    @jakarta.annotation.PostConstruct
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ensureSequencesExist() {
        log.info("🛡️ Checking database sequences for self-healing...");
        try {
            entityManager.createNativeQuery("CREATE SEQUENCE IF NOT EXISTS member_barcode_seq START WITH 1000 INCREMENT BY 1").executeUpdate();
            entityManager.createNativeQuery("CREATE SEQUENCE IF NOT EXISTS seq_smart_card_random_id START WITH 100000 INCREMENT BY 1").executeUpdate();
            log.info("✅ Database sequences are ready.");
        } catch (Exception e) {
            log.warn("⚠️ Self-healing sequence creation failed (they might already exist): {}", e.getMessage());
        }
    }

    /**
     * Generate barcode for PRINCIPAL members only.
     * 
     * Format: WAHA-{YYYY}-{NNNNNN}
     * Example: WAHA-2026-000001
     * 
     * CRITICAL: 
     * - Only call this for PRINCIPAL members (parent_id = NULL)
     * - NEVER call for DEPENDENT members
     * - Barcode is PERMANENT and cannot be changed
     * - One barcode per family (principal's barcode)
     * 
     * @return Unique barcode for principal member
     */
    @Transactional
    public String generateForPrincipal() {
        // Get current year
        int currentYear = Year.now().getValue();
        
        // Get next sequence value
        Number nextVal = (Number) entityManager
            .createNativeQuery("SELECT nextval('member_barcode_seq')")
            .getSingleResult();
        long seq = nextVal.longValue();
        
        // Format: WAHA-YYYY-NNNNNN
        String barcode = String.format("WAHA-%d-%06d", currentYear, seq);
        
        log.info("Generated barcode for PRINCIPAL member: {}", barcode);
        return barcode;
    }

    /**
     * Generate barcode based on Card Number.
     * Format: [ORG_PREFIX]-[CARD_NUMBER]
     * Example: WAAD-EMP-2026-100012
     */
    @Transactional
    public String generateFromCardNumber(com.waad.tba.modules.member.entity.Member member) {
        if (member.getCardNumber() == null) {
            throw new IllegalStateException("Card number must be generated before barcode");
        }
        
        // Fetch System-Wide Prefix from Company Settings (Admin Config)
        String prefix = companyRepository.findByIsDefaultTrue()
            .map(com.waad.tba.modules.company.entity.Company::getBarcodePrefix)
            .orElse("WAAD");
        
        String barcode = prefix + "-" + member.getCardNumber();
        log.info("Generated derived barcode: {}", barcode);
        return barcode;
    }
    
    /**
     * Generate unique barcode with collision prevention.
     * 
     * Uses retry logic to ensure barcode uniqueness in concurrent scenarios.
     * Recommended for use in high-concurrency environments.
     * 
     * @return Guaranteed unique barcode
     * @throws IllegalStateException if unable to generate unique barcode after MAX_ATTEMPTS
     */
    @Transactional
    public String generateUniqueBarcodeForPrincipal() {
        String barcode;
        int attempts = 0;
        final int MAX_ATTEMPTS = 100;
        
        do {
            barcode = generateForPrincipal();
            attempts++;
            
            if (attempts >= MAX_ATTEMPTS) {
                log.error("Failed to generate unique barcode for Principal after {} attempts", MAX_ATTEMPTS);
                throw new IllegalStateException(
                    "Unable to generate unique barcode for Principal Member after " + MAX_ATTEMPTS + " attempts. " +
                    "This indicates a critical system issue."
                );
            }
            
            // Check if barcode already exists
        } while (memberRepository.existsByBarcode(barcode));
        
        if (attempts > 1) {
            log.warn("Generated unique barcode for Principal after {} attempts: {}", attempts, barcode);
        } else {
            log.debug("Generated unique barcode for Principal on first attempt: {}", barcode);
        }
        
        return barcode;
    }
    
    /**
     * DEPRECATED: Legacy method for backward compatibility.
     * Use generateForPrincipal() instead.
     */
    @Deprecated
    @Transactional
    public String generate() {
        log.warn("DEPRECATED: generate() called. Use generateForPrincipal() instead.");
        return generateForPrincipal();
    }
}
