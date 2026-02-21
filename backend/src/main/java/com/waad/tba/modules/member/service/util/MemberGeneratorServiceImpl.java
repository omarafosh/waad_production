package com.waad.tba.modules.member.service.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.common.repository.SystemSettingRepository;
import com.waad.tba.modules.company.repository.SettingRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberGeneratorServiceImpl implements MemberGeneratorService {

    @PersistenceContext
    private EntityManager entityManager;

    private final MemberRepository memberRepository;
    private final SystemSettingRepository systemSettingRepository;
    private final SettingRepository settingRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void ensureSequencesExist() {
        try {
            entityManager
                    .createNativeQuery(
                            "CREATE SEQUENCE IF NOT EXISTS member_barcode_seq START WITH 1000 INCREMENT BY 1")
                    .executeUpdate();
            entityManager
                    .createNativeQuery(
                            "CREATE SEQUENCE IF NOT EXISTS seq_smart_card_random_id START WITH 100000 INCREMENT BY 1")
                    .executeUpdate();
        } catch (Exception e) {
            log.warn("Sequence creation check skipped: {}", e.getMessage());
        }
    }

    @Override
    @Transactional
    public String generateBarcode(Member member) {
        if (!member.isPrincipal()) {
            return member.getParent().getBarcode(); // Dependents reuse parent barcode
        }

        ensureSequencesExist();
        int attempts = 0;
        String barcode;
        do {
            Number nextVal = (Number) entityManager.createNativeQuery("SELECT nextval('member_barcode_seq')")
                    .getSingleResult();
            barcode = String.format("WAHA-%d-%06d", Year.now().getValue(), nextVal.longValue());
            attempts++;
        } while (memberRepository.existsByBarcode(barcode) && attempts < 100);

        return barcode;
    }

    @Override
    @Transactional
    public String generateCardNumber(Member member) {
        String format = settingRepository.findById(1L)
                .map(com.waad.tba.modules.company.entity.Setting::getCardNumberFormat)
                .orElse("[PRO]-[YEAR]-[MP_NO][REL_SUFFIX]");

        String proCode = systemSettingRepository.findBySettingKey("PROVIDER_CODE").map(s -> s.getSettingValue())
                .orElse("WAAD");
        String idPart = String.valueOf(((Number) entityManager
                .createNativeQuery("SELECT nextval('seq_smart_card_random_id')").getSingleResult()).longValue());
        String relSuffix = determineRelationshipSuffix(member);

        String cardNo = format
                .replace("[PRO]", proCode)
                .replace("[YEAR]", String.valueOf(Year.now().getValue()))
                .replace("[MP_NO]", idPart)
                .replace("[REL_SUFFIX]", relSuffix)
                .replace("--", "-");

        return cardNo.endsWith("-") ? cardNo.substring(0, cardNo.length() - 1) : cardNo;
    }

    private String determineRelationshipSuffix(Member member) {
        if (member.isPrincipal())
            return "";

        String code = getRelationshipCode(member.getRelationship());
        long count = memberRepository.countByParentIdAndRelationship(member.getParent().getId(),
                member.getRelationship());
        int seq = (int) (count + 1);

        if ("W".equals(code) && seq == 1)
            return "W";
        return code + seq;
    }

    private String getRelationshipCode(Member.Relationship relationship) {
        if (relationship == null)
            return "X";
        try {
            String json = settingRepository.findById(1L).map(s -> s.getDependentSuffixes()).orElse("{}");
            Map<String, String> suffixMap = objectMapper.readValue(json,
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, String>>() {
                    });
            String code = suffixMap.get(relationship.name());
            if (code != null)
                return code;
        } catch (Exception e) {
            log.error("Error parsing suffixes: {}", e.getMessage());
        }

        return switch (relationship) {
            case WIFE -> "W";
            case HUSBAND -> "H";
            case SON -> "S";
            case DAUGHTER -> "D";
            default -> "O";
        };
    }
}
