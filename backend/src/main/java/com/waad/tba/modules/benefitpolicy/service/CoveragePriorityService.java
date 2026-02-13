package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.modules.benefitpolicy.entity.CoverageRuleConfig;
import com.waad.tba.modules.benefitpolicy.repository.CoverageRuleConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for managing coverage rule priorities.
 * Uses caching to ensure performance.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CoveragePriorityService {

    private final CoverageRuleConfigRepository repository;

    /**
     * Get all priority weights.
     * Cached to avoid DB hits on every claim.
     */
    @Cacheable(value = "coveragePriorities")
    public Map<String, Integer> getPriorityWeights() {
        log.info("Loading coverage priority weights from database");
        return repository.findAll().stream()
                .collect(Collectors.toMap(
                        CoverageRuleConfig::getRuleKey,
                        CoverageRuleConfig::getPriorityWeight
                ));
    }

    /**
     * Get weight for a specific rule key.
     */
    public Integer getWeight(String ruleKey, Integer defaultWeight) {
        return getPriorityWeights().getOrDefault(ruleKey, defaultWeight);
    }

    /**
     * Clear cache when updates happen (Admin operation).
     */
    @CacheEvict(value = "coveragePriorities", allEntries = true)
    public void refreshCache() {
        log.info("Refreshing coverage priorities cache");
    }
    
    /**
     * Map rule attributes to a config key.
     */
    /**
     * Map rule attributes to a config key.
     */
    public String resolveRuleKey(boolean isServiceMatch, boolean isPackageMatch, boolean isCategoryMatch, boolean isEncounterMatch) {
        if (isServiceMatch) {
            return isEncounterMatch ? "SERVICE_ENCOUNTER_MATCH" : "SERVICE_ANY_ENCOUNTER";
        } else if (isPackageMatch) {
            return isEncounterMatch ? "PACKAGE_ENCOUNTER_MATCH" : "PACKAGE_ANY_ENCOUNTER";
        } else if (isCategoryMatch) {
            return isEncounterMatch ? "CATEGORY_ENCOUNTER_MATCH" : "CATEGORY_ANY_ENCOUNTER";
        }
        return "POLICY_DEFAULT";
    }
}
