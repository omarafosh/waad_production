package com.waad.tba.modules.claim.mapper;

import com.waad.tba.modules.benefitpolicy.service.BenefitPolicyCoverageService;
import com.waad.tba.modules.claim.dto.*;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimAttachment;
import com.waad.tba.modules.claim.entity.ClaimLine;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.service.MedicalCatalogService;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.preauthorization.repository.PreAuthorizationRepository;
import com.waad.tba.modules.provider.dto.EffectivePriceResponseDto;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.providercontract.service.ProviderContractService;
import com.waad.tba.modules.visit.entity.Visit;
import com.waad.tba.modules.visit.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class ClaimMapper {

    private final OrganizationRepository organizationRepository;
    private final PreAuthorizationRepository preAuthorizationRepository;
    private final VisitRepository visitRepository;
    private final MedicalServiceRepository medicalServiceRepository;
    private final MedicalCatalogService medicalCatalogService;
    private final ProviderContractService providerContractService;
    private final ProviderRepository providerRepository;
    private final BenefitPolicyCoverageService benefitPolicyCoverageService;

    /**
     * ═══════════════════════════════════════════════════════════════════════════
     * ARCHITECTURAL REBUILD (2026-01-15): Visit-Centric, Contract-Driven
     * ═══════════════════════════════════════════════════════════════════════════
     * 
     * This method now enforces:
     * 1. Visit is MANDATORY - derived from visitId
     * 2. Provider comes from Visit (not user input)
     * 3. Member comes from Visit (not user input)
     * 4. Each ClaimLine references MedicalService (no free-text)
     * 5. Prices are resolved from ProviderContract (not user input)
     * 
     * @param dto ClaimCreateDto with visitId and lines
     * @return Claim entity ready for persistence
     */
    public Claim toEntity(ClaimCreateDto dto) {
        log.info("📝 [CLAIM-MAPPER] Creating Claim entity with Contract-Driven Architecture");

        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 1: Visit is MANDATORY - All data derives from Visit
        // ═══════════════════════════════════════════════════════════════════════════
        if (dto.getVisitId() == null) {
            throw new IllegalArgumentException(
                    "ARCHITECTURAL VIOLATION: visitId is REQUIRED - Claims must be linked to a Visit");
        }

        Visit visit = visitRepository.findById(dto.getVisitId())
                .orElseThrow(() -> new IllegalArgumentException("Visit not found with id: " + dto.getVisitId()));

        log.info("✅ Visit {} found - Member: {}, ProviderId: {}", visit.getId(),
                visit.getMember() != null ? visit.getMember().getId() : "NULL",
                visit.getProviderId());

        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 2: Derive Member and Provider from Visit (not from DTO)
        // ═══════════════════════════════════════════════════════════════════════════
        if (visit.getMember() == null) {
            throw new IllegalArgumentException("ARCHITECTURAL VIOLATION: Visit has no Member");
        }
        if (visit.getProviderId() == null) {
            throw new IllegalArgumentException("ARCHITECTURAL VIOLATION: Visit has no ProviderId");
        }

        // Fetch Provider entity for name
        Provider provider = providerRepository.findById(visit.getProviderId())
                .orElseThrow(
                        () -> new IllegalArgumentException("Provider not found with id: " + visit.getProviderId()));

        // Get insurance organization - auto-resolve (Primary TPA entity)
        var insuranceOrg = organizationRepository.findByCode("WAAD_TPA").orElse(null);

        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 3: Build Claim from Visit (not from free-text fields)
        // ═══════════════════════════════════════════════════════════════════════════
        // Priority: Visit.visitDate > DTO.serviceDate > today
        LocalDate serviceDate = visit.getVisitDate();
        if (serviceDate == null && dto.getServiceDate() != null) {
            serviceDate = dto.getServiceDate();
        }
        if (serviceDate == null) {
            serviceDate = LocalDate.now();
        }
        Long providerId = visit.getProviderId();

        Claim claim = Claim.builder()
                .member(visit.getMember())
                .visit(visit)
                .insuranceOrganization(insuranceOrg)
                .providerId(providerId)
                .providerName(provider.getName())
                .doctorName(dto.getDoctorName())
                .diagnosisCode(dto.getDiagnosisCode())
                .diagnosisDescription(dto.getDiagnosisDescription())
                .serviceDate(serviceDate)
                .build();

        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 4: Link PreAuthorization if provided
        // ═══════════════════════════════════════════════════════════════════════════
        if (dto.getPreAuthorizationId() != null) {
            claim.setPreAuthorization(preAuthorizationRepository.findById(dto.getPreAuthorizationId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "PreAuthorization not found with id: " + dto.getPreAuthorizationId())));
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 5: Build ClaimLines with Contract-Driven Pricing
        // ═══════════════════════════════════════════════════════════════════════════
        if (dto.getLines() == null || dto.getLines().isEmpty()) {
            throw new IllegalArgumentException("ARCHITECTURAL VIOLATION: Claims MUST have at least one line");
        }

        BigDecimal totalRequestedAmount = BigDecimal.ZERO;
        List<ClaimLine> lines = new ArrayList<>();
        List<String> servicesRequiringPA = new ArrayList<>(); // Track services that need PA
        Member member = visit.getMember();

        for (ClaimLineDto lineDto : dto.getLines()) {
            // Resolve MedicalService using Catalog Service
            MedicalService medicalService;
            if (lineDto.getMedicalServiceId() != null) {
                // Direct ID provided (now UUID)
                medicalService = medicalServiceRepository.findById(lineDto.getMedicalServiceId())
                        .orElseThrow(() -> new IllegalArgumentException(
                                "MedicalService not found with id: " + lineDto.getMedicalServiceId()));
            } else if (lineDto.getProviderServiceCode() != null) {
                // Provider code provided - resolve to Master Service
                medicalService = medicalCatalogService.resolveService(providerId, lineDto.getProviderServiceCode());
            } else {
                throw new IllegalArgumentException(
                        "ARCHITECTURAL VIOLATION: Each line MUST have either medicalServiceId or providerServiceCode");
            }

            // Get contract price from ProviderContractService
            // NOTE: resolution always uses the resolved Master Service code
            EffectivePriceResponseDto priceResponse = providerContractService.getEffectivePrice(
                    providerId, medicalService.getCode(), serviceDate);

            if (!priceResponse.isHasContract() || priceResponse.getContractPrice() == null) {
                throw new IllegalArgumentException(
                        "ARCHITECTURAL VIOLATION: No contract price found for service " +
                                medicalService.getCode() + " with provider " + providerId +
                                " on date " + serviceDate);
            }

            // ═══════════════════════════════════════════════════════════════════════════
            // NEW: Get coverage info from BenefitPolicyRule (includes requiresPA + coverage
            // %)
            // ═══════════════════════════════════════════════════════════════════════════
            var coverageInfoOpt = benefitPolicyCoverageService.getCoverageForService(member, medicalService.getId(),
                    visit.getVisitType());
            boolean requiresPA = coverageInfoOpt.map(c -> c.isRequiresPreApproval()).orElse(false);
            Integer coveragePercentSnapshot = coverageInfoOpt.map(c -> c.getCoveragePercent()).orElse(null);
            Integer patientCopayPercentSnapshot = coveragePercentSnapshot != null ? (100 - coveragePercentSnapshot)
                    : null;

            if (requiresPA) {
                servicesRequiringPA.add(medicalService.getName() + " (" + medicalService.getCode() + ")");
            }

            BigDecimal unitPrice = priceResponse.getContractPrice();
            Integer quantity = lineDto.getQuantity() != null ? lineDto.getQuantity() : 1;
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));

            // ═══════════════════════════════════════════════════════════════════════════
            // CANONICAL: Category ID resolution - prefer DTO, validate against service
            // ═══════════════════════════════════════════════════════════════════════════
            // ARCHITECTURAL GUARD: Validate that service belongs to selected category
            if (lineDto.getServiceCategory() != null && medicalService.getCategoryName() != null) {
                if (!lineDto.getServiceCategory().equals(medicalService.getCategoryName())) {
                    log.error(
                            "🚫 ARCHITECTURAL VIOLATION: Service {} does not belong to category {}. Service's actual category: {}",
                            medicalService.getCode(), lineDto.getServiceCategory(), medicalService.getCategoryName());
                    throw new IllegalArgumentException(
                            "الخدمة الطبية '" + medicalService.getName() + "' (" + medicalService.getCode() +
                                    ") لا تنتمي للتصنيف الطبي المختار. يرجى التأكد من اختيار التصنيف الصحيح.");
                }
            }

            ClaimLine line = ClaimLine.builder()
                    .claim(claim)
                    .medicalService(medicalService)
                    .serviceCode(medicalService.getCode())
                    .serviceName(medicalService.getName())
                    .providerServiceCode(lineDto.getProviderServiceCode())
                    .serviceCategory(lineDto.getServiceCategory() != null ? lineDto.getServiceCategory()
                            : medicalService.getCategoryName())
                    .requiresPA(requiresPA)
                    .coveragePercentSnapshot(coveragePercentSnapshot)
                    .patientCopayPercentSnapshot(patientCopayPercentSnapshot)
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .totalPrice(lineTotal)
                    .build();

            // If mapping was resolved from provider code, and it's different from master
            // code, it's a reclassification
            if (lineDto.getProviderServiceCode() != null
                    && !lineDto.getProviderServiceCode().equals(medicalService.getCode())) {
                log.info("ℹ️ Reclassification detected: {} -> {}", lineDto.getProviderServiceCode(),
                        medicalService.getCode());
                // In automated integration, we might not have a reason code yet,
                // but we flag it by storing the original code.
            }

            lines.add(line);
            totalRequestedAmount = totalRequestedAmount.add(lineTotal);

            String serviceCategory = medicalService.getCategoryName();
            log.info("  ✅ Line: {} x {} @ {} = {} (category={}, requiresPA={}, coverage={}%, copay={}%)",
                    medicalService.getCode(), quantity, unitPrice, lineTotal, serviceCategory, requiresPA,
                    coveragePercentSnapshot, patientCopayPercentSnapshot);
        }

        claim.setLines(lines);
        claim.setRequestedAmount(totalRequestedAmount);

        // ═══════════════════════════════════════════════════════════════════════════
        // STEP 6: Validate PreAuthorization for services that require it
        // ═══════════════════════════════════════════════════════════════════════════
        if (!servicesRequiringPA.isEmpty() && dto.getPreAuthorizationId() == null) {
            // Services require PA but no PreAuthorization provided
            String servicesList = String.join(", ", servicesRequiringPA);
            throw new IllegalArgumentException(
                    "الخدمات التالية تتطلب موافقة مسبقة: " + servicesList +
                            ". يرجى إنشاء موافقة مسبقة أولاً أو إزالة هذه الخدمات من المطالبة.");
        }

        log.info("✅ Claim built: {} lines, total amount: {}, preAuthId: {}, servicesRequiringPA: {}",
                lines.size(), totalRequestedAmount, dto.getPreAuthorizationId(), servicesRequiringPA.size());

        // CANONICAL: Attachments are handled via separate attachment upload API after
        // claim creation
        // No dto.getAttachments() - attachments uploaded separately

        return claim;
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════════
     * ARCHITECTURAL NOTE: Updates are LIMITED
     * ═══════════════════════════════════════════════════════════════════════════
     * 
     * After claim creation, the following CANNOT be changed:
     * - Visit (determines Member and Provider)
     * - Lines (services and prices from contract)
     * - RequestedAmount (calculated from lines)
     * 
     * What CAN be updated:
     * - Status (via state machine)
     * - ApprovedAmount (by reviewer)
     * - ReviewerComment
     * - DoctorName
     * - Diagnosis fields (correction only)
     * - Attachments
     */
    @SuppressWarnings("deprecation")
    public void updateEntityFromDto(Claim claim, ClaimUpdateDto dto) {
        // Allowed updates (non-architectural fields)
        if (dto.getDoctorName() != null)
            claim.setDoctorName(dto.getDoctorName());
        if (dto.getStatus() != null)
            claim.setStatus(dto.getStatus());
        if (dto.getApprovedAmount() != null)
            claim.setApprovedAmount(dto.getApprovedAmount());
        if (dto.getReviewerComment() != null)
            claim.setReviewerComment(dto.getReviewerComment());
        if (dto.getActive() != null)
            claim.setActive(dto.getActive());

        // Diagnosis fields (correction, not free-text override)
        if (dto.getDiagnosisCode() != null)
            claim.setDiagnosisCode(dto.getDiagnosisCode());
        if (dto.getDiagnosisDescription() != null)
            claim.setDiagnosisDescription(dto.getDiagnosisDescription());

        // ARCHITECTURAL VIOLATION PREVENTION:
        // - providerName, visitDate, requestedAmount are NOT updateable (derived from
        // Visit)
        // - lines are NOT updateable after creation (prices from contract)

        // PreAuthorization can be linked (if not already set)
        if (dto.getPreAuthorizationId() != null && claim.getPreAuthorization() == null) {
            claim.setPreAuthorization(preAuthorizationRepository.findById(dto.getPreAuthorizationId()).orElse(null));
        }

        // Lines are NOT updateable after creation - they contain contract prices
        // If lines update is attempted, log warning but ignore
        if (dto.getLines() != null && !dto.getLines().isEmpty()) {
            log.warn("⚠️ ARCHITECTURAL WARNING: Attempt to update ClaimLines ignored - prices are contract-driven");
        }

        if (dto.getAttachments() != null) {
            claim.getAttachments().clear();
            dto.getAttachments().forEach(attDto -> {
                ClaimAttachment attachment = ClaimAttachment.builder()
                        .claim(claim)
                        .fileName(attDto.getFileName())
                        .fileUrl(attDto.getFileUrl())
                        .fileType(attDto.getFileType())
                        .build();
                claim.addAttachment(attachment);
            });
        }
    }

    public ClaimViewDto toViewDto(Claim claim) {
        @SuppressWarnings("deprecation")
        ClaimViewDto dto = ClaimViewDto.builder()
                .id(claim.getId())
                // Generate claimNumber (format: CLM-{id} for simplicity)
                .claimNumber("CLM-" + claim.getId())
                .providerName(claim.getProviderName())
                .providerId(claim.getProviderId())
                .doctorName(claim.getDoctorName())
                // ARCHITECTURAL UPDATE: Use diagnosisCode/Description instead of diagnosis
                .diagnosisCode(claim.getDiagnosisCode())
                .diagnosisDescription(claim.getDiagnosisDescription())
                // Backward compatibility: provide combined diagnosis field
                .diagnosis(
                        claim.getDiagnosisCode() != null
                                ? claim.getDiagnosisCode() + " - "
                                        + (claim.getDiagnosisDescription() != null ? claim.getDiagnosisDescription()
                                                : "")
                                : null)
                .visitDate(claim.getServiceDate()) // Use serviceDate instead of visitDate
                .serviceDate(claim.getServiceDate())
                .requestedAmount(claim.getRequestedAmount())
                .totalAmount(claim.getRequestedAmount()) // Alias for Frontend compatibility
                .approvedAmount(claim.getApprovedAmount())
                .differenceAmount(claim.getDifferenceAmount())
                .status(claim.getStatus())
                .statusLabel(claim.getStatus() != null ? claim.getStatus().getArabicLabel() : null)
                .reviewerComment(claim.getReviewerComment())
                .reviewedAt(claim.getReviewedAt())
                .serviceCount(claim.getServiceCount())
                .attachmentsCount(claim.getAttachmentsCount())
                .active(claim.getActive())
                .createdAt(claim.getCreatedAt())
                .updatedAt(claim.getUpdatedAt())
                .createdBy(claim.getCreatedBy())
                .updatedBy(claim.getUpdatedBy())
                // Financial Snapshot (MVP Phase)
                .patientCoPay(claim.getPatientCoPay())
                .netProviderAmount(claim.getNetProviderAmount())
                .coPayPercent(claim.getCoPayPercent())
                .deductibleApplied(claim.getDeductibleApplied())
                // Settlement Fields (MVP Phase)
                .paymentReference(claim.getPaymentReference())
                .settledAt(claim.getSettledAt())
                .settlementNotes(claim.getSettlementNotes())
                // SLA Fields
                .expectedCompletionDate(claim.getExpectedCompletionDate())
                .actualCompletionDate(claim.getActualCompletionDate())
                .withinSla(claim.getWithinSla())
                .businessDaysTaken(claim.getBusinessDaysTaken())
                .slaDaysConfigured(claim.getSlaDaysConfigured())
                .slaStatus(calculateSlaStatus(claim))
                .build();

        // ═══════════════════════════════════════════════════════════════════════════
        // VISIT-CENTRIC: Add Visit information
        // ═══════════════════════════════════════════════════════════════════════════
        if (claim.getVisit() != null) {
            dto.setVisitId(claim.getVisit().getId());
            dto.setVisitDate(claim.getVisit().getVisitDate());
            dto.setVisitType(claim.getVisit().getVisitType() != null ? claim.getVisit().getVisitType().name() : null);
        }

        if (claim.getMember() != null) {
            dto.setMemberId(claim.getMember().getId());
            dto.setMemberFullName(claim.getMember().getFullName());
            dto.setMemberName(claim.getMember().getFullName()); // Alias for Frontend compatibility
            dto.setMemberNationalNumber(claim.getMember().getCivilId());

            // Get employer info from member (جهة العمل)
            if (claim.getMember().getEmployerOrganization() != null) {
                dto.setEmployerId(claim.getMember().getEmployerOrganization().getId());
                dto.setEmployerName(claim.getMember().getEmployerOrganization().getName());
                dto.setEmployerCode(claim.getMember().getEmployerOrganization().getCode());
            }

            // Get benefit policy info from member instead of claim
            if (claim.getMember().getBenefitPolicy() != null) {
                dto.setBenefitPackageId(claim.getMember().getBenefitPolicy().getId());
                dto.setBenefitPackageName(claim.getMember().getBenefitPolicy().getName());
                dto.setBenefitPackageCode(claim.getMember().getBenefitPolicy().getPolicyCode());
            }
        }

        if (claim.getInsuranceOrganization() != null) {
            dto.setInsuranceCompanyName(claim.getInsuranceOrganization().getName());
            dto.setInsuranceCompanyCode(claim.getInsuranceOrganization().getCode());
        }

        // REMOVED: InsurancePolicy mapping - coverage via Member.benefitPolicy

        // ARCHITECTURAL UPDATE (2026-01-15): Use PreAuthorization instead of
        // PreApproval
        if (claim.getPreAuthorization() != null) {
            dto.setPreApprovalId(claim.getPreAuthorization().getId());
            dto.setPreApprovalStatus(
                    claim.getPreAuthorization().getStatus() != null ? claim.getPreAuthorization().getStatus().name()
                            : null);
        }

        dto.setLines(claim.getLines() != null && !claim.getLines().isEmpty()
                ? claim.getLines().stream().map(this::toLineDto).collect(Collectors.toList())
                : new ArrayList<>());

        dto.setAttachments(claim.getAttachments() != null && !claim.getAttachments().isEmpty()
                ? claim.getAttachments().stream().map(this::toAttachmentDto).collect(Collectors.toList())
                : new ArrayList<>());

        return dto;
    }

    /**
     * Convert ClaimLine entity to DTO with MedicalService details
     */
    private ClaimLineDto toLineDto(ClaimLine line) {
        return ClaimLineDto.builder()
                .id(line.getId())
                .medicalServiceId(line.getMedicalService() != null ? line.getMedicalService().getId() : null)
                .serviceCode(line.getServiceCode())
                .serviceName(line.getServiceName())
                .serviceCategory(line.getServiceCategory())
                .requiresPA(line.getRequiresPA())
                .quantity(line.getQuantity())
                .unitPrice(line.getUnitPrice())
                .totalPrice(line.getTotalPrice())
                .build();
    }

    private ClaimAttachmentDto toAttachmentDto(ClaimAttachment attachment) {
        return ClaimAttachmentDto.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .fileUrl(attachment.getFileUrl())
                .fileType(attachment.getFileType())
                .createdAt(attachment.getCreatedAt())
                .build();
    }

    /**
     * Calculate SLA status for display in UI
     * 
     * @param claim The claim entity
     * @return SLA status: ON_TRACK, AT_RISK, BREACHED, MET, or null
     */
    private String calculateSlaStatus(Claim claim) {
        if (claim.getExpectedCompletionDate() == null) {
            return null;
        }

        // If claim is already completed
        if (claim.getActualCompletionDate() != null) {
            return Boolean.TRUE.equals(claim.getWithinSla()) ? "MET" : "BREACHED";
        }

        // Claim is still in progress
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDate expectedDate = claim.getExpectedCompletionDate();

        if (today.isAfter(expectedDate)) {
            return "BREACHED";
        }

        // Check if within 1 day of deadline (AT_RISK)
        if (today.plusDays(1).isAfter(expectedDate) || today.isEqual(expectedDate)) {
            return "AT_RISK";
        }

        return "ON_TRACK";
    }
}
