package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.benefitpolicy.dto.CoverageDistributionDto;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.entity.CoverageDistribution;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.benefitpolicy.repository.CoverageDistributionRepository;
import com.waad.tba.modules.medicaltaxonomy.enterprise.entity.EnterpriseMedicalService;
import com.waad.tba.modules.medicaltaxonomy.enterprise.repository.EnterpriseMedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoverageDistributionService {

    private final CoverageDistributionRepository distributionRepository;
    private final BenefitPolicyRepository policyRepository;
    private final MedicalCategoryRepository categoryRepository;
    private final EnterpriseMedicalServiceRepository serviceRepository;

    @Transactional(readOnly = true)
    public List<CoverageDistributionDto> findByPolicyId(Long policyId) {
        return distributionRepository.findByBenefitPolicyId(policyId).stream()
                .map(CoverageDistributionDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = "coverageResolution", allEntries = true)
    public CoverageDistributionDto addDistribution(Long policyId, CoverageDistributionDto dto) {
        log.info("Adding distribution to policy {}: categoryId={}, serviceId={}", 
                policyId, dto.getCategoryId(), dto.getServiceId());

        BenefitPolicy policy = policyRepository.findById(policyId)
                .orElseThrow(() -> new BusinessRuleException("Policy not found: " + policyId));

        String categoryCode = dto.getCategoryId();
        if (categoryCode != null && !categoryCode.isBlank()) {
            if (!categoryRepository.existsByCode(categoryCode)) {
                throw new BusinessRuleException("Category not found: " + categoryCode);
            }
        }

        EnterpriseMedicalService service = null;
        if (dto.getServiceId() != null) {
            service = serviceRepository.findById(dto.getServiceId())
                    .orElseThrow(() -> new BusinessRuleException("Service not found: " + dto.getServiceId()));
        }

        if (categoryCode == null && service == null) {
            throw new BusinessRuleException("Distribution must target either a Category or a Service");
        }

        CoverageDistribution distribution = CoverageDistribution.builder()
                .benefitPolicy(policy)
                .medicalCategory(categoryCode)
                .medicalService(service)
                .limitAmount(dto.getLimitAmount())
                .active(true)
                .build();

        distribution = distributionRepository.save(distribution);
        return CoverageDistributionDto.fromEntity(distribution);
    }

    @Transactional
    @CacheEvict(value = "coverageResolution", allEntries = true)
    public void removeDistribution(Long id) {
        log.info("Removing distribution: {}", id);
        CoverageDistribution distribution = distributionRepository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("Distribution not found: " + id));
        distributionRepository.delete(distribution);
    }
}
