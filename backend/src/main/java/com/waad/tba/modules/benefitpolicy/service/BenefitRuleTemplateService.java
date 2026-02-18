package com.waad.tba.modules.benefitpolicy.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.benefitpolicy.dto.BenefitPolicyRuleCreateDto;
import com.waad.tba.modules.benefitpolicy.dto.BenefitRuleTemplateResponseDto;
import com.waad.tba.modules.benefitpolicy.entity.BenefitRuleTemplate;
import com.waad.tba.modules.benefitpolicy.entity.BenefitRuleTemplateItem;
import com.waad.tba.modules.benefitpolicy.repository.BenefitRuleTemplateRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BenefitRuleTemplateService {

    private final BenefitRuleTemplateRepository templateRepository;
    private final BenefitPolicyRuleService ruleService;
    private final MedicalCategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<BenefitRuleTemplateResponseDto> getAllTemplates() {
        return templateRepository.findAllWithItems().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BenefitRuleTemplateResponseDto getTemplateById(Long id) {
        BenefitRuleTemplate template = templateRepository.findByIdWithItems(id);
        if (template == null) {
            throw new BusinessRuleException("Template not found with ID: " + id);
        }
        return mapToDto(template);
    }

    @Transactional
    public void applyTemplateToPolicy(Long templateId, Long policyId, boolean replaceExisting) {
        log.info("Applying template {} to policy {} (replaceExisting: {})", templateId, policyId, replaceExisting);
        
        BenefitRuleTemplate template = templateRepository.findByIdWithItems(templateId);
        if (template == null) throw new BusinessRuleException("Template not found");

        if (replaceExisting) {
            ruleService.deleteAllForPolicy(policyId);
        }

        List<BenefitPolicyRuleCreateDto> ruleDtos = template.getItems().stream()
                .map(item -> {
                    Long categoryId = null;
                    if (item.getMedicalCategoryCode() != null) {
                        categoryId = categoryRepository.findByCode(item.getMedicalCategoryCode())
                                .map(MedicalCategory::getId)
                                .orElse(null);
                    }

                    return BenefitPolicyRuleCreateDto.builder()
                            .benefitPolicyId(policyId)
                            .encounterType(item.getEncounterType())
                            .medicalCategoryId(categoryId)
                            .medicalCategory(item.getMedicalCategoryCode())
                            .coveragePercent(item.getCoveragePercent())
                            .timesLimit(item.getTimesLimit())
                            .waitingPeriodDays(item.getWaitingPeriodDays())
                            .requiresPreApproval(item.isRequiresPreApproval())
                            .notes(item.getNotes() != null ? item.getNotes() : "من القالب: " + template.getName())
                            .build();
                })
                .collect(Collectors.toList());

        ruleService.createBulk(ruleDtos);
        log.info("✅ Applied template '{}' ({} rules) to policy {}", template.getName(), ruleDtos.size(), policyId);
    }

    private BenefitRuleTemplateResponseDto mapToDto(BenefitRuleTemplate entity) {
        return BenefitRuleTemplateResponseDto.builder()
                .id(entity.getId())
                .name(entity.getName())
                .description(entity.getDescription())
                .isSystem(entity.isSystem())
                .active(entity.isActive())
                .items(entity.getItems().stream().map(this::mapItemToDto).collect(Collectors.toList()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private BenefitRuleTemplateResponseDto.ItemDto mapItemToDto(BenefitRuleTemplateItem item) {
        return BenefitRuleTemplateResponseDto.ItemDto.builder()
                .id(item.getId())
                .encounterType(item.getEncounterType())
                .medicalCategoryCode(item.getMedicalCategoryCode())
                .coveragePercent(item.getCoveragePercent())
                .timesLimit(item.getTimesLimit())
                .waiting_period_days(item.getWaitingPeriodDays())
                .requiresPreApproval(item.isRequiresPreApproval())
                .notes(item.getNotes())
                .build();
    }
}
