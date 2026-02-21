package com.waad.tba.services.pdf.templates;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.waad.tba.modules.benefitpolicy.dto.BenefitPolicyResponseDto;
import com.waad.tba.services.pdf.config.PdfFontConfig;
import com.waad.tba.services.pdf.PdfTableBuilder;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * PDF Template for Benefit Policy Reports
 * نموذج تقارير PDF لسياسات المزايا
 */
@Component
@RequiredArgsConstructor
public class BenefitPolicyReportTemplate {

    private final PdfFontConfig fontConfig;
    private final PdfTableBuilder tableBuilder;
    private final MessageSource messageSource;
    private final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Generate detailed report for single BenefitPolicy
     */
    public List<Element> generateBenefitPolicyDetailReport(BenefitPolicyResponseDto policy) {
        List<Element> elements = new ArrayList<>();

        try {
            // Policy Name
            Paragraph policyName = new Paragraph(policy.getName(),
                    fontConfig.getFont(policy.getName(), true));
            policyName.setAlignment(Element.ALIGN_CENTER);
            policyName.setSpacingAfter(15);
            elements.add(policyName);

            Locale locale = LocaleContextHolder.getLocale();

            elements.add(createSection(messageSource.getMessage("pdf.benefit.section.basic", null, locale)));
            elements.add(createBasicInfoTable(policy, locale));
            elements.add(new Paragraph("\n"));

            elements.add(createSection(messageSource.getMessage("pdf.benefit.section.organizations", null, locale)));
            elements.add(createOrganizationInfoTable(policy, locale));
            elements.add(new Paragraph("\n"));

            elements.add(createSection(messageSource.getMessage("pdf.benefit.section.dates", null, locale)));
            elements.add(createDatesTable(policy, locale));
            elements.add(new Paragraph("\n"));

            elements.add(createSection(messageSource.getMessage("pdf.benefit.section.limits", null, locale)));
            elements.add(createLimitsTable(policy, locale));
            elements.add(new Paragraph("\n"));

            elements.add(createSection(messageSource.getMessage("pdf.benefit.section.stats", null, locale)));
            elements.add(createStatsTable(policy, locale));
            elements.add(new Paragraph("\n"));

            if (policy.getNotes() != null && !policy.getNotes().isBlank()) {
                elements.add(createSection(messageSource.getMessage("pdf.benefit.section.notes", null, locale)));
                elements.add(createNotesTable(policy, locale));
                elements.add(new Paragraph("\n"));
            }

            elements.add(createSection(messageSource.getMessage("pdf.benefit.section.audit", null, locale)));
            elements.add(createAuditTable(policy, locale));

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate BenefitPolicy detail report", e);
        }

        return elements;
    }

    /**
     * Generate list report for multiple BenefitPolicies
     */
    public List<Element> generateBenefitPolicyListReport(List<BenefitPolicyResponseDto> policies) {
        List<Element> elements = new ArrayList<>();

        try {
            Locale locale = LocaleContextHolder.getLocale();
            // Summary
            String totalMsg = messageSource.getMessage("pdf.benefit.summary.total", new Object[] { policies.size() },
                    locale);
            Paragraph summary = new Paragraph(totalMsg, fontConfig.getFont(totalMsg, true));
            summary.setAlignment(Element.ALIGN_RIGHT);
            summary.setSpacingAfter(15);
            elements.add(summary);

            // Statistics
            long activePolicies = policies.stream().filter(BenefitPolicyResponseDto::isActive).count();
            long effectivePolicies = policies.stream().filter(BenefitPolicyResponseDto::isEffective).count();

            String statsMsg = messageSource.getMessage("pdf.benefit.stats.active",
                    new Object[] { activePolicies, effectivePolicies }, locale);
            Paragraph stats = new Paragraph(statsMsg, fontConfig.getFont(statsMsg, true));
            stats.setAlignment(Element.ALIGN_RIGHT);
            stats.setSpacingAfter(15);
            elements.add(stats);

            // Table
            elements.add(createListTable(policies, locale));

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate BenefitPolicy list report", e);
        }

        return elements;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    private Paragraph createSection(String title) {
        Paragraph section = new Paragraph(title, fontConfig.getFont(title, true));
        section.setAlignment(Element.ALIGN_RIGHT);
        section.setSpacingBefore(10);
        section.setSpacingAfter(5);
        return section;
    }

    private PdfPTable createBasicInfoTable(BenefitPolicyResponseDto policy, Locale locale) {
        List<PdfTableBuilder.KeyValue> data = new ArrayList<>();
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.code", null, locale),
                policy.getPolicyCode()));
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.description", null, locale),
                policy.getDescription()));
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.status", null, locale),
                policy.getStatusDisplay()));
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.active", null, locale),
                formatBoolean(policy.isActive(), locale)));
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.effective", null, locale),
                formatBoolean(policy.isEffective(), locale)));
        return tableBuilder.buildKeyValueTable(data);
    }

    private PdfPTable createOrganizationInfoTable(BenefitPolicyResponseDto policy, Locale locale) {
        List<PdfTableBuilder.KeyValue> data = new ArrayList<>();
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.employer", null, locale),
                policy.getEmployerName()));
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.employer_id", null, locale),
                policy.getEmployerOrgId() != null ? policy.getEmployerOrgId().toString() : "-"));
        if (policy.getInsuranceName() != null) {
            data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.insurance", null, locale),
                    policy.getInsuranceName()));
            data.add(new PdfTableBuilder.KeyValue(
                    messageSource.getMessage("pdf.benefit.label.insurance_id", null, locale),
                    policy.getInsuranceOrgId() != null ? policy.getInsuranceOrgId().toString() : "-"));
        }
        return tableBuilder.buildKeyValueTable(data);
    }

    private PdfPTable createDatesTable(BenefitPolicyResponseDto policy, Locale locale) {
        List<PdfTableBuilder.KeyValue> data = new ArrayList<>();
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.start_date", null, locale),
                formatDate(policy.getStartDate())));
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.end_date", null, locale),
                formatDate(policy.getEndDate())));
        return tableBuilder.buildKeyValueTable(data);
    }

    private PdfPTable createLimitsTable(BenefitPolicyResponseDto policy, Locale locale) {
        List<PdfTableBuilder.KeyValue> data = new ArrayList<>();
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.annual_limit", null, locale),
                formatAmount(policy.getAnnualLimit())));
        data.add(new PdfTableBuilder.KeyValue(
                messageSource.getMessage("pdf.benefit.label.per_member_limit", null, locale),
                formatAmount(policy.getPerMemberLimit())));
        data.add(new PdfTableBuilder.KeyValue(
                messageSource.getMessage("pdf.benefit.label.per_family_limit", null, locale),
                formatAmount(policy.getPerFamilyLimit())));
        data.add(new PdfTableBuilder.KeyValue(
                messageSource.getMessage("pdf.benefit.label.coverage_percent", null, locale),
                formatPercentage(policy.getDefaultCoveragePercent())));
        return tableBuilder.buildKeyValueTable(data);
    }

    private PdfPTable createStatsTable(BenefitPolicyResponseDto policy, Locale locale) {
        List<PdfTableBuilder.KeyValue> data = new ArrayList<>();
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.members_count", null, locale),
                policy.getCoveredMembersCount() != null ? policy.getCoveredMembersCount().toString() : "0"));
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.rules_count", null, locale),
                policy.getRulesCount() != null ? policy.getRulesCount().toString() : "0"));
        data.add(new PdfTableBuilder.KeyValue(
                messageSource.getMessage("pdf.benefit.label.active_rules_count", null, locale),
                policy.getActiveRulesCount() != null ? policy.getActiveRulesCount().toString() : "0"));
        return tableBuilder.buildKeyValueTable(data);
    }

    private PdfPTable createNotesTable(BenefitPolicyResponseDto policy, Locale locale) {
        List<PdfTableBuilder.KeyValue> data = new ArrayList<>();
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.notes", null, locale),
                policy.getNotes()));
        return tableBuilder.buildKeyValueTable(data);
    }

    private PdfPTable createAuditTable(BenefitPolicyResponseDto policy, Locale locale) {
        List<PdfTableBuilder.KeyValue> data = new ArrayList<>();
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.created_at", null, locale),
                formatDateTime(policy.getCreatedAt())));
        data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.updated_at", null, locale),
                formatDateTime(policy.getUpdatedAt())));
        return tableBuilder.buildKeyValueTable(data);
    }

    private PdfPTable createListTable(List<BenefitPolicyResponseDto> policies, Locale locale) {
        // Create simple card-style table for each policy
        PdfPTable mainTable = new PdfPTable(1);
        mainTable.setWidthPercentage(100);
        mainTable.setSpacingBefore(10);

        for (int i = 0; i < policies.size(); i++) {
            BenefitPolicyResponseDto policy = policies.get(i);
            List<PdfTableBuilder.KeyValue> data = new ArrayList<>();
            data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.index", null, locale),
                    String.valueOf(i + 1)));
            data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.code", null, locale),
                    policy.getPolicyCode()));
            data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.name", null, locale),
                    policy.getName()));
            data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.employer", null, locale),
                    policy.getEmployerName()));
            data.add(new PdfTableBuilder.KeyValue(messageSource.getMessage("pdf.benefit.label.status", null, locale),
                    policy.getStatusDisplay()));
            data.add(new PdfTableBuilder.KeyValue(
                    messageSource.getMessage("pdf.benefit.label.annual_limit", null, locale),
                    formatAmount(policy.getAnnualLimit())));
            data.add(new PdfTableBuilder.KeyValue(
                    messageSource.getMessage("pdf.benefit.label.members_count", null, locale),
                    policy.getCoveredMembersCount() != null ? policy.getCoveredMembersCount().toString() : "0"));

            PdfPTable itemTable = tableBuilder.buildKeyValueTable(data);
            PdfPCell cell = new PdfPCell();
            cell.addElement(itemTable);
            cell.setPadding(5);
            cell.setBorder(Rectangle.NO_BORDER);
            mainTable.addCell(cell);
        }

        return mainTable;
    }

    private String formatDate(LocalDate date) {
        return date != null ? date.format(dateFormatter) : "-";
    }

    private String formatDateTime(Object dateTime) {
        return dateTime != null ? dateTime.toString() : "-";
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null)
            return "-";
        return String.format("%,.2f SAR", amount);
    }

    private String formatPercentage(Integer percentage) {
        return percentage != null ? percentage + "%" : "-";
    }

    private String formatBoolean(boolean value, Locale locale) {
        String key = value ? "common.yes" : "common.no";
        return messageSource.getMessage(key, null, locale);
    }
}
