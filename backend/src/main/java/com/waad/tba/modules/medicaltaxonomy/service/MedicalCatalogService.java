package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.entity.ProviderServiceMapping;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.ProviderServiceMappingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Service for Medical Master Catalog operations.
 * 
 * Core Responsibilities:
 * 1. Resolving Provider Service Codes to Master Services.
 * 2. Managing the lifecycle of Master Services vs Mappings.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MedicalCatalogService {

    private final ProviderServiceMappingRepository mappingRepository;
    private final MedicalServiceRepository masterServiceRepository;
    private final com.waad.tba.modules.provider.repository.ProviderRepository providerRepository;

    /**
     * Resolve a provider-specific service code to its Master Service.
     * 
     * ARCHITECTURAL RULE:
     * - If a mapping exists, use it.
     * - If no mapping exists, the system should NOT silently guess.
     * - Future: AI-assisted matching could provide suggestions here.
     * 
     * @param providerId ID of the provider submitting the claim
     * @param providerServiceCode The code provided in the claim/request
     * @return The Master Medical Service
     * @throws BusinessRuleException if no mapping is found
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "serviceResolution", key = "{#providerId, #providerServiceCode}")
    public MedicalService resolveService(Long providerId, String providerServiceCode) {
        log.debug("Resolving service mapping for provider {} with code {}", providerId, providerServiceCode);

        // 1. Try to find an explicit mapping
        Optional<ProviderServiceMapping> mapping = mappingRepository.findMapping(providerId, providerServiceCode);
        
        if (mapping.isPresent()) {
            return mapping.get().getMasterService();
        }

        // 2. FALLBACK: Check if the provider is already using a Master Service Code
        // Some providers (especially large ones) might already use the system's standard codes.
        Optional<MedicalService> masterService = masterServiceRepository.findByCode(providerServiceCode);
        if (masterService.isPresent()) {
            log.info("ℹ️ No explicit mapping found for code '{}', but it matches a Master Service. Using as direct match.", providerServiceCode);
            return masterService.get();
        }

        // 3. FAILURE: No mapping and no direct match
        log.error("❌ Failed to resolve service mapping for provider {} : code '{}' is unknown.", providerId, providerServiceCode);
        throw new BusinessRuleException(
            String.format("لم يتم التعرف على كود الخدمة '%s' لهذا المزود. يرجى ربط الخدمة بالفهرس الموحد أولاً.", providerServiceCode)
        );
    }

    /**
     * Check if a service is a Master Service.
     */
    public boolean isMaster(Long serviceId) {
        return masterServiceRepository.findById(serviceId)
                .map(MedicalService::isMaster)
                .orElse(false);
    }

    /**
     * Bulk map provider service codes to Master Medical Services.
     * Overwrites existing mappings if they exist.
     */
    @Transactional
    public int batchMapProviderServices(com.waad.tba.modules.medicaltaxonomy.dto.BatchMappingRequestDto request) {
        log.info("Batch mapping {} services for provider {}", request.getMappings().size(), request.getProviderId());

        com.waad.tba.modules.provider.entity.Provider provider = providerRepository.findById(request.getProviderId())
                .orElseThrow(() -> new BusinessRuleException("Provider not found: " + request.getProviderId()));

        int mappedCount = 0;
        for (var entry : request.getMappings()) {
            try {
                // Find master service
                MedicalService masterService = masterServiceRepository.findByCode(entry.getMasterServiceCode())
                        .orElseThrow(() -> new BusinessRuleException("Master service not found: " + entry.getMasterServiceCode()));

                // Check for existing mapping
                Optional<ProviderServiceMapping> existing = mappingRepository.findMapping(provider.getId(), entry.getProviderServiceCode());
                
                ProviderServiceMapping mapping;
                if (existing.isPresent()) {
                    mapping = existing.get();
                    mapping.setMasterService(masterService);
                    mapping.setConfidence(entry.getConfidence());
                } else {
                    mapping = ProviderServiceMapping.builder()
                            .provider(provider)
                            .providerServiceCode(entry.getProviderServiceCode())
                            .masterService(masterService)
                            .confidence(entry.getConfidence())
                            .build();
                }

                mappingRepository.save(mapping);
                mappedCount++;
            } catch (Exception e) {
                log.warn("Failed to map provider code {}: {}", entry.getProviderServiceCode(), e.getMessage());
            }
        }

        log.info("✅ Batch mapping complete: {} services mapped for provider {}", mappedCount, provider.getName());
        return mappedCount;
    }
}
