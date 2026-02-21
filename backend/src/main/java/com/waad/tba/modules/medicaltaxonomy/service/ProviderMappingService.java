package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.medicaltaxonomy.dto.CatalogStatsDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MappingRequestDto;
import com.waad.tba.modules.medicaltaxonomy.dto.ProviderRawServiceDto;
import com.waad.tba.modules.medicaltaxonomy.entity.ProviderMappingAudit;
import com.waad.tba.modules.medicaltaxonomy.repository.ProviderMappingAuditRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.ProviderRawService;
import com.waad.tba.modules.medicaltaxonomy.entity.ProviderServiceMapping;
import com.waad.tba.modules.medicaltaxonomy.repository.ProviderRawServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.ProviderServiceMappingRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.providercontract.entity.ProviderContractPricingItem;
import com.waad.tba.modules.providercontract.repository.ProviderContractPricingItemRepository;
import com.waad.tba.modules.providercontract.repository.ProviderContractRepository;
import com.waad.tba.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProviderMappingService {

    private final ProviderRawServiceRepository rawServiceRepository;
    private final ProviderServiceMappingRepository mappingRepository;
    private final ProviderMappingAuditRepository auditRepository;
    private final MedicalServiceRepository medicalServiceRepository;
    private final ProviderRepository providerRepository;
    private final ProviderContractPricingItemRepository pricingItemRepository;
    private final ProviderContractRepository contractRepository;

    /**
     * Get filtered services for a provider (All, Mapped, or Unmapped)
     */
    @Transactional
    public Page<ProviderRawServiceDto> getFilteredServices(Long providerId, Boolean mapped, String searchTerm,
            Pageable pageable) {
        if (providerId == null) {
            return Page.empty(pageable);
        }

        // Silent Sync if needed (maybe throttled in production, but here we always sync
        // for latest)
        // Note: For "All" view, we sync from contracts to ensure we have every service
        syncFromActiveContracts(providerId, null);

        return rawServiceRepository.findFilteredServices(providerId, mapped, searchTerm, pageable)
                .map(this::mapToRawDto);
    }

    /**
     * Get unmapped services for a provider (Legacy compatibility)
     */
    public Page<ProviderRawServiceDto> getUnmappedServices(Long providerId, Long employerId, Pageable pageable) {
        if (providerId == null) {
            return Page.empty(pageable);
        }

        syncFromActiveContracts(providerId, employerId);

        return rawServiceRepository.findUnmappedServices(providerId, pageable)
                .map(this::mapToRawDto);
    }

    private void syncFromActiveContracts(Long providerId, Long employerId) {
        try {
            List<com.waad.tba.modules.providercontract.entity.ProviderContract> activeContracts;

            if (employerId != null) {
                activeContracts = contractRepository.findValidContracts(providerId, employerId,
                        java.time.LocalDate.now());
            } else {
                // Fetch ALL active contracts regardless of employer to sync all provider
                // services
                activeContracts = contractRepository.findByProviderIdAndStatusAndActiveTrue(
                        providerId,
                        com.waad.tba.modules.providercontract.entity.ProviderContract.ContractStatus.ACTIVE);
            }

            for (int i = 0; i < activeContracts.size(); i++) {
                rawServiceRepository.syncFromContractPricing(providerId);
            }
        } catch (Exception e) {
            log.error("Silent sync failed for provider {} and employer {}", providerId, employerId, e);
        }
    }

    @Transactional
    public void mapService(MappingRequestDto request, UserPrincipal currentUser) {
        java.util.Set<Long> ids = new java.util.HashSet<>();
        if (request.getRawServiceId() != null)
            ids.add(request.getRawServiceId());
        if (request.getRawServiceIds() != null)
            ids.addAll(request.getRawServiceIds());

        if (ids.isEmpty())
            return;

        MedicalService masterService = medicalServiceRepository.findById(request.getMasterServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("MedicalService", "id", request.getMasterServiceId()));

        for (Long rawId : ids) {
            mapSingleService(rawId, masterService, request, currentUser);
        }
    }

    @Transactional
    public void unmapService(List<Long> rawServiceIds, UserPrincipal currentUser) {
        if (rawServiceIds == null || rawServiceIds.isEmpty())
            return;

        for (Long rawId : rawServiceIds) {
            ProviderRawService rawService = rawServiceRepository.findById(rawId)
                    .orElseThrow(() -> new ResourceNotFoundException("ProviderRawService", "id", rawId));

            if (!rawService.isMapped())
                continue;

            // 1. Update Raw Service Status
            rawService.setMapped(false);
            rawService.setMedicalServiceCode(null);
            rawService.setMappedAt(null);
            rawServiceRepository.save(rawService);

            // 2. Deactivate Mapping entry
            Optional<ProviderServiceMapping> mappingOpt = mappingRepository.findByProviderIdAndProviderServiceCode(
                    rawService.getProvider().getId(), rawService.getServiceCode());

            MedicalService oldService = null;
            if (mappingOpt.isPresent()) {
                ProviderServiceMapping mapping = mappingOpt.get();
                oldService = mapping.getMasterService();
                mapping.setActive(false);
                mappingRepository.save(mapping);
            }

            // 3. Audit Log
            ProviderMappingAudit audit = ProviderMappingAudit.builder()
                    .providerRawService(rawService)
                    .oldMedicalService(oldService)
                    .newMedicalService(null) // Unmapped
                    .reason("MANUAL_UNMAP")
                    .changedBy(currentUser.getUsername())
                    .build();

            auditRepository.save(audit);
            log.info("Unmapped Provider Service [{}] by {}", rawService.getServiceCode(), currentUser.getUsername());
        }
    }

    private void mapSingleService(Long rawId, MedicalService masterService, MappingRequestDto request,
            UserPrincipal currentUser) {
        ProviderRawService rawService = rawServiceRepository.findById(rawId)
                .orElseThrow(() -> new ResourceNotFoundException("ProviderRawService", "id", rawId));

        // 1. Update Raw Service Status (MANDATORY for Inventory Dashboard sync)
        rawService.setMapped(true);
        rawService.setMedicalServiceCode(masterService.getCode());
        rawService.setMappedAt(java.time.LocalDateTime.now());
        rawServiceRepository.save(rawService);

        // 2. Resolve/Create Mapping
        Optional<ProviderServiceMapping> existingMappingOpt = mappingRepository.findByProviderIdAndProviderServiceCode(
                rawService.getProvider().getId(), rawService.getServiceCode());

        ProviderServiceMapping mapping;
        MedicalService oldService = null;

        if (existingMappingOpt.isPresent()) {
            mapping = existingMappingOpt.get();
            oldService = mapping.getMasterService();

            // Updates
            mapping.setMasterService(masterService);
            mapping.setActive(true);
            mapping.setReasonCode(request.getReasonCode());
            mapping.setConfidence(request.getConfidence() != null ? request.getConfidence() : 1.0);
        } else {
            // Create New
            mapping = ProviderServiceMapping.builder()
                    .provider(rawService.getProvider())
                    .providerServiceCode(rawService.getServiceCode())
                    .masterService(masterService)
                    .confidence(request.getConfidence() != null ? request.getConfidence() : 1.0)
                    .active(true)
                    .reasonCode(request.getReasonCode())
                    .createdBy(currentUser.getUsername())
                    .build();
        }

        // 3. Save and Flush to prevent 409 Conflict if multiple raw services share the
        // same code in this transaction
        mapping = mappingRepository.saveAndFlush(mapping);

        // 4. Audit Log
        ProviderMappingAudit audit = ProviderMappingAudit.builder()
                .providerRawService(rawService)
                .oldMedicalService(oldService)
                .newMedicalService(masterService)
                .reason(request.getReasonCode())
                .changedBy(currentUser.getUsername())
                .build();

        auditRepository.save(audit);
        log.info("Mapped Provider Service [{}] to Master [{}] by {}", rawService.getServiceCode(),
                masterService.getCode(), currentUser.getUsername());
    }

    @Transactional
    public void assignCategory(Long rawId, String categoryName) {
        ProviderRawService rawService = rawServiceRepository.findById(rawId)
                .orElseThrow(() -> new ResourceNotFoundException("ProviderRawService", "id", rawId));

        rawService.setCategory(categoryName);
        rawServiceRepository.save(rawService);

        log.info("Assigned Category [{}] to Provider Raw Service ID [{}]", categoryName, rawId);
    }

    @Transactional
    public void uploadRawService(Long providerId, String code, String name, String description) {
        // Idempotent insert
        Optional<ProviderRawService> existing = rawServiceRepository.findByProviderIdAndServiceCode(providerId, code);
        if (existing.isPresent()) {
            return;
        }

        Provider provider = providerRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Provider", "id", providerId));

        ProviderRawService raw = ProviderRawService.builder()
                .provider(provider)
                .serviceCode(code)
                .serviceName(name)
                .description(description)
                .active(true)
                .build();

        rawServiceRepository.save(raw);
    }

    public Page<ProviderMappingAudit> getMappingAuditLogs(Pageable pageable) {
        return auditRepository.findAll(pageable);
    }

    public CatalogStatsDto getCatalogStats() {
        long totalMaster = medicalServiceRepository.count();
        long totalRaw = rawServiceRepository.count();
        long mappedCount = mappingRepository.countByActiveTrue();

        double completionRate = totalRaw > 0 ? (double) mappedCount / totalRaw * 100 : 0;

        return CatalogStatsDto.builder()
                .totalMaster(totalMaster)
                .totalRaw(totalRaw)
                .mappedCount(mappedCount)
                .completionRate(Math.round(completionRate * 10.0) / 10.0)
                .build();
    }

    private ProviderRawServiceDto mapToRawDto(ProviderRawService entity) {
        return ProviderRawServiceDto.builder()
                .id(entity.getId())
                .providerId(entity.getProvider().getId())
                .providerName(entity.getProvider().getName())
                .serviceCode(entity.getServiceCode())
                .serviceName(entity.getServiceName())
                .serviceDescription(entity.getDescription())
                .category(entity.getCategory())
                .specialty(entity.getSpecialty())
                .mapped(entity.isMapped())
                .medicalServiceCode(entity.getMedicalServiceCode())
                .mappedAt(entity.getMappedAt())
                .active(entity.getActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    /**
     * Import services from provider contract pricing items
     * Creates raw service entries for pricing items that can be mapped to master
     * catalog
     */
    @Transactional
    public int importFromContractPricing(Long providerId, Long contractId) {
        Provider provider = providerRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Provider", "id", providerId));

        List<ProviderContractPricingItem> pricingItems;

        if (contractId != null) {
            // Import from specific contract
            pricingItems = pricingItemRepository.findByContractIdAndActiveTrue(contractId);
        } else {
            // Import from all active contracts of the provider
            pricingItems = pricingItemRepository.findAllServicesByProvider(providerId);
        }

        int count = 0;
        for (ProviderContractPricingItem item : pricingItems) {
            // Use service code from medical service or item's own code
            String code = item.getMedicalService() != null
                    ? item.getMedicalService().getCode()
                    : item.getServiceCode();

            String name = item.getMedicalService() != null
                    ? item.getMedicalService().getName()
                    : item.getServiceName();

            // Skip if no code available
            if (code == null || code.trim().isEmpty()) {
                continue;
            }

            // Check if already exists
            Optional<ProviderRawService> existing = rawServiceRepository.findByProviderIdAndServiceCode(providerId,
                    code);

            if (existing.isPresent()) {
                continue; // Skip duplicates
            }

            // Create raw service
            ProviderRawService raw = ProviderRawService.builder()
                    .provider(provider)
                    .serviceCode(code)
                    .serviceName(name != null ? name : code)
                    .description(item.getNotes())
                    .active(true)
                    .build();

            rawServiceRepository.save(raw);
            count++;
        }

        log.info("Imported {} services from contract pricing for provider {}", count, providerId);
        return count;
    }
}
