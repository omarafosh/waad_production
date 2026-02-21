package com.waad.tba.modules.company.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * UiVisibilityDto - Phase B4
 * 
 * Controls UI visibility settings for different modules in the frontend.
 * Stored as JSONB in company_settings.ui_visibility column.
 * 
 * Default: All features visible (true)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UiVisibilityDto {

    private MembersVisibility members;
    private ClaimsVisibility claims;
    private VisitsVisibility visits;
    private DashboardVisibility dashboard;

    /**
     * Members module UI visibility settings
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MembersVisibility {
        private boolean showFamilyTab;
        private boolean showDocumentsTab;
        private boolean showBenefitsTab;
    }

    /**
     * Claims module UI visibility settings
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClaimsVisibility {
        private boolean showFilesSection;
        private boolean showPaymentsSection;
        private boolean showDiagnosisSection;
    }

    /**
     * Visits module UI visibility settings
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VisitsVisibility {
        private boolean showAttachmentsSection;
        private boolean showServiceDetailsSection;
    }

    /**
     * Dashboard module UI visibility settings
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardVisibility {
        private boolean showMembersKpi;
        private boolean showClaimsKpi;
        private boolean showVisitsKpi;
    }

    /**
     * Factory method to create default settings with all features visible
     */
    public static UiVisibilityDto defaultAllEnabled() {
        return UiVisibilityDto.builder()
            .members(MembersVisibility.builder()
                .showFamilyTab(true)
                .showDocumentsTab(true)
                .showBenefitsTab(true)
                .build())
            .claims(ClaimsVisibility.builder()
                .showFilesSection(true)
                .showPaymentsSection(true)
                .showDiagnosisSection(true)
                .build())
            .visits(VisitsVisibility.builder()
                .showAttachmentsSection(true)
                .showServiceDetailsSection(true)
                .build())
            .dashboard(DashboardVisibility.builder()
                .showMembersKpi(true)
                .showClaimsKpi(true)
                .showVisitsKpi(true)
                .build())
            .build();
    }
}
