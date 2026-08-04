package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.modules.medicaltaxonomy.dto.MappingSuggestionDto;
import com.waad.tba.modules.medicaltaxonomy.entity.*;
import com.waad.tba.modules.medicaltaxonomy.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceMappingEngine {
    private static final double AUTO_APPROVE_THRESHOLD = 0.95;
    private static final double FUZZY_REVIEW_THRESHOLD = 0.88;

    private final MedicalServiceRepository masterRepository;
    private final ProviderRawServiceRepository rawServiceRepository;
    private final SafeMedicalServiceAliasRepository safeAliasRepository;
    private final MedicalServiceExclusionRepository exclusionRepository;
    private final MedicalServiceSplitQueueRepository splitQueueRepository;
    private final EnterpriseServiceAliasRepository legacyAliasRepository;

    @Transactional(readOnly = true)
    public List<MappingSuggestionDto> getSuggestions(Long rawServiceId, String suppliedRawName, String suppliedRawCode) {
        ProviderRawService raw = rawServiceRepository.findById(rawServiceId)
                .orElseThrow(() -> new IllegalArgumentException("Raw service not found: " + rawServiceId));
        String rawName = Objects.toString(raw.getServiceName(), "");
        String rawCode = Objects.toString(raw.getServiceCode(), "");
        Long providerId = raw.getProvider() == null ? null : raw.getProvider().getId();

        if (suppliedRawName != null && !suppliedRawName.equals(rawName))
            log.warn("Ignoring spoofable rawName for rawServiceId={}", rawServiceId);
        if (suppliedRawCode != null && !suppliedRawCode.equals(rawCode))
            log.warn("Ignoring spoofable rawCode for rawServiceId={}", rawServiceId);

        return getSuggestionsInternal(providerId, rawName, rawCode);
    }

    /** Backward-compatible path: global exact aliases only; never provider auto-approve. */
    @Deprecated
    @Transactional(readOnly = true)
    public List<MappingSuggestionDto> getSuggestions(String rawName, String rawCode) {
        return getSuggestionsInternal(null, rawName, rawCode);
    }

    private List<MappingSuggestionDto> getSuggestionsInternal(Long providerId, String rawName, String rawCode) {
        String nameNorm = MedicalTextNormalizer.normalize(rawName);
        String codeNorm = MedicalTextNormalizer.normalize(rawCode);
        if (nameNorm.isBlank() && codeNorm.isBlank())
            return List.of(decision("REVIEW_REQUIRED", "EMPTY_INPUT", "اسم وكود الخدمة فارغان"));

        Optional<MedicalServiceExclusion> exclusion = exclusionRepository
                .findFirstByAliasNormalizedAndStatusOrderByConfidenceDesc(nameNorm, "EXCLUDED");
        if (exclusion.isPresent()) {
            MedicalServiceExclusion x = exclusion.get();
            return List.of(decision("EXCLUDED", "EXCLUSION_EXACT", x.getExclusionType() + ": " + x.getReason()));
        }

        Optional<MedicalServiceSplitQueue> split = splitQueueRepository
                .findFirstByServiceNormalizedAndStatusOrderByConfidenceDesc(nameNorm, "SPLIT_REQUIRED");
        if (split.isPresent())
            return List.of(decision("SPLIT_REQUIRED", "SPLIT_QUEUE_EXACT", split.get().getReason()));

        if (looksLikeMasterCode(rawCode)) {
            Optional<MedicalService> byCode = masterRepository.findByCode(rawCode.trim());
            if (byCode.isPresent())
                return List.of(fromMaster(byCode.get(), 1.0, "MASTER_CODE_EXACT", true, "GLOBAL", "كود WAC/SRV مطابق"));
        }

        if (providerId != null && !codeNorm.isBlank()) {
            List<MappingSuggestionDto> tier = safeAliasRepository.findProviderCodeMatches(providerId, codeNorm)
                    .stream().map(a -> fromAlias(a, "PROVIDER_CODE_EXACT")).toList();
            if (!tier.isEmpty()) return exactTierResult(tier, "PROVIDER_CODE_CONFLICT");
        }

        if (providerId != null && !nameNorm.isBlank()) {
            List<MappingSuggestionDto> tier = safeAliasRepository.findProviderAliasMatches(providerId, nameNorm)
                    .stream().map(a -> fromAlias(a, "PROVIDER_ALIAS_EXACT")).toList();
            if (!tier.isEmpty()) return exactTierResult(tier, "PROVIDER_ALIAS_CONFLICT");
        }

        if (!nameNorm.isBlank()) {
            List<MappingSuggestionDto> tier = safeAliasRepository.findGlobalAliasMatches(nameNorm)
                    .stream().map(a -> fromAlias(a, "GLOBAL_ALIAS_EXACT")).toList();
            if (!tier.isEmpty()) return exactTierResult(tier, "GLOBAL_ALIAS_CONFLICT");
        }

        List<MappingSuggestionDto> legacy = new ArrayList<>();
        if (!rawName.isBlank()) {
            legacyAliasRepository.findByAliasTextIgnoreCase(rawName.trim()).forEach(a ->
                    legacy.add(fromMaster(a.getMedicalService(), 0.90, "LEGACY_ALIAS_EXACT", false,
                            "LEGACY", "مرادف قديم بلا نطاق أو ثقة؛ يحتاج مراجعة")));
        }
        if (!legacy.isEmpty()) return exactTierResult(legacy, "LEGACY_ALIAS_CONFLICT");

        if (!MedicalTextNormalizer.isSafeForFuzzy(nameNorm))
            return List.of(decision("REVIEW_REQUIRED", "SHORT_OR_OPAQUE", "الاسم قصير أو غير كافٍ للمطابقة التقريبية"));

        List<MappingSuggestionDto> fuzzy = new ArrayList<>();
        for (MedicalService master : masterRepository.findAll()) {
            double score = calculateSimilarity(nameNorm, master.getName(), master.getNameEn());
            if (score >= FUZZY_REVIEW_THRESHOLD)
                fuzzy.add(fromMaster(master, score, "FUZZY_REVIEW_ONLY", false,
                        "GLOBAL", "مطابقة تقريبية لا تعتمد تلقائياً"));
        }
        if (fuzzy.isEmpty())
            return List.of(decision("REVIEW_REQUIRED", "NO_SAFE_MATCH", "لا يوجد تطابق قطعي أو مرادف معتمد"));
        return topUnique(fuzzy);
    }

    private List<MappingSuggestionDto> exactTierResult(List<MappingSuggestionDto> tier, String conflictSource) {
        List<MappingSuggestionDto> unique = topUnique(tier);
        long distinctMasters = unique.stream().map(MappingSuggestionDto::getMasterServiceId)
                .filter(Objects::nonNull).distinct().count();
        if (distinctMasters > 1) {
            return List.of(decision("REVIEW_REQUIRED", conflictSource,
                    "وجد أكثر من تطابق قطعي لخدمات رئيسية مختلفة؛ أوقف الاعتماد الآلي"));
        }
        return unique;
    }

    private MappingSuggestionDto fromAlias(SafeMedicalServiceAlias alias, String source) {
        boolean auto = Boolean.TRUE.equals(alias.getAutoApprove()) && alias.getConfidence() != null
                && alias.getConfidence() >= AUTO_APPROVE_THRESHOLD && "READY".equals(alias.getStatus());
        return fromMaster(alias.getMedicalService(), alias.getConfidence(), source, auto,
                alias.getMatchScope(), alias.getNotes());
    }

    private MappingSuggestionDto fromMaster(MedicalService master, double score, String source,
                                             boolean autoApprove, String scope, String reason) {
        return MappingSuggestionDto.builder()
                .masterServiceId(master.getId()).code(master.getCode())
                .nameAr(master.getName()).nameEn(master.getNameEn())
                .confidenceScore(score).matchSource(source)
                .autoApprove(autoApprove).requiresReview(!autoApprove)
                .decision(autoApprove ? "AUTO_APPROVE" : "REVIEW_REQUIRED")
                .reason(reason).matchScope(scope).build();
    }

    private MappingSuggestionDto decision(String decision, String source, String reason) {
        return MappingSuggestionDto.builder().confidenceScore(1.0).matchSource(source)
                .autoApprove(false).requiresReview(!"EXCLUDED".equals(decision))
                .decision(decision).reason(reason).matchScope("POLICY").build();
    }

    private boolean looksLikeMasterCode(String code) {
        if (code == null) return false;
        String c = code.trim().toUpperCase(Locale.ROOT);
        return c.startsWith("WAC-") || c.startsWith("SRV-") || c.startsWith("MED-") || c.startsWith("LAB-");
    }

    private double calculateSimilarity(String normalizedRaw, String nameAr, String nameEn) {
        return Math.max(score(normalizedRaw, MedicalTextNormalizer.normalize(nameAr)),
                        score(normalizedRaw, MedicalTextNormalizer.normalize(nameEn)));
    }

    private double score(String a, String b) {
        if (a.isBlank() || b.isBlank()) return 0.0;
        double lev = levenshteinSimilarity(a, b);
        Set<String> at = new HashSet<>(Arrays.asList(a.split(" ")));
        Set<String> bt = new HashSet<>(Arrays.asList(b.split(" ")));
        Set<String> intersection = new HashSet<>(at); intersection.retainAll(bt);
        Set<String> union = new HashSet<>(at); union.addAll(bt);
        double jaccard = union.isEmpty() ? 0.0 : (double) intersection.size() / union.size();
        return 0.7 * lev + 0.3 * jaccard;
    }

    private double levenshteinSimilarity(String a, String b) {
        int[] costs = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) costs[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            costs[0] = i; int nw = i - 1;
            for (int j = 1; j <= b.length(); j++) {
                int cj = Math.min(1 + Math.min(costs[j], costs[j - 1]),
                        a.charAt(i - 1) == b.charAt(j - 1) ? nw : nw + 1);
                nw = costs[j]; costs[j] = cj;
            }
        }
        int max = Math.max(a.length(), b.length());
        return max == 0 ? 1.0 : 1.0 - (double) costs[b.length()] / max;
    }

    private List<MappingSuggestionDto> topUnique(List<MappingSuggestionDto> items) {
        return items.stream().sorted(Comparator.comparingDouble(MappingSuggestionDto::getConfidenceScore).reversed())
                .filter(distinctByKey(x -> x.getMasterServiceId() == null ? x.getDecision() : x.getMasterServiceId()))
                .limit(5).collect(Collectors.toList());
    }

    private static <T> java.util.function.Predicate<T> distinctByKey(
            java.util.function.Function<? super T, ?> keyExtractor) {
        Set<Object> seen = ConcurrentHashMap.newKeySet();
        return t -> seen.add(keyExtractor.apply(t));
    }
}
