package com.waad.tba.modules.visit.mapper;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Component;

import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.preauthorization.entity.PreAuthorization;
import com.waad.tba.modules.preauthorization.repository.PreAuthorizationRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.visit.dto.VisitCreateDto;
import com.waad.tba.modules.visit.dto.VisitResponseDto;
import com.waad.tba.modules.visit.entity.Visit;
import com.waad.tba.modules.visit.entity.VisitType;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class VisitMapper {

    private final ClaimRepository claimRepository;
    private final PreAuthorizationRepository preAuthorizationRepository;
    private final ProviderRepository providerRepository;

    public VisitResponseDto toResponseDto(Visit entity) {
        if (entity == null) return null;
        
        String memberName = null;
        String memberNumber = null;
        Long employerId = null;
        String employerName = null;
        if (entity.getMember() != null) {
            memberName = entity.getMember().getFullName();
            memberNumber = entity.getMember().getCardNumber();
            // Get employer/organization info (use canonical employerOrganization field)
            if (entity.getMember().getEmployerOrganization() != null) {
                employerId = entity.getMember().getEmployerOrganization().getId();
                employerName = entity.getMember().getEmployerOrganization().getName();
            }
        }
        
        // Get provider name
        String providerName = null;
        if (entity.getProviderId() != null) {
            Provider provider = providerRepository.findById(entity.getProviderId()).orElse(null);
            if (provider != null) {
                providerName = provider.getName();
            }
        }
        
        VisitResponseDto dto = VisitResponseDto.builder()
                .id(entity.getId())
                .memberId(entity.getMember() != null ? entity.getMember().getId() : null)
                .memberName(memberName)
                .memberNumber(memberNumber)
                .employerId(employerId)
                .employerName(employerName)
                .providerId(entity.getProviderId())
                .providerName(providerName)
                .visitDate(entity.getVisitDate())
                .doctorName(entity.getDoctorName())
                .specialty(entity.getSpecialty())
                .diagnosis(entity.getDiagnosis())
                .treatment(entity.getTreatment())
                .totalAmount(entity.getTotalAmount())
                .notes(entity.getNotes())
                .active(entity.getActive())
                .visitType(entity.getVisitType())
                .visitTypeLabel(entity.getVisitType() != null ? entity.getVisitType().getArabicLabel() : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
        
        // Add claim info
        populateClaimInfo(dto, entity.getId());
        
        // Add pre-authorization info
        populatePreAuthInfo(dto, entity.getId());
        
        return dto;
    }
    
    /**
     * Populate claim information for the visit
     */
    private void populateClaimInfo(VisitResponseDto dto, Long visitId) {
        if (visitId == null) return;
        
        try {
            List<Claim> claims = claimRepository.findByVisitId(visitId);
            dto.setClaimCount(claims.size());
            
            if (!claims.isEmpty()) {
                // Get the latest claim (by createdAt or id)
                Claim latestClaim = claims.stream()
                        .max(Comparator.comparing(Claim::getCreatedAt, Comparator.nullsFirst(Comparator.naturalOrder())))
                        .orElse(claims.get(0));
                
                dto.setLatestClaimId(latestClaim.getId());
                if (latestClaim.getStatus() != null) {
                    dto.setLatestClaimStatus(latestClaim.getStatus().name());
                    dto.setLatestClaimStatusLabel(latestClaim.getStatus().getArabicLabel());
                }
            }
        } catch (Exception e) {
            // Log but don't fail - claims info is optional
            dto.setClaimCount(0);
        }
    }
    
    /**
     * Populate pre-authorization information for the visit
     */
    private void populatePreAuthInfo(VisitResponseDto dto, Long visitId) {
        if (visitId == null) return;
        
        try {
            List<PreAuthorization> preAuths = preAuthorizationRepository.findByVisitIdAndActiveTrue(visitId);
            dto.setPreAuthCount(preAuths.size());
            
            if (!preAuths.isEmpty()) {
                // Get the latest pre-authorization
                PreAuthorization latestPreAuth = preAuths.stream()
                        .max(Comparator.comparing(PreAuthorization::getCreatedAt, Comparator.nullsFirst(Comparator.naturalOrder())))
                        .orElse(preAuths.get(0));
                
                dto.setLatestPreAuthId(latestPreAuth.getId());
                if (latestPreAuth.getStatus() != null) {
                    dto.setLatestPreAuthStatus(latestPreAuth.getStatus().name());
                    // Get Arabic label from status enum
                    dto.setLatestPreAuthStatusLabel(getPreAuthStatusLabel(latestPreAuth.getStatus().name()));
                }
            }
        } catch (Exception e) {
            // Log but don't fail - preauth info is optional
            dto.setPreAuthCount(0);
        }
    }
    
    /**
     * Get Arabic label for PreAuth status
     */
    private String getPreAuthStatusLabel(String status) {
        if (status == null) return "غير محدد";
        return switch (status) {
            case "PENDING" -> "قيد الانتظار";
            case "UNDER_REVIEW" -> "قيد المراجعة";
            case "APPROVED" -> "موافق عليه";
            case "REJECTED" -> "مرفوض";
            case "EXPIRED" -> "منتهي الصلاحية";
            case "CANCELLED" -> "ملغي";
            case "USED" -> "مستخدم";
            default -> status;
        };
    }

    public Visit toEntity(VisitCreateDto dto, Member member) {
        if (dto == null) return null;
        
        return Visit.builder()
                .member(member)
                .providerId(dto.getProviderId())
                .visitDate(dto.getVisitDate())
                .doctorName(dto.getDoctorName())
                .specialty(dto.getSpecialty())
                .diagnosis(dto.getDiagnosis())
                .treatment(dto.getTreatment())
                .totalAmount(dto.getTotalAmount())
                .notes(dto.getNotes())
                .visitType(dto.getVisitType() != null ? dto.getVisitType() : VisitType.OUTPATIENT)
                .active(true)
                .build();
    }

    public void updateEntityFromDto(Visit entity, VisitCreateDto dto, Member member) {
        if (dto == null) return;
        
        entity.setMember(member);
        entity.setProviderId(dto.getProviderId());
        entity.setVisitDate(dto.getVisitDate());
        entity.setDoctorName(dto.getDoctorName());
        entity.setSpecialty(dto.getSpecialty());
        entity.setDiagnosis(dto.getDiagnosis());
        entity.setTreatment(dto.getTreatment());
        entity.setTotalAmount(dto.getTotalAmount());
        entity.setNotes(dto.getNotes());
        
        // Update visitType if provided, otherwise keep existing
        if (dto.getVisitType() != null) {
            entity.setVisitType(dto.getVisitType());
        }
    }
}
