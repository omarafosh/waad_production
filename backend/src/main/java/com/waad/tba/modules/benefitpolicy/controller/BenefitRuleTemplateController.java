package com.waad.tba.modules.benefitpolicy.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.benefitpolicy.dto.BenefitRuleTemplateResponseDto;
import com.waad.tba.modules.benefitpolicy.service.BenefitRuleTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/benefit-rule-templates")
@RequiredArgsConstructor
public class BenefitRuleTemplateController {

    private final BenefitRuleTemplateService templateService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BenefitRuleTemplateResponseDto>>> getAllTemplates() {
        log.info("[RULE-TEMPLATES] GET /api/benefit-rule-templates - Fetching all active templates");
        return ResponseEntity.ok(ApiResponse.success(templateService.getAllTemplates()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BenefitRuleTemplateResponseDto>> getTemplateById(@PathVariable Long id) {
        log.info("[RULE-TEMPLATES] GET /api/benefit-rule-templates/{} - Fetching template details", id);
        return ResponseEntity.ok(ApiResponse.success(templateService.getTemplateById(id)));
    }

    @PostMapping("/{templateId}/apply/{policyId}")
    public ResponseEntity<ApiResponse<Void>> applyTemplate(
            @PathVariable Long templateId,
            @PathVariable Long policyId,
            @RequestParam(defaultValue = "false") boolean replaceExisting) {
        
        log.info("[RULE-TEMPLATES] POST /api/benefit-rule-templates/{}/apply/{} - Applying template (replace: {})", 
                templateId, policyId, replaceExisting);
        
        templateService.applyTemplateToPolicy(templateId, policyId, replaceExisting);
        return ResponseEntity.ok(ApiResponse.<Void>success("تم تطبيق القالب بنجاح", null));
    }
}
