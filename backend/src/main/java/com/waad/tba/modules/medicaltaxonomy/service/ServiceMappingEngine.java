package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.modules.medicaltaxonomy.dto.MappingSuggestionDto;
import com.waad.tba.modules.medicaltaxonomy.entity.EnterpriseServiceAlias;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.EnterpriseServiceAliasRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceMappingEngine {

    private final MedicalServiceRepository masterRepository;
    private final EnterpriseServiceAliasRepository aliasRepository;

    public List<MappingSuggestionDto> getSuggestions(String rawName, String rawCode) {
        log.debug("Generating suggestions for: {} - {}", rawCode, rawName);
        
        List<MappingSuggestionDto> suggestions = new ArrayList<>();

        // 1. Direct Code Match (Highest confidence)
        masterRepository.findByCode(rawCode).ifPresent(master -> 
            suggestions.add(createSuggestion(master, 1.0, "CODE_MATCH"))
        );

        // 2. Alias Matches
        List<EnterpriseServiceAlias> aliasMatches = aliasRepository.findByAliasTextContainingIgnoreCase(rawName);
        for (EnterpriseServiceAlias alias : aliasMatches) {
            suggestions.add(createSuggestion(alias.getMedicalService(), 0.9, "ALIAS_MATCH"));
        }

        // 3. Text Similarity (Levenshtein)
        List<MedicalService> masters = masterRepository.findAll();
        for (MedicalService master : masters) {
            double similarity = calculateSimilarity(rawName, master.getName(), master.getNameEn());
            if (similarity > 0.4) {
                suggestions.add(createSuggestion(master, similarity, "TEXT_SIMILARITY"));
            }
        }

        // Return top 5 unique suggestions sorted by confidence
        return suggestions.stream()
                .sorted(Comparator.comparingDouble(MappingSuggestionDto::getConfidenceScore).reversed())
                .filter(distinctByKey(MappingSuggestionDto::getMasterServiceId))
                .limit(5)
                .collect(Collectors.toList());
    }

    private MappingSuggestionDto createSuggestion(MedicalService master, double score, String source) {
        return MappingSuggestionDto.builder()
                .masterServiceId(master.getId())
                .code(master.getCode())
                .nameAr(master.getName())
                .nameEn(master.getNameEn())
                .confidenceScore(score)
                .matchSource(source)
                .build();
    }

    private double calculateSimilarity(String raw, String nameAr, String nameEn) {
        double arScore = getLevenshteinSimilarity(raw, nameAr);
        double enScore = getLevenshteinSimilarity(raw, nameEn);
        return Math.max(arScore, enScore);
    }

    private double getLevenshteinSimilarity(String s1, String s2) {
        if (s1 == null || s2 == null) return 0.0;
        int distance = levenshteinDistance(s1.toLowerCase(), s2.toLowerCase());
        int maxLen = Math.max(s1.length(), s2.length());
        return maxLen == 0 ? 1.0 : 1.0 - (double) distance / maxLen;
    }

    private int levenshteinDistance(String s1, String s2) {
        int[] costs = new int[s2.length() + 1];
        for (int j = 0; j <= s2.length(); j++) costs[j] = j;
        for (int i = 1; i <= s1.length(); i++) {
            costs[0] = i;
            int nw = i - 1;
            for (int j = 1; j <= s2.length(); j++) {
                int cj = Math.min(1 + Math.min(costs[j], costs[j - 1]), s1.charAt(i - 1) == s2.charAt(j - 1) ? nw : nw + 1);
                nw = costs[j];
                costs[j] = cj;
            }
        }
        return costs[s2.length()];
    }

    private static <T> java.util.function.Predicate<T> distinctByKey(java.util.function.Function<? super T, ?> keyExtractor) {
        Set<Object> seen = ConcurrentHashMap.newKeySet();
        return t -> seen.add(keyExtractor.apply(t));
    }
}
