package com.waad.tba.modules.member.service.impl;

import com.waad.tba.common.repository.SystemSettingRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.member.service.CardNumberGeneratorService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;

/**
 * تنفيذ خدمة توليد أرقام البطاقات الذكية للأعضاء.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CardNumberGeneratorServiceImpl implements CardNumberGeneratorService {

    @PersistenceContext
    private EntityManager entityManager;

    private final MemberRepository memberRepository;
    private final SystemSettingRepository systemSettingRepository;

    @Override
    @Transactional
    public String generateSmartCardNumber(Member member) {
        String format = systemSettingRepository.findBySettingKey("CARD_NUMBER_FORMAT")
                .map(com.waad.tba.common.entity.SystemSetting::getSettingValue)
                .orElse("[PRO]-[YEAR]-[EMP_NO][REL_SUFFIX]");

        String providerCode = determineProviderCode(member);
        String companyCode = determineCompanyCode(member);
        String year = String.valueOf(Year.now().getValue());
        String idPart = determineIdPart(member);
        String relSuffix = determineRelationshipSuffix(member);

        String cardNumber = format
                .replace("[PRO]", providerCode)
                .replace("[COMP]", companyCode)
                .replace("[YEAR]", year)
                .replace("[EMP_NO]", idPart)
                .replace("[REL_SUFFIX]", relSuffix)
                .replace("--", "-");

        if (cardNumber.endsWith("-")) {
            cardNumber = cardNumber.substring(0, cardNumber.length() - 1);
        }

        log.info("💳 Generated Smart Card Number for {}: {} (Format applied: {})",
                member.getFullName(), cardNumber, format);

        return cardNumber;
    }

    @Override
    public String determineRelationshipSuffix(Member member) {
        if (member.isPrincipal()) {
            return "";
        }
        String code = getRelationshipCode(member.getRelationship());
        int sequence = calculateRelationshipSequence(member);
        if (code.equals("W") && sequence == 1) {
            return "W";
        }
        return code + sequence;
    }

    @Override
    public String getRelationshipCode(Member.Relationship relationship) {
        if (relationship == null) return "X";
        return switch (relationship) {
            case WIFE -> "W";
            case HUSBAND -> "H";
            case SON -> "S";
            case DAUGHTER -> "D";
            case FATHER -> "F";
            case MOTHER -> "M";
            case BROTHER -> "B";
            case SISTER -> "I"; // Assuming 'I' or similar for Sister, or default to O if not standard
            default -> "O";
        };
    }

    @Override
    public int calculateRelationshipSequence(Member member) {
        if (member.getParent() == null) return 0;
        Long parentId = member.getParent().getId();
        Member.Relationship rel = member.getRelationship();
        long count = memberRepository.countByParentIdAndRelationship(parentId, rel);
        return (int) (count + 1);
    }

    private String determineProviderCode(Member member) {
        return systemSettingRepository.findBySettingKey("PROVIDER_CODE")
                .map(com.waad.tba.common.entity.SystemSetting::getSettingValue)
                .orElse("WAAD");
    }

    private String determineCompanyCode(Member member) {
        if (member.getEmployerOrganization() != null && member.getEmployerOrganization().getCode() != null) {
            return member.getEmployerOrganization().getCode();
        }
        return "EMP";
    }

    private String determineIdPart(Member member) {
        if (member.getEmployeeNumber() != null && !member.getEmployeeNumber().isBlank()) {
            return member.getEmployeeNumber();
        }
        Number nextVal = (Number) entityManager.createNativeQuery("SELECT nextval('seq_smart_card_random_id')").getSingleResult();
        return String.valueOf(nextVal.longValue());
    }

    @Override
    @Deprecated
    @Transactional
    public String generateForPrincipalLegacy() {
        Number nextVal = (Number) entityManager.createNativeQuery("SELECT nextval('member_card_number_seq')").getSingleResult();
        return String.format("%07d", nextVal.longValue());
    }
}
