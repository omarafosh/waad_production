package com.waad.tba.modules.member.service.impl;

import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.service.BarcodeGeneratorService;
import com.waad.tba.common.repository.SystemSettingRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;

/**
 * تنفيذ خدمة توليد الباركود للأعضاء.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BarcodeGeneratorServiceImpl implements BarcodeGeneratorService {

    @PersistenceContext
    private EntityManager entityManager;
    
    private final MemberRepository memberRepository;
    private final SystemSettingRepository systemSettingRepository;

    @Override
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

    @Override
    @Transactional
    public String generateForPrincipal() {
        ensureSequencesExist();
        int currentYear = Year.now().getValue();
        Number nextVal = (Number) entityManager.createNativeQuery("SELECT nextval('member_barcode_seq')").getSingleResult();
        long seq = nextVal.longValue();
        String barcode = String.format("WAHA-%d-%06d", currentYear, seq);
        log.info("Generated barcode for PRINCIPAL member: {}", barcode);
        return barcode;
    }

    @Override
    @Transactional
    public String generateFromCardNumber(com.waad.tba.modules.member.entity.Member member) {
        if (member.getCardNumber() == null) {
            throw new IllegalStateException("Card number must be generated before barcode");
        }
        String prefix = systemSettingRepository.findBySettingKey("BARCODE_PREFIX")
            .map(com.waad.tba.common.entity.SystemSetting::getSettingValue)
            .orElse("WAAD");
        String barcode = prefix + "-" + member.getCardNumber();
        log.info("Generated derived barcode: {}", barcode);
        return barcode;
    }

    @Override
    @Transactional
    public String generateUniqueBarcodeForPrincipal() {
        String barcode;
        int attempts = 0;
        final int MAX_ATTEMPTS = 100;
        do {
            barcode = generateForPrincipal();
            attempts++;
            if (attempts >= MAX_ATTEMPTS) {
                log.error("Failed to generate unique barcode after {} attempts", MAX_ATTEMPTS);
                throw new IllegalStateException("Unable to generate unique barcode after maximum attempts");
            }
        } while (memberRepository.existsByBarcode(barcode));
        return barcode;
    }

    @Override
    @Deprecated
    @Transactional
    public String generate() {
        return generateForPrincipal();
    }
}
