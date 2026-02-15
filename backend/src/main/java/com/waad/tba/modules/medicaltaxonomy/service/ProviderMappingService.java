package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.medicaltaxonomy.dto.CatalogStatsDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MappingRequestDto;
import com.waad.tba.modules.medicaltaxonomy.dto.ProviderRawServiceDto;
import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseServiceMappingAudit;
import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseMedicalService;
import com.waad.tba.modules.medicaltaxonomy.enterprise.repository.EnterpriseMedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.enterprise.repository.EnterpriseServiceMappingAuditRepository;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProviderMappingService {

    private final ProviderRawServiceRepository rawServiceRepository;
    private final ProviderServiceMappingRepository mappingRepository;
    private final EnterpriseServiceMappingAuditRepository auditLogRepository;
    private final EnterpriseMedicalServiceRepository medicalServiceRepository;
    private final ProviderRepository providerRepository;
    private final ProviderContractPricingItemRepository pricingItemRepository;
    private final ProviderContractRepository contractRepository;

    public Page<ProviderRawServiceDto> getUnmappedServices(Long providerId, Long employerId, Pageable pageable) {
        if (providerId == null) {
            return Page.empty(pageable);
        }

        // Silent Auto-Sync if employer context is provided
        if (employerId != null) {
            syncFromActiveContracts(providerId, employerId);
        }

        return rawServiceRepository.findUnmappedServices(providerId, pageable)
                .map(this::mapToRawDto);
    }

    private void syncFromActiveContracts(Long providerId, Long employerId) {
        try {
            List<com.waad.tba.modules.providercontract.entity.ProviderContract> activeContracts = 
                contractRepository.findValidContracts(providerId, employerId, java.time.LocalDate.now());
            
            for (com.waad.tba.modules.providercontract.entity.ProviderContract contract : activeContracts) {
                importFromContractPricing(providerId, contract.getId());
            }
        } catch (Exception e) {
            log.error("Silent sync failed for provider {} and employer {}", providerId, employerId, e);
        }
    }

    @Transactional
    public void mapService(MappingRequestDto request, UserPrincipal currentUser) {
        List<Long> ids = new ArrayList<>();
        if (request.getRawServiceId() != null) ids.add(request.getRawServiceId());
        if (request.getRawServiceIds() != null) ids.addAll(request.getRawServiceIds());

        if (ids.isEmpty()) return;

        EnterpriseMedicalService masterService = medicalServiceRepository.findById(java.util.UUID.fromString(request.getMasterServiceId().toString()))
                .orElseThrow(() -> new ResourceNotFoundException("EnterpriseMedicalService", "id", request.getMasterServiceId()));

        for (Long rawId : ids) {
            mapSingleService(rawId, masterService, request, currentUser);
        }
    }

    private void mapSingleService(Long rawId, EnterpriseMedicalService masterService, MappingRequestDto request, UserPrincipal currentUser) {
        ProviderRawService rawService = rawServiceRepository.findById(rawId)
                .orElseThrow(() -> new ResourceNotFoundException("ProviderRawService", "id", rawId));
        
        Optional<ProviderServiceMapping> existingMappingOpt = mappingRepository.findByProviderIdAndProviderServiceCode(
                rawService.getProvider().getId(), rawService.getServiceCode());

        ProviderServiceMapping mapping;
        java.util.UUID oldMasterId = null;

        if (existingMappingOpt.isPresent()) {
            mapping = existingMappingOpt.get();
            oldMasterId = mapping.getMasterService().getId(); // This might still be problematic if oldMasterId is Long and getid() is UUID
            
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

        mapping = mappingRepository.save(mapping);

        // Audit Log
        EnterpriseMedicalService oldService = null;
        if (oldMasterId != null) {
            oldService = medicalServiceRepository.findById(oldMasterId).orElse(null);
        }

        EnterpriseServiceMappingAudit audit = EnterpriseServiceMappingAudit.builder()
                .legacyRawService(rawService)
                .oldMedicalService(oldService)
                .newMedicalService(masterService)
                .reason(request.getReasonCode())
                .changedBy(currentUser.getUsername())
                .build();
        
        auditLogRepository.save(audit);
        log.info("Mapped Provider Service [{}] to Master [{}] by {}", rawService.getServiceCode(), masterService.getCode(), currentUser.getUsername());
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

    public Page<EnterpriseServiceMappingAudit> getMappingAuditLogs(Pageable pageable) {
        return auditLogRepository.findAll(pageable);
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
                .description(entity.getDescription())
                .active(entity.getActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    /**
     * Import services from provider contract pricing items
     * Creates raw service entries for pricing items that can be mapped to master catalog
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
                ? item.getMedicalService().getNameAr()
                : item.getServiceName();

            // Skip if no code available
            if (code == null || code.trim().isEmpty()) {
                continue;
            }

            // Check if already exists
            Optional<ProviderRawService> existing = 
                rawServiceRepository.findByProviderIdAndServiceCode(providerId, code);
            
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
