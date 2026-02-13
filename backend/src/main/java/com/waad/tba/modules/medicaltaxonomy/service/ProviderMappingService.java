package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.medicaltaxonomy.dto.CatalogStatsDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MappingRequestDto;
import com.waad.tba.modules.medicaltaxonomy.dto.ProviderRawServiceDto;
import com.waad.tba.modules.medicaltaxonomy.entity.MappingAuditLog;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.entity.ProviderRawService;
import com.waad.tba.modules.medicaltaxonomy.entity.ProviderServiceMapping;
import com.waad.tba.modules.medicaltaxonomy.repository.MappingAuditLogRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.ProviderRawServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.ProviderServiceMappingRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProviderMappingService {

    private final ProviderRawServiceRepository rawServiceRepository;
    private final ProviderServiceMappingRepository mappingRepository;
    private final MappingAuditLogRepository auditLogRepository;
    private final MedicalServiceRepository medicalServiceRepository;
    private final ProviderRepository providerRepository;

    public Page<ProviderRawServiceDto> getUnmappedServices(Long providerId, Pageable pageable) {
        return rawServiceRepository.findUnmappedServices(providerId, pageable)
                .map(this::mapToRawDto);
    }

    @Transactional
    public void mapService(MappingRequestDto request, UserPrincipal currentUser) {
        ProviderRawService rawService = rawServiceRepository.findById(request.getRawServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("ProviderRawService", "id", request.getRawServiceId()));
        
        MedicalService masterService = medicalServiceRepository.findById(request.getMasterServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("MedicalService", "id", request.getMasterServiceId()));

        Optional<ProviderServiceMapping> existingMappingOpt = mappingRepository.findByProviderIdAndProviderServiceCode(
                rawService.getProvider().getId(), rawService.getServiceCode());

        ProviderServiceMapping mapping;
        Long oldMasterId = null;

        if (existingMappingOpt.isPresent()) {
            mapping = existingMappingOpt.get();
            oldMasterId = mapping.getMasterService().getId();
            
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
        MappingAuditLog audit = MappingAuditLog.builder()
                .mappingId(mapping.getId())
                .oldMasterId(oldMasterId)
                .newMasterId(masterService.getId())
                .reasonCode(request.getReasonCode())
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

    public Page<MappingAuditLog> getMappingAuditLogs(Pageable pageable) {
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
}
