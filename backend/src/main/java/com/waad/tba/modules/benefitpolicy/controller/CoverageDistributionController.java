package com.waad.tba.modules.benefitpolicy.controller;

import com.waad.tba.modules.benefitpolicy.dto.CoverageDistributionDto;
import com.waad.tba.modules.benefitpolicy.service.CoverageDistributionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/benefit-policies/{policyId}/distributions")
@RequiredArgsConstructor
public class CoverageDistributionController {

    private final CoverageDistributionService distributionService;

    @GetMapping
    public ResponseEntity<List<CoverageDistributionDto>> getDistributions(@PathVariable Long policyId) {
        return ResponseEntity.ok(distributionService.findByPolicyId(policyId));
    }

    @PostMapping
    public ResponseEntity<CoverageDistributionDto> addDistribution(
            @PathVariable Long policyId,
            @RequestBody CoverageDistributionDto dto) {
        return ResponseEntity.ok(distributionService.addDistribution(policyId, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeDistribution(@PathVariable Long id) {
        distributionService.removeDistribution(id);
        return ResponseEntity.noContent().build();
    }
}
