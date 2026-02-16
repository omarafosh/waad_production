package com.waad.tba.modules.medicaltaxonomy.enterprise.service;

import com.waad.tba.modules.medicaltaxonomy.enterprise.dto.MappingRequestDto;
import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.*;
import com.waad.tba.modules.medicaltaxonomy.enterprise.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Service
@RequiredArgsConstructor
@Slf4j
public class MappingEnterpriseService {

    private final EnterpriseProviderRawServiceRepository rawRepository;
    private final EnterpriseMedicalServiceRepository masterRepository;
    private final EnterpriseServiceMappingAuditRepository auditRepository;
    private final EnterpriseServiceAliasRepository aliasRepository;

    @Transactional
    public void performManualMapping(MappingRequestDto request, String username) {
        EnterpriseProviderRawService rawService = rawRepository.findById(request.getRawServiceId())
                .orElseThrow(() -> new RuntimeException("Raw Service not found"));

        EnterpriseMedicalService masterService = masterRepository.findById(request.getMasterServiceId())
                .orElseThrow(() -> new RuntimeException("Master Service not found"));

        EnterpriseMedicalService oldMaster = rawService.getMappedService();
        
        // Update Raw Service
        rawService.setMappedService(masterService);
        rawService.setMappingStatus(EnterpriseProviderRawService.MappingStatus.ACTIVE);
        rawService.setConfidenceScore(request.getConfidence() != null ? request.getConfidence() : 1.0);
        rawRepository.save(rawService);

        // Audit Log
        EnterpriseServiceMappingAudit audit = EnterpriseServiceMappingAudit.builder()
                .providerRawService(rawService)
                .oldMedicalService(oldMaster)
                .newMedicalService(masterService)
                .changedBy(username)
                .reason(request.getReason())
                .build();
        auditRepository.save(audit);

        // Save Alias for future auto-mapping
        saveAliasIfNew(masterService, rawService.getRawName());
        
        log.info("Successfully mapped raw service {} to master service {} by {}", 
                rawService.getRawCode(), masterService.getCode(), username);
    }

    private void saveAliasIfNew(EnterpriseMedicalService master, String aliasText) {
        EnterpriseServiceAlias alias = EnterpriseServiceAlias.builder()
                .medicalService(master)
                .aliasText(aliasText)
                .build();
        aliasRepository.save(alias);
    }
}
