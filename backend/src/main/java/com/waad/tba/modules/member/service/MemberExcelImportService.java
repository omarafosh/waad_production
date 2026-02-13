package com.waad.tba.modules.member.service;

import java.io.InputStream;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto.ImportValidationErrorDto;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto.MemberImportRowDto;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
import com.waad.tba.modules.member.dto.MemberImportResultDto;
import com.waad.tba.modules.member.dto.MemberImportResultDto.ImportErrorDetailDto;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.entity.Member.Gender;
import com.waad.tba.modules.member.entity.Member.MemberStatus;
import com.waad.tba.modules.member.entity.MemberAttribute;
import com.waad.tba.modules.member.entity.MemberAttribute.AttributeSource;
import com.waad.tba.modules.member.entity.MemberImportError;
import com.waad.tba.modules.member.entity.MemberImportLog;
import com.waad.tba.modules.member.entity.MemberImportLog.ImportStatus;
import com.waad.tba.modules.member.repository.MemberAttributeRepository;
import com.waad.tba.modules.member.repository.MemberImportErrorRepository;
import com.waad.tba.modules.member.repository.MemberImportLogRepository;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.common.enums.OrganizationType;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.common.entity.Organization;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.security.AuthorizationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import com.waad.tba.modules.member.service.BarcodeGeneratorService;
import com.waad.tba.modules.member.service.UnifiedMemberService;

/**
 * Service for importing members from Excel files.
 * 
 * Compatible with Odoo hr.employee.public exports.
 * 
 * UNIQUE IDENTIFIER: AUTO-GENERATED BARCODE (WAAD|MEMBER|...)
 * - Members are ALWAYS CREATED NEW
 * - card_number from Excel is IGNORED (Security/Identity Safety)
 * - Matching by name/civil_id is DISABLED for Phase 1
 * - BenefitPolicy assignment is done separately (not via Excel import)
 * 
 * Column Mappings (Odoo → TBA):
 * - name / full_name → fullName (MANDATORY)
 * - company / employer → employerOrganization (MANDATORY LOOKUP)
 * - national_id / civil_id → civilId (optional, no uniqueness constraint)
 * - barcode / badge_id → derived from card_number
 * - card_number → MANUAL (If in Excel) or AUTO-GENERATED
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberExcelImportService {

    private final MemberRepository memberRepository;
    private final MemberAttributeRepository attributeRepository;
    private final MemberImportLogRepository importLogRepository;
    private final MemberImportErrorRepository importErrorRepository;
    private final BenefitPolicyRepository benefitPolicyRepository;
    private final OrganizationRepository organizationRepository;
    private final AuthorizationService authorizationService;
    private final ObjectMapper objectMapper;
    private final BarcodeGeneratorService barcodeGeneratorService;
    private final com.waad.tba.common.excel.service.ExcelParserService parserService;
    private final UnifiedMemberService unifiedMemberService;
    private final ExcelColumnMappingService columnMappingService;

    // Self-injection for Propagation.REQUIRES_NEW visibility
    private MemberExcelImportService self;

    @org.springframework.beans.factory.annotation.Autowired
    public void setSelf(@org.springframework.context.annotation.Lazy MemberExcelImportService self) {
        this.self = self;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COLUMN MAPPINGS (Odoo Compatible + Enhanced Arabic Support)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Mandatory columns (at least one variant required)
     */
    private static final List<String[]> MANDATORY_COLUMNS = List.of(
            // Full Name - الاسم الكامل (MANDATORY)
            new String[] {
                    "full_name", "name", "fullname", "member_name",
                    "الاسم الكامل", "الاسم", "اسم الموظف", "اسم العضو",
                    "الاسم الثلاثي", "الاسم الرباعي", "اسم المؤمن عليه"
            },
            // Employer - جهة العمل (MANDATORY)
            new String[] {
                    "جهة العمل", "employer", // Template & System values FIRST
                    "company", "company_id", "company_name", "employer_name",
                    "work_company", "organization", "employer_code",
                    "الشركة", "اسم الشركة", "المؤسسة", "جهة الانتساب",
                    "صاحب العمل", "الجهة", "مكان العمل", "كود الجهة"
            });

    /**
     * Optional core field mappings with enhanced Arabic support
     * NOTE: national_id/civil_id is OPTIONAL
     * NOTE: card_number is IGNORED
     */
    private static final Map<String, String[]> OPTIONAL_FIELD_MAPPINGS = Map.ofEntries(
            // Civil ID - الرقم المدني
            Map.entry("civilId", new String[] {
                    "national_id", "identification_id", "civil_id", "civilid", "national_number",
                    "id_number", "identity_number",
                    "الرقم الوطني", "رقم الهوية", "الرقم المدني", "رقم البطاقة الشخصية",
                    "رقم الهوية الوطنية"
            }),
            // Card Number / Barcode - IGNORED
            Map.entry("cardNumber", new String[] {
                    "card_number", "cardnumber", "card number", "member_no", "member_number",
                    "insurance_no", "insurance_number", "membership_no", "membership_number",
                    "barcode", "badge_id", "employee_id",
                    "رقم البطاقة", "رقم العضوية", "رقم التأمين", "رقم العضو", "رقم بطاقة التأمين",
                    "الباركود", "رقم الشارة"
            }),
            // Birth Date - تاريخ الميلاد
            Map.entry("birthDate", new String[] {
                    "birth_date", "birthday", "dob", "date_of_birth", "birthdate",
                    "تاريخ الميلاد", "تاريخ الولادة", "الميلاد"
            }),
            // Gender - الجنس
            Map.entry("gender", new String[] {
                    "gender", "sex",
                    "الجنس", "النوع"
            }),
            // Phone - الهاتف
            Map.entry("phone", new String[] {
                    "phone", "mobile", "mobile_phone", "work_phone", "phone_number",
                    "telephone", "tel", "cell", "cellphone",
                    "الهاتف", "الجوال", "رقم الهاتف", "رقم الجوال", "هاتف العمل",
                    "الموبايل", "رقم التواصل"
            }),
            // Email - البريد الإلكتروني
            Map.entry("email", new String[] {
                    "email", "work_email", "email_address", "e_mail",
                    "البريد الإلكتروني", "الإيميل", "البريد"
            }),
            // Nationality - الجنسية
            Map.entry("nationality", new String[] {
                    "nationality", "country", "country_id",
                    "الجنسية", "البلد"
            }),
            // Employee Number - رقم الموظف
            Map.entry("employeeNumber", new String[] {
                    "employee_number", "employee_id", "badge_id", "barcode", "emp_no",
                    "employee_code", "staff_id",
                    "رقم الموظف", "الرقم الوظيفي", "رقم العمل", "كود الموظف"
            }),
            // Address - العنوان
            Map.entry("address", new String[] {
                    "address", "home_address", "street", "location",
                    "العنوان", "عنوان السكن", "الموقع"
            }),
            // Marital Status - الحالة الاجتماعية
            Map.entry("maritalStatus", new String[] {
                    "marital_status", "marital", "status_marital",
                    "الحالة الاجتماعية", "الحالة الزوجية"
            }));

    /**
     * Columns that go to attributes (Odoo fields) with enhanced Arabic support
     */
    private static final Map<String, String[]> ATTRIBUTE_MAPPINGS = Map.ofEntries(
            // Job Title - المسمى الوظيفي
            Map.entry("job_title", new String[] {
                    "job_title", "job_id", "job", "position", "title", "job_position",
                    "الوظيفة", "المسمى الوظيفي", "المنصب", "الدرجة الوظيفية"
            }),
            // Department - القسم
            Map.entry("department", new String[] {
                    "department", "department_id", "dept", "division", "section",
                    "القسم", "الإدارة", "الوحدة", "الفرع"
            }),
            // Work Location - موقع العمل
            Map.entry("work_location", new String[] {
                    "work_location", "work_location_id", "location", "office", "branch",
                    "موقع العمل", "مكان العمل", "الفرع", "المكتب"
            }),
            // Grade - الدرجة
            Map.entry("grade", new String[] {
                    "grade", "x_grade", "level", "rank", "class",
                    "الدرجة", "المستوى", "الرتبة", "الفئة"
            }),
            // Manager - المدير
            Map.entry("manager", new String[] {
                    "manager", "parent_id", "manager_name", "supervisor", "direct_manager",
                    "المدير", "المسؤول", "المدير المباشر"
            }),
            // Cost Center - مركز التكلفة
            Map.entry("cost_center", new String[] {
                    "cost_center", "x_cost_center", "cost_code",
                    "مركز التكلفة", "رمز التكلفة"
            }),
            // Start Date - تاريخ البداية
            Map.entry("start_date", new String[] {
                    "start_date", "join_date", "hire_date", "employment_date",
                    "تاريخ البداية", "تاريخ الالتحاق", "تاريخ التعيين"
            }),
            // End Date - تاريخ النهاية
            Map.entry("end_date", new String[] {
                    "end_date", "termination_date", "leave_date",
                    "تاريخ النهاية", "تاريخ الانتهاء"
            }),
            // Benefit Class - فئة المنافع
            Map.entry("benefit_class", new String[] {
                    "benefit_class", "class", "coverage_class", "plan_class",
                    "فئة المنافع", "فئة التغطية", "الفئة"
            }),
            // Notes - ملاحظات
            Map.entry("notes", new String[] {
                    "notes", "remarks", "comment", "comments",
                    "ملاحظات", "تعليقات"
            }));

    // ═══════════════════════════════════════════════════════════════════════════
    // PREVIEW (Parse and Validate without committing)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Parse Excel file and return preview without importing (with default
     * mappings).
     */
    public MemberImportPreviewDto parseAndPreview(MultipartFile file) throws Exception {
        return parseAndPreview(file, (String) null, 0);
    }

    /**
     * Parse Excel file and return preview using Map for custom mappings (Backward
     * compatibility).
     */
    public MemberImportPreviewDto parseAndPreview(MultipartFile file, Map<String, String> customMappings)
            throws Exception {
        String json = null;
        if (customMappings != null) {
            json = objectMapper.writeValueAsString(customMappings);
        }
        return parseAndPreview(file, json, 0);
    }

    /**
     * Parse Excel file and return preview without importing.
     * 
     * Features:
     * - Auto-mapping for Arabic/English column headers
     * - Lenient validation with WARNING status for non-critical issues
     * - Only ERROR rows are skipped, WARNING rows are imported
     * - Accepts custom column mappings (excelColumn → systemField)
     * 
     * @param file           Excel file
     * @param customMappings Optional map of Excel column names to system field
     *                       names
     */
    @Transactional(readOnly = true)
    public MemberImportPreviewDto parseAndPreview(MultipartFile file, String customMappingsJson, Integer headerRowNumber)
            throws Exception {
        log.info("📊 Parsing Excel file for preview: {} (headerRow: {}, has custom mappings: {})",
                file.getOriginalFilename(), headerRowNumber, (customMappingsJson != null && !customMappingsJson.isBlank()));

        // AUTO-DETECT HEADER ROW - REVERTED TO LEGACY BEHAVIOR (Simple Default 0)
        // The advanced detection was causing issues with specific dual-header files.
        // Returning to simple logic: If not provided, assume row 0 (First row).
        int hRow = 0;
        if (headerRowNumber != null) {
            hRow = headerRowNumber;
        } else {
             // Default to 0 without complex detection
             hRow = 0;
             log.info("🔍 Defaulting to header row at index: 0");
        }
        String batchId = UUID.randomUUID().toString();
        List<MemberImportRowDto> previewRows = new ArrayList<>();
        List<ImportValidationErrorDto> validationErrors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        Map<String, String> columnMappings = new LinkedHashMap<>();
        List<String> detectedColumns = new ArrayList<>();

        // Parse custom mappings if provided
        Map<String, String> customMappings = null;
        if (customMappingsJson != null && !customMappingsJson.isBlank()) {
            try {
                customMappings = objectMapper.readValue(customMappingsJson, new com.fasterxml.jackson.core.type.TypeReference<Map<String, String>>() {});
            } catch (Exception e) {
                log.warn("Failed to parse custom mappings JSON: {}", customMappingsJson);
            }
        }

        int newCount = 0;
        int updateCount = 0;
        int warningCount = 0;
        int errorCount = 0;

        try (Workbook workbook = parserService.openWorkbook(file)) {

            Sheet sheet = parserService.getDataSheet(workbook);
            int totalRows = sheet.getLastRowNum();

            // Parse header row
            Row headerRow = sheet.getRow(hRow);
            if (headerRow == null) {
                throw new BusinessRuleException("Excel file has no header row at row " + hRow);
            }

            Map<Integer, String> columnIndexToName = new HashMap<>();
            Map<String, Integer> fieldToColumnIndex = new HashMap<>();

            // Build column index map first
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                String colName = parserService.getCellValueAsString(cell);
                if (colName == null)
                    colName = "";
                columnIndexToName.put(i, colName.trim().toLowerCase());
                detectedColumns.add(colName.trim());
            }

            // Use custom mappings if provided, otherwise auto-map
            if (customMappings != null && !customMappings.isEmpty()) {
                log.info("🎯 Using custom column mappings: {}", customMappings);

                for (Map.Entry<String, String> entry : customMappings.entrySet()) {
                    String excelColumn = entry.getKey().trim().toLowerCase();
                    String systemField = entry.getValue();

                    // Find column index using parserService logic
                    Integer columnIndex = parserService.findColumnIndex(headerRow, excelColumn);
                    if (columnIndex != null) {
                        fieldToColumnIndex.put(systemField, columnIndex);
                        columnMappings.put(excelColumn, systemField);
                        log.debug("  ✓ Mapped '{}' → {}", excelColumn, systemField);
                    } else {
                        log.warn("  ⚠ Excel column '{}' not found in file", excelColumn);
                    }
                }
            } else {
                log.info("🔍 Using auto-mapping for columns");

                // Auto-map columns using existing logic
                for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                    String colName = columnIndexToName.get(i);
                    mapColumnToField(colName, i, fieldToColumnIndex, columnMappings);
                }
            }

            // Validate mandatory columns exist (only card_number and full_name are truly
            // mandatory)
            validateMandatoryColumns(fieldToColumnIndex, validationErrors);

            // Parse data rows (limit preview to 50 rows)
            int previewLimit = Math.min(totalRows, 50);
            Set<String> seenCardNumbers = new HashSet<>();
            
            // FIX: Load ALL organizations for matching
            List<Organization> allEmployers = organizationRepository.findAll();

            // NEW: Prepare Smart Employer Lookup for Preview stage
            Map<String, Long> normalizedEmployerMap = new HashMap<>();
            for (Organization org : allEmployers) {
                if (org.getName() != null) normalizedEmployerMap.put(normalizeArabicText(org.getName()), org.getId());
                if (org.getCode() != null) normalizedEmployerMap.put(org.getCode().toLowerCase().trim(), org.getId());
            }
            
            // 🔍 DIAGNOSTIC: Show all loaded employers
            log.info("🚀 Prepared Smart Employer Lookup for Preview stage with {} entries from {} employers", 
                     normalizedEmployerMap.size(), allEmployers.size());
            log.info("📋 ALL LOADED EMPLOYERS:");
            for (Organization org : allEmployers) {
                String normalized = org.getName() != null ? normalizeArabicText(org.getName()) : "NULL";
                log.info("   🏢 ID={}, Name='{}', Normalized='{}', Code='{}', Active={}, Archived={}", 
                         org.getId(), org.getName(), normalized, org.getCode(), org.isActive(), org.isArchived());
            }
            log.info("🗺️ ALL NORMALIZED KEYS: {}", normalizedEmployerMap.keySet());

            for (int rowNum = hRow + 1; rowNum <= totalRows; rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || parserService.isEmptyRow(row))
                    continue;

                MemberImportRowDto rowDto = parseRow(row, rowNum, fieldToColumnIndex,
                        columnIndexToName, validationErrors, seenCardNumbers, normalizedEmployerMap);

                // Determine row status based on validation results
                boolean hasErrors = rowDto.getErrors() != null && !rowDto.getErrors().isEmpty();
                boolean hasWarnings = rowDto.getWarnings() != null && !rowDto.getWarnings().isEmpty();

                if (hasErrors) {
                    // Critical errors - row will be skipped
                    rowDto.setStatus("ERROR");
                    errorCount++;
                } else {
                    // Phase 1 Enterprise Fix: ALWAYS NEW
                    // We treat every row as a new member insertion.
                    // Identity is managed by auto-generated card numbers.
                    rowDto.setStatus(hasWarnings ? "WARNING" : "NEW");
                    newCount++;

                    if (hasWarnings) {
                        warningCount++;
                    }
                }

                if (rowNum <= previewLimit) {
                    previewRows.add(rowDto);
                }
            }

            // Add informational warnings
            if (totalRows > previewLimit) {
                warnings.add(String.format("عرض أول %d صف من إجمالي %d صف", previewLimit, totalRows));
            }

            // Summary info
            int importableCount = newCount + updateCount;
            if (warningCount > 0) {
                warnings.add(String.format("%d صف بها تحذيرات - ستُستورد مع ملاحظات", warningCount));
            }
            if (errorCount > 0) {
                warnings.add(String.format("%d صف بها أخطاء - سيتم تخطيها", errorCount));
            }

            List<MemberImportPreviewDto.EmployerOptionDto> employerOptions = allEmployers.stream()
                    .map(e -> MemberImportPreviewDto.EmployerOptionDto.builder()
                            .id(e.getId())
                            .code(e.getCode())
                            .nameAr(e.getName()) // Using unified name field
                            .active(e.isActive())
                            .build())
                    .toList();

            // NEW: Load available benefit policies for selection
            List<BenefitPolicy> allPolicies = benefitPolicyRepository.findAll();
            List<MemberImportPreviewDto.BenefitPolicyOptionDto> policyOptions = allPolicies.stream()
                    .map(p -> MemberImportPreviewDto.BenefitPolicyOptionDto.builder()
                            .id(p.getId())
                            .policyNumber(p.getPolicyCode())
                            .nameAr(p.getName())
                            .nameEn(p.getName())
                            .employerId(
                                    p.getEmployerOrganization() != null ? p.getEmployerOrganization().getId() : null)
                            .isActive(p.getStatus() == BenefitPolicy.BenefitPolicyStatus.ACTIVE)
                            .build())
                    .toList();

            return MemberImportPreviewDto.builder()
                    .batchId(batchId)
                    .fileName(file.getOriginalFilename())
                    .totalRows(totalRows)
                    .newCount(newCount)
                    .updateCount(updateCount)
                    .warningCount(warningCount)
                    .errorCount(errorCount)
                    .detectedColumns(detectedColumns)
                    .columnMappings(columnMappings)
                    .previewRows(previewRows)
                    .validationErrors(validationErrors)
                    .canProceed(importableCount > 0) // Can proceed if any rows are valid
                    .matchKeyUsed("CARD_NUMBER")
                    .warnings(warnings)
                    .availableEmployers(employerOptions) // NEW
                    .availableBenefitPolicies(policyOptions) // NEW
                    .build();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IMPORT (Commit after confirmation)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Execute import without header row number (Backward compatibility).
     */
    @Transactional
    public void executeImport(
            File file,
            String batchId,
            Long employerId,
            Long benefitPolicyId,
            String username,
            Long userId) throws Exception {
        executeImport(file, batchId, employerId, benefitPolicyId, 0, username, userId);
    }

    /**
     * Execute import after user confirmation.
     * 
     * @param file            Excel file
     * @param batchId         Batch ID from preview
     * @param employerId      Selected employer ID (REQUIRED)
     * @param benefitPolicyId Selected benefit policy ID (OPTIONAL)
     */
    @Transactional
    public void executeImport(
            File file,
            String batchId,
            Long employerId,
            Long benefitPolicyId,
            Integer headerRowNumber,
            String username,
            Long userId) throws Exception {
        executeImport(file, batchId, employerId, benefitPolicyId, headerRowNumber, "UPDATE", username, userId);
    }

    /**
     * Execute import after user confirmation with policy.
     * 
     * @param file            Excel file
     * @param batchId         Batch ID from preview
     * @param employerId      Selected employer ID (REQUIRED)
     * @param benefitPolicyId Selected benefit policy ID (OPTIONAL)
     * @param importPolicy    Policy for duplicates: "SKIP" or "UPDATE"
     */
    @org.springframework.scheduling.annotation.Async
    @Transactional
    public void executeImport(
            File file,
            String batchId,
            Long employerId,
            Long benefitPolicyId,
            Integer headerRowNumber,
            String importPolicy,
            String username,
            Long userId) throws Exception {
        
        log.info("🚀 [TRIGGER] Starting async import task for batch: {} (User: {})", batchId, username);

        log.info("📥 Executing member import: batchId={}, policy={}, employer={}, policy={}",
                batchId, importPolicy, employerId, benefitPolicyId);

        int hRow = headerRowNumber != null ? headerRowNumber : 0;
        
        try {
            // 1. Basic File Validation
            if (file == null || !file.exists()) {
                throw new IllegalArgumentException("الملف المرفق غير موجود أو تعذر الوصول إليه على الخادم");
            }

            // 2. Initial Log Creation (Required for ID and record keeping)
            MemberImportLog importLog = self.createImportLog(batchId, file.getName(), file.length(), username, userId);
            
            // We set status to PROCESSING via self later at line 597 to minimize UI regressions
            log.info("📝 Created/Found import log: {}", importLog.getId());

            // 3. Environment Check
            try {
                barcodeGeneratorService.ensureSequencesExist();
            } catch (Exception e) {
                log.warn("Non-critical: Self-healing sequence check failed: {}", e.getMessage());
            }

            // 4. Input Validation
            if (employerId != null && !organizationRepository.existsById(employerId)) {
                throw new BusinessRuleException("جهة العمل المحددة غير موجودة في النظام (ID: " + employerId + ")");
            }

            try (Workbook workbook = parserService.openWorkbook(file)) {
                Sheet sheet = parserService.getDataSheet(workbook);
                int totalRows = sheet.getLastRowNum();
                int rowsToProcess = Math.max(0, totalRows - hRow);
                
                // Update log with total rows and set status to PROCESSING via self to ensure commit
                self.updateImportProgress(batchId, MemberImportLog.ImportStatus.PROCESSING, rowsToProcess, 0, 0, 0, 0, 0);
                log.info("📊 Starting processing loop for batch {} with {} rows", batchId, rowsToProcess);

                List<ImportErrorDetailDto> errors = new ArrayList<>();
                int totalProcessed = 0;
                int createdCount = 0;
                int updatedCount = 0;
                int skippedCount = 0;
                int errorCount = 0;



            // Parse header
            Row headerRow = sheet.getRow(hRow);
            Map<Integer, String> columnIndexToName = new HashMap<>();
            Map<String, Integer> fieldToColumnIndex = new HashMap<>();
            Map<String, String> columnMappings = new LinkedHashMap<>();

            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                String colName = parserService.getCellValueAsString(headerRow.getCell(i));
                if (colName == null) colName = "";
                colName = colName.trim().toLowerCase();
                columnIndexToName.put(i, colName);
                mapColumnToField(colName, i, fieldToColumnIndex, columnMappings);
            }

            // NEW: Context Cache for Row-Based Lookup (Name -> ID)
            Map<String, Long> employerNameCache = new HashMap<>(); // Raw/Direct cache
            
            // SMART LOOKUP: Pre-load all employers and build Normalized Map
            // This solves generic Arabic text mismatches (Hamza, Taa Marbouta, etc.)
            Map<String, Long> normalizedEmployerMap = new HashMap<>();
            
            // ALWAYS pre-load for robust matching regardless of employerId context
            List<Organization> allEmployers = organizationRepository.findAll();
            for (Organization org : allEmployers) {
                if (org.getName() != null) {
                    normalizedEmployerMap.put(normalizeArabicText(org.getName()), org.getId());
                }
                if (org.getCode() != null) {
                    normalizedEmployerMap.put(org.getCode().toLowerCase().trim(), org.getId());
                }
            }
            log.info("📊 Built smart lookup map with {} entries for execution", normalizedEmployerMap.size());

            Map<String, Member> nationalNumberMap = new HashMap<>(); 
            Map<String, Member> employeeNumberMap = new HashMap<>();
            Map<String, Member> normalizedNameMap = new HashMap<>();

            // GLOBAL DUPLICATE DETECTION: Always load ALL active members to prevent duplicates across any employer
            List<Member> allActiveMembers = memberRepository.findByActiveTrue();
            log.info("🚀 Global Protection: Loaded {} members into memory for global duplicate check", allActiveMembers.size());
            for (Member m : allActiveMembers) {
                if (m.getCivilId() != null) nationalNumberMap.put(m.getCivilId(), m);
                if (m.getEmployeeNumber() != null) employeeNumberMap.put(m.getEmployeeNumber(), m);
                if (m.getFullName() != null) normalizedNameMap.put(normalizeArabicText(m.getFullName()), m);
            }

            // Process rows
            for (int rowNum = hRow + 1; rowNum <= totalRows; rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || parserService.isEmptyRow(row)) {
                    skippedCount++;
                    continue;
                }

                totalProcessed++;

                // REAL-TIME PROGRESS UPDATE (In-memory counters)
                if (totalProcessed % 20 == 0 || totalProcessed == rowsToProcess) {
                    self.updateImportProgress(batchId, MemberImportLog.ImportStatus.PROCESSING, rowsToProcess, totalProcessed, createdCount, updatedCount, skippedCount, errorCount);
                }

                try {
                    // Processing each row
                    
                    ImportRowResult result = self.processRow(row, rowNum, fieldToColumnIndex,
                            columnIndexToName, importLog.getId(), employerId, benefitPolicyId, importPolicy,
                            nationalNumberMap, employeeNumberMap, normalizedNameMap, employerNameCache, normalizedEmployerMap); // PASSING MAP

                    if (result.isCreated()) {
                        createdCount++;
                    } else if (result.isUpdated()) {
                        updatedCount++;
                    } else if (result.isSkipped()) {
                        skippedCount++;
                    }

                } catch (Exception e) {
                    errorCount++;
                    String rowJson = rowToJson(row, columnIndexToName);
                    String errorMsg = e.getMessage() != null ? e.getMessage() : e.toString();
                    log.error("❌ Row {} failed: {}", rowNum, errorMsg);
                    self.saveImportError(importLog.getId(), rowNum, errorMsg, rowJson);

                    errors.add(MemberImportResultDto.ImportErrorDetailDto.builder()
                            .rowNumber(rowNum)
                            .errorType("SYSTEM")
                            .message(errorMsg)
                            .messageAr(errorMsg)
                            .messageEn(errorMsg)
                            .build());
                }
            }

            // Complete import
            importLog.setCreatedCount(createdCount);
            importLog.setUpdatedCount(updatedCount);
            importLog.setSkippedCount(skippedCount);
            // Terminal status update via self
            self.updateImportProgress(batchId, errorCount > 0 ? MemberImportLog.ImportStatus.PARTIAL : MemberImportLog.ImportStatus.COMPLETED, 
               rowsToProcess, totalProcessed, createdCount, updatedCount, skippedCount, errorCount);
            
            // Populate Summary for Frontend
            MemberImportResultDto.ImportSummary summary = MemberImportResultDto.ImportSummary.builder()
                    .total(totalProcessed)
                    .created(createdCount)
                    .updated(updatedCount)
                    .failed(errorCount)
                    .build();

            double successRate = totalProcessed > 0
                    ? (double) (createdCount + updatedCount) / totalProcessed * 100
                    : 0;

            String message = String.format(
                    "تم استيراد %d عضو: %d جديد، %d تحديث، %d أخطاء",
                    createdCount + updatedCount, createdCount, updatedCount, errorCount);

            log.info("✅ Import completed: {}", message);

        }
    } catch (Exception e) {
            log.error("❌ Fatal failure in background import batch {}: {}", batchId, e.getMessage(), e);
            
            String friendlyMessage = e.getMessage();
            if (friendlyMessage == null || friendlyMessage.isBlank()) {
                friendlyMessage = "حدث خطأ غير متوقع أثناء المعالجة: " + e.getClass().getSimpleName();
            }
            
            // Map technical Java categories to Arabic user-friendly messages
            if (e instanceof java.io.IOException || e.getClass().getSimpleName().contains("FormatException")) {
                friendlyMessage = "فشل في قراءة ملف الإكسل. الرجاء التأكد من أن الملف غير محمي بكلمة مرور وبصيغة .xlsx صحيحة. (تفاصيل: " + e.getMessage() + ")";
            } else if (e.getClass().getName().contains("postgresql") || e.getClass().getName().contains("hibernate")) {
                friendlyMessage = "فشل في التواصل مع قاعدة البيانات. الرجاء المحاولة مرة أخرى لاحقاً.";
            } else if (e instanceof BusinessRuleException) {
                friendlyMessage = "فشل التحقق من صحة البيانات: " + e.getMessage();
            }

            // Rescue mission: ensure log is updated even if original transaction is doomed
            self.markImportAsFailed(batchId, friendlyMessage);
            throw e;
        } finally {
            // CRITICAL: Cleanup temp file after background processing
            if (file != null && file.exists()) {
                try {
                    boolean deleted = file.delete();
                    log.info("🗑️ Background import cleanup: file {} deleted: {}", file.getName(), deleted);
                } catch (Exception ex) {
                    log.warn("Failed to delete temp import file: {}", ex.getMessage());
                }
            }
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markImportAsFailed(String batchId, String errorMessage) {
        log.error("🧨 FORCE MARKING BATCH {} AS FAILED with message: {}", batchId, errorMessage);
        importLogRepository.findByImportBatchId(batchId).ifPresentOrElse(logEntry -> {
            logEntry.setStatus(ImportStatus.FAILED);
            logEntry.setErrorMessage(errorMessage);
            logEntry.setCompletedAt(LocalDateTime.now());
            importLogRepository.saveAndFlush(logEntry);
            log.info("💾 Successfully saved FAILED status for batch {}", batchId);
        }, () -> {
            log.warn("⚠️ Could not find import log for batch {} to mark as failed!", batchId);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateImportProgress(String batchId, ImportStatus status, int total, int processed, int created, int updated, int skipped, int errors) {
        importLogRepository.findByImportBatchId(batchId).ifPresent(logEntry -> {
            logEntry.setStatus(status);
            logEntry.setTotalRows(total);
            logEntry.setCreatedCount(created);
            logEntry.setUpdatedCount(updated);
            logEntry.setSkippedCount(skipped);
            logEntry.setErrorCount(errors);
            importLogRepository.saveAndFlush(logEntry);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public MemberImportLog createImportLog(String batchId, String fileName, long fileSize, String username, Long userId) {
        MemberImportLog importLog = MemberImportLog.builder()
                .importBatchId(batchId)
                .fileName(fileName)
                .fileSizeBytes(fileSize)
                .status(MemberImportLog.ImportStatus.VALIDATING) // Initial stage
                .importedByUserId(userId)
                .importedByUsername(username != null ? username : "system")
                .build();
        importLog.markStarted();
        return importLogRepository.save(importLog);
    }

    /**
     * Helper to save a MultipartFile to a stable temp file for background processing.
     */
    public File saveToTempFile(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty or null");
        }
        
        Path tempPath = Files.createTempFile("import_" + UUID.randomUUID(), ".xlsx");
        try (InputStream is = file.getInputStream()) {
            Files.copy(is, tempPath, StandardCopyOption.REPLACE_EXISTING);
        }
        log.info("💾 Saved multipart file to stable temp storage: {}", tempPath);
        return tempPath.toFile();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find column index by Excel column name (case-insensitive)
     */
    private Integer findColumnIndexByName(String columnName, Map<Integer, String> columnIndexToName) {
        String lowerName = columnName.toLowerCase();
        for (Map.Entry<Integer, String> entry : columnIndexToName.entrySet()) {
            if (entry.getValue().equals(lowerName)) {
                return entry.getKey();
            }
        }
        return null;
    }

    private void mapColumnToField(String colName, int index,
            Map<String, Integer> fieldToColumnIndex, Map<String, String> columnMappings) {

        // 0. Essential Cleanup (BOM removal + Invisible chars)
        String baseCleaned = colName.replace("\uFEFF", "")
                .replace('\u00A0', ' ')
                .replace('\u200B', ' ')
                .trim();
        
        log.info("🔍 Analyzing Header [Index {}]: '{}' (Base Cleaned: '{}')", index, colName, baseCleaned);

        // Generate Candidates for Matching
        // Priority 1: Exact Line Matches (e.g. "Unique ID" inside a multi-line header)
        // Priority 2: Cleaned versions (removing *, (), :)
        Set<String> candidates = new java.util.LinkedHashSet<>();
        
        // 1. Full string
        candidates.add(baseCleaned);
        
        // 2. Split by newlines (Critical for dual-language headers)
        String[] lines = baseCleaned.split("[\\r\\n]+");
        for (String line : lines) {
            candidates.add(line.trim());
        }
        
        // 3. Decorated versions (Remove *, (), :) based on previous candidates
        // We use a temporary list to avoid concurrent modification
        List<String> rawCandidates = new ArrayList<>(candidates);
        for (String c : rawCandidates) {
            // Remove asterisk (Common indicator for mandatory fields)
            if (c.contains("*")) {
                candidates.add(c.replace("*", "").trim());
            }
            
            // Deep clean: remove special chars often used in headers
            String deeplyCleaned = c.replaceAll("[*\\(\\):\\-_]", " ").replaceAll("\\s+", " ").trim();
            if (!deeplyCleaned.isEmpty() && !deeplyCleaned.equals(c)) {
                candidates.add(deeplyCleaned);
            }
        }

        // --- Matching Logic ---

        // 1. Mandatory Columns Matching
        for (int i = 0; i < MANDATORY_COLUMNS.size(); i++) {
            String fieldName = i == 0 ? "fullName" : i == 1 ? "employer" : "policy";
            
            for (String variant : MANDATORY_COLUMNS.get(i)) {
                for (String candidate : candidates) {
                    // Check Exact Line Match
                    if (candidate.equalsIgnoreCase(variant)) {
                        log.info("  ✅ Match Found (Exact Candidate): '{}' -> {}", candidate, fieldName);
                        fieldToColumnIndex.put(fieldName, index);
                        columnMappings.put(colName, fieldName);
                        return;
                    }
                    
                    // Check Normalized Match
                    if (normalizeArabicText(candidate).equals(normalizeArabicText(variant))) {
                         log.info("  ✅ Match Found (Normalized Candidate): '{}' -> {}", candidate, fieldName);
                         fieldToColumnIndex.put(fieldName, index);
                         columnMappings.put(colName, fieldName);
                         return;
                    }
                }
            }
        }

        // 2. Optional Columns Matching
        for (Map.Entry<String, String[]> entry : OPTIONAL_FIELD_MAPPINGS.entrySet()) {
            for (String variant : entry.getValue()) {
                for (String candidate : candidates) {
                    if (candidate.equalsIgnoreCase(variant) || 
                        normalizeArabicText(candidate).equals(normalizeArabicText(variant))) {
                        
                        fieldToColumnIndex.put(entry.getKey(), index);
                        columnMappings.put(colName, entry.getKey());
                        return;
                    }
                }
            }
        }

        // 3. Attributes Matching
        for (Map.Entry<String, String[]> entry : ATTRIBUTE_MAPPINGS.entrySet()) {
            for (String variant : entry.getValue()) {
                for (String candidate : candidates) {
                     if (candidate.equalsIgnoreCase(variant) || 
                        normalizeArabicText(candidate).equals(normalizeArabicText(variant))) {
                        
                        fieldToColumnIndex.put(entry.getKey(), index);
                        columnMappings.put(colName, entry.getKey());
                        return;
                    }
                }
            }
        }
    
        // 4. Fallback: Cleaned Attribute Name
        // Use the deepest cleaned candidate if available for the attribute key, or just the base
        String bestCandidate = baseCleaned.replace("*", "").trim();
        String normalized = bestCandidate.replaceAll("[^a-z0-9_]", "_").replaceAll("_+", "_");
        
        if (!normalized.isBlank()) {
            fieldToColumnIndex.put("attr:" + normalized, index);
            columnMappings.put(colName, "attribute:" + normalized);
        }
    }

    private void validateMandatoryColumns(Map<String, Integer> fieldToColumnIndex,
            List<ImportValidationErrorDto> errors) {

        // Full Name and Employer are MANDATORY
        if (!fieldToColumnIndex.containsKey("fullName")) {
            errors.add(ImportValidationErrorDto.builder()
                    .rowNumber(0)
                    .field("header")
                    .message("Missing mandatory column: full_name / name (الاسم الكامل)")
                    .build());
        }
        // Strict Employer Column check removed to allow Single-Tenant imports (Global Employer Selected)
        // Validation will happen at Row level during processing if Global Employer is missing.
    }

    private MemberImportRowDto parseRow(Row row, int rowNum,
            Map<String, Integer> fieldToColumnIndex,
            Map<Integer, String> columnIndexToName,
            List<ImportValidationErrorDto> validationErrors,
            Set<String> seenCardNumbers,
            Map<String, Long> normalizedEmployerMap) { // Added map for Smart Preview

        List<String> rowErrors = new ArrayList<>(); // Critical errors - block import
        List<String> rowWarnings = new ArrayList<>(); // Warnings - allow import
        Map<String, String> attributes = new HashMap<>();
        String status = "NEW"; // Default status
        boolean hasError = false;
        boolean hasWarning = false;

        // Extract mandatory fields - card_number is the UNIQUE identifier
        String cardNumber = getFieldValue(row, fieldToColumnIndex, "cardNumber");
        String fullName = getFieldValue(row, fieldToColumnIndex, "fullName");
        String employerName = getFieldValue(row, fieldToColumnIndex, "employer");
        String civilId = getFieldValue(row, fieldToColumnIndex, "civilId");

        // ═══════════════════════════════════════════════════════════════════════════
        // CRITICAL VALIDATIONS (ERROR) - These block import
        // ═══════════════════════════════════════════════════════════════════════════

        // full_name is MANDATORY
        if (fullName == null || fullName.isBlank()) {
            rowErrors.add("الاسم الكامل مطلوب (Full name is required)");
            validationErrors.add(ImportValidationErrorDto.builder()
                    .rowNumber(rowNum)
                    .field("full_name")
                    .message("الاسم الكامل مطلوب - Full name is required")
                    .severity("ERROR")
                    .build());
            hasError = true;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // NON-CRITICAL VALIDATIONS (WARNING) - These allow import but flag issues
        // ═══════════════════════════════════════════════════════════════════════════

        // employer is MANDATORY (Enterprise Fix)
        if (employerName == null || employerName.isBlank()) {
            rowErrors.add("جهة العمل مطلوبة (Employer is required)");
            validationErrors.add(ImportValidationErrorDto.builder()
                    .rowNumber(rowNum)
                    .field("employer")
                    .message("جهة العمل مطلوبة - Employer is required")
                    .severity("ERROR")
                    .build());
            hasError = true;
        } else {
            // Check if employer exists (Using Smart Normalized Lookup for consistent preview)
                String normalizedInput = normalizeArabicText(employerName);
                
                // 🔍 DIAGNOSTIC: Show what we're looking for vs what we have
                log.info("🔎 LOOKUP: Raw='{}', Normalized='{}', MapSize={}", 
                         employerName, normalizedInput, 
                         normalizedEmployerMap != null ? normalizedEmployerMap.size() : 0);
                
                Long fuzzyMatchId = (normalizedEmployerMap != null) ? normalizedEmployerMap.get(normalizedInput) : null;
                
                if (fuzzyMatchId != null) {
                    log.info("🧩 PREVIEW: Fuzzy matched employer: '{}' -> ID: {}", employerName, fuzzyMatchId);
                } else {
                    // Try direct DB search as fallback if map is empty (shouldn't be)
                    List<Organization> found = organizationRepository.searchActive(employerName);
                    if (found.isEmpty()) {
                        log.warn("❌ PREVIEW: Employer NOT found: '{}' (normalized: '{}')", employerName, normalizedInput);
                        rowWarnings.add(
                                "جهة العمل غير موجودة: " + employerName + " - يرجى التأكد من الاسم أو الكود");
                        validationErrors.add(ImportValidationErrorDto.builder()
                                .rowNumber(rowNum)
                                .field("employer")
                                .value(employerName)
                                .message("جهة العمل غير موجودة - Employer not found: " + employerName)
                                .severity("WARNING")
                                .build());
                        hasWarning = true;
                    } else {
                        log.info("✅ PREVIEW: Direct DB search matched employer: '{}'", employerName);
                    }
                }
            }

        // Card Number check (Support manual entry from Excel)
        if (cardNumber != null && !cardNumber.isBlank()) {
            if (seenCardNumbers.contains(cardNumber)) {
                rowWarnings.add("رقم بطاقة مكرر في الملف: " + cardNumber + " (سيتم تجاهله واستخدام الرقم الأول أو توليد جديد)");
                 validationErrors.add(ImportValidationErrorDto.builder()
                        .rowNumber(rowNum)
                        .field("card_number")
                        .value(cardNumber)
                        .message("رقم بطاقة مكرر - Duplicate card number in file: " + cardNumber)
                        .severity("WARNING")
                        .build());
                hasWarning = true;
            } else {
                seenCardNumbers.add(cardNumber);
            }
        }

        // Extract attributes
        for (Map.Entry<String, Integer> entry : fieldToColumnIndex.entrySet()) {
            if (entry.getKey().startsWith("attr:")) {
                String attrCode = entry.getKey().substring(5);
                String attrValue = parserService.getCellValueAsString(row.getCell(entry.getValue()));
                if (attrValue != null && !attrValue.isBlank()) {
                    attributes.put(attrCode, attrValue);
                }
            }
        }

        // Determine final status
        if (hasError) {
            status = "ERROR";
        } else if (hasWarning) {
            status = "WARNING"; // Has warnings but can be imported
        }
        // Status will be updated to NEW or UPDATE after checking existence

        return MemberImportRowDto.builder()
                .rowNumber(rowNum)
                .cardNumber(cardNumber)
                .fullName(fullName)
                .civilId(civilId)
                .employerName(employerName)
                .attributes(attributes)
                .status(status)
                .errors(rowErrors)
                .warnings(rowWarnings)
                .build();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ImportRowResult processRow(Row row, int rowNum,
            Map<String, Integer> fieldToColumnIndex,
            Map<Integer, String> columnIndexToName,
            Long importLogId,
            Long globalEmployerId,
            Long benefitPolicyId,
            String importPolicy,
            Map<String, Member> nationalNumberMap,
            Map<String, Member> employeeNumberMap,
            Map<String, Member> normalizedNameMap,
            Map<String, Long> employerNameCache,
            Map<String, Long> normalizedEmployerMap) { // Added argument

        // 1. Resolve Employer
        Long effectiveEmployerId = globalEmployerId;
        Organization employerOrg = null;

        if (effectiveEmployerId != null) {
             employerOrg = organizationRepository.findById(effectiveEmployerId).orElse(null);
        } else {
            // Row-based resolution
            String empName = getFieldValue(row, fieldToColumnIndex, "employer");
            if (empName == null || empName.isBlank()) {
                self.saveImportError(importLogId, rowNum, "Missing Employer", rowToJson(row, columnIndexToName));
                return ImportRowResult.skipped();
            }
            
            // Normalize name key
            String empKey = empName.trim().toLowerCase();
            Long cachedId = employerNameCache.get(empKey);
            
            if (cachedId != null) {
                effectiveEmployerId = cachedId;
                // If we cache just ID, we must fetch OBJ to return/use logic later? 
                // Wait, logic below expects employerOrg != null?
                // Yes, employerOrg check is at 1031.
                // We should cache Object or fetch by ID. Cached ID is fine, we fetch by ID.
                employerOrg = organizationRepository.findById(cachedId).orElse(null);
            } else {
                // A. Direct DB Search (Exact/Like)
                List<Organization> matches = organizationRepository.searchActive(empName);
                if (!matches.isEmpty()) {
                    employerOrg = matches.get(0);
                    effectiveEmployerId = employerOrg.getId();
                    employerNameCache.put(empKey, effectiveEmployerId);
                } else {
                    // B. Smart Normalized Lookup (Fuzzy Logic)
                    String normalizedInput = normalizeArabicText(empName);
                    Long fuzzyMatchId = normalizedEmployerMap.get(normalizedInput);
                    
                    if (fuzzyMatchId != null) {
                        log.info("🧩 Fuzzy matched employer: '{}' -> ID: {}", empName, fuzzyMatchId);
                        effectiveEmployerId = fuzzyMatchId;
                        employerOrg = organizationRepository.findById(fuzzyMatchId).orElse(null);
                        employerNameCache.put(empKey, effectiveEmployerId); // Cache result for speed
                    } else {
                        self.saveImportError(importLogId, rowNum, "Employer not found: " + empName, rowToJson(row, columnIndexToName));
                        return ImportRowResult.skipped();
                    }
                }
            }
        }

        if (employerOrg == null) {
             self.saveImportError(importLogId, rowNum, "Invalid Employer ID", rowToJson(row, columnIndexToName));
             return ImportRowResult.skipped();
        }

        // Extract fields
        String fullName = getFieldValue(row, fieldToColumnIndex, "fullName");
        String civilId = getFieldValue(row, fieldToColumnIndex, "civilId"); 

        // CRITICAL VALIDATION
        if (fullName == null || fullName.isBlank()) {
            log.debug("⏭️ Skipping row {}: missing full_name", rowNum);
            return ImportRowResult.skipped();
        }

        // SMART DUPLICATE DETECTION (Context-Aware)
        // If we are in Multi-Tenant mode (Global ID is null), the maps (nationalNumberMap etc) are likely empty.
        // We MUST verify against DB for this specific employer to prevent duplicates.
        
        Member existingMember = null;
        
        // Check In-Memory Maps first (Fast path for Single-Tenant)
        if (civilId != null && !civilId.isBlank()) existingMember = nationalNumberMap.get(civilId);
        if (existingMember == null) {
             String employeeNumber = getFieldValue(row, fieldToColumnIndex, "employeeNumber");
             if (employeeNumber != null && !employeeNumber.isBlank()) existingMember = employeeNumberMap.get(employeeNumber);
        }
        if (existingMember == null) {
            String normName = normalizeArabicText(fullName);
            existingMember = normalizedNameMap.get(normName);
        }

        // Validation: If found in map, ensure it belongs to the SAME employer?
        // The maps were built from the globalEmployerId, so yes.
        // BUT if Multi-Tenant, maps are empty, so existingMember is null.
        
        // Multi-Tenant Fallback: DB Check
        if (existingMember == null && globalEmployerId == null) {
             // We must check DB for duplicates within this effectiveEmployerId
             // 1. Civil ID
             if (civilId != null && !civilId.isBlank()) {
                 List<Member> matches = memberRepository.findByCivilIdAndEmployerOrganizationId(civilId, effectiveEmployerId);
                 if (!matches.isEmpty()) existingMember = matches.get(0);
             }
             // 2. Employee Number
             if (existingMember == null) {
                  String employeeNumber = getFieldValue(row, fieldToColumnIndex, "employeeNumber");
                  if (employeeNumber != null && !employeeNumber.isBlank()) {
                      List<Member> matches = memberRepository.findByEmployeeNumberAndEmployerOrganizationId(employeeNumber, effectiveEmployerId);
                      if (!matches.isEmpty()) existingMember = matches.get(0);
                  }
             }
             // 3. Normalized Name Check - Use passed normalizedNameMap for speed (O(1) instead of O(n))
             if (existingMember == null && fullName != null && !fullName.isBlank()) {
                 String normName = normalizeArabicText(fullName);
                 existingMember = normalizedNameMap.get(normName);
                 if (existingMember != null) {
                     log.debug("🔍 Found duplicate by normalized name from cache: '{}' -> ID: {}", fullName, existingMember.getId());
                 }
             }
        }

        Member member;
        boolean isUpdate = false;
        String manualCardNumber = getFieldValue(row, fieldToColumnIndex, "cardNumber");

        if (existingMember != null) {
            // DUPLICATE DETECTED (Global Scope)
            if ("SKIP".equalsIgnoreCase(importPolicy)) {
                return ImportRowResult.skipped();
            }
            // UPDATE: Keep the member and update their employer to the new one if changed
            member = existingMember;
            member.setFullName(fullName);
            
            // Re-assign employer if different
            if (employerOrg != null && (member.getEmployerOrganization() == null || !member.getEmployerOrganization().getId().equals(employerOrg.getId()))) {
                log.info("🔄 Re-assigning member {} from current employer to {}", member.getId(), employerOrg.getName());
                member.setEmployerOrganization(employerOrg);
            }
            
            isUpdate = true;
        } else {
            // CREATE new member
            MemberCreateDto createDto = MemberCreateDto.builder()
                    .fullName(fullName)
                    .employerId(effectiveEmployerId)
                    .benefitPolicyId(benefitPolicyId)
                    .status(MemberStatus.ACTIVE)
                    .cardStatus(Member.CardStatus.ACTIVE)
                    .active(true)
                    .employeeNumber(getFieldValue(row, fieldToColumnIndex, "employeeNumber"))
                    .civilId(civilId)
                    .phone(getFieldValue(row, fieldToColumnIndex, "phone"))
                    .email(getFieldValue(row, fieldToColumnIndex, "email"))
                    .build();

            // Manual Card Number Support: If provided in Excel, set it in DTO
            if (manualCardNumber != null && !manualCardNumber.isBlank()) {
                createDto.setCardNumber(manualCardNumber);
            }

            MemberViewDto created = unifiedMemberService.createPrincipalMember(createDto);
            member = memberRepository.findById(created.getId())
                    .orElseThrow(() -> new RuntimeException("Failed to reload created member"));
        }

        // Set/Update fields not covered by basic create or for updates
        if (isUpdate) {
            String phone = getFieldValue(row, fieldToColumnIndex, "phone");
            if (phone != null && !phone.isBlank()) member.setPhone(phone);
            
            String email = getFieldValue(row, fieldToColumnIndex, "email");
            if (email != null && !email.isBlank()) member.setEmail(email);
            
            if (civilId != null && !civilId.isBlank()) member.setCivilId(civilId);
            
            String employeeNumber = getFieldValue(row, fieldToColumnIndex, "employeeNumber");
            if (employeeNumber != null && !employeeNumber.isBlank()) member.setEmployeeNumber(employeeNumber);
        }

        // Birth Date
        String birthDateStr = getFieldValue(row, fieldToColumnIndex, "birthDate");
        if (birthDateStr != null && !birthDateStr.isBlank()) {
            try {
                LocalDate birthDate = parseDate(birthDateStr);
                member.setBirthDate(birthDate);
            } catch (Exception e) {}
        }

        // Gender
        String genderStr = getFieldValue(row, fieldToColumnIndex, "gender");
        if (genderStr != null && !genderStr.isBlank()) {
            try {
                Gender gender = parseGender(genderStr);
                member.setGender(gender);
            } catch (Exception e) {}
        }
        
        // Attributes (Job, Department, etc.)
        // Refactored to reduce clutter
        saveAttributeIfExists(member, "job_title", getFieldValue(row, fieldToColumnIndex, "jobTitle"));
        saveAttributeIfExists(member, "department", getFieldValue(row, fieldToColumnIndex, "department"));

        try {
            member = memberRepository.save(member);
        } catch (Exception e) {
            log.error("❌ Error saving member in row {}: {}", rowNum, e.getMessage());
            self.saveImportError(importLogId, rowNum, "Save Error: " + e.getMessage(), rowToJson(row, columnIndexToName));
            throw e; // Rollback this row
        }

        return isUpdate ? ImportRowResult.updated() : ImportRowResult.created();
    }
    
    private void saveAttributeIfExists(Member member, String code, String value) {
        if (value != null && !value.isBlank()) {
            MemberAttribute attr = MemberAttribute.builder()
                    .member(member)
                    .attributeCode(code)
                    .attributeValue(value)
                    .source(AttributeSource.IMPORT)
                    .build();
            member.getAttributes().add(attr);
        }
    }

    private void saveOrUpdateAttribute(Member member, String code, String value, AttributeSource source) {
        Optional<MemberAttribute> existing = attributeRepository
                .findByMemberIdAndAttributeCode(member.getId(), code);

        MemberAttribute attr;
        if (existing.isPresent()) {
            attr = existing.get();
            attr.setAttributeValue(value);
            attr.setSource(source);
        } else {
            attr = MemberAttribute.builder()
                    .member(member)
                    .attributeCode(code)
                    .attributeValue(value)
                    .source(source)
                    .build();
        }
        attributeRepository.save(attr);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public MemberImportLog createImportLog(String batchId, String fileName, long fileSize, User currentUser) {
        MemberImportLog importLog = MemberImportLog.builder()
                .importBatchId(batchId)
                .fileName(fileName)
                .fileSizeBytes(fileSize)
                .status(ImportStatus.PROCESSING)
                .importedByUserId(currentUser != null ? currentUser.getId() : null)
                .importedByUsername(currentUser != null ? currentUser.getUsername() : "system")
                .build();
        importLog.markStarted();
        return importLogRepository.save(importLog);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveImportError(Long logId, int rowNum, String message, String rowData) {
        try {
            MemberImportLog log = importLogRepository.findById(logId).orElse(null);
            if (log != null) {
                MemberImportError error = MemberImportError.systemError(log, rowNum, message, rowData);
                importErrorRepository.save(error);
            }
        } catch (Exception e) {
            // Last resort: log to console if even this fails
            log.error("❌ Failed to save import error to database: {}", e.getMessage());
        }
    }

    private String getFieldValue(Row row, Map<String, Integer> fieldToColumnIndex, String field) {
        Integer colIndex = fieldToColumnIndex.get(field);
        if (colIndex == null)
            return null;
        return parserService.getCellValueAsString(row.getCell(colIndex));
    }


    private Gender parseGender(String value) {
        if (value == null || value.isBlank())
            return Gender.UNDEFINED; // Default to UNDEFINED if empty
        String v = value.toLowerCase().trim();
        if (v.contains("male") || v.contains("ذكر") || v.equals("m")) {
            return Gender.MALE;
        }
        if (v.contains("female") || v.contains("أنثى") || v.equals("f")) {
            return Gender.FEMALE;
        }
        if (v.contains("undefined") || v.contains("غير محدد") || v.equals("u")) {
            return Gender.UNDEFINED;
        }
        // Default to UNDEFINED for any unrecognized value
        return Gender.UNDEFINED;
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank())
            return null;
        try {
            // Try ISO format
            return LocalDate.parse(value);
        } catch (Exception e1) {
            try {
                // Try dd/MM/yyyy
                String[] parts = value.split("[/\\-]");
                if (parts.length == 3) {
                    int day = Integer.parseInt(parts[0]);
                    int month = Integer.parseInt(parts[1]);
                    int year = Integer.parseInt(parts[2]);
                    if (year < 100)
                        year += 2000;
                    return LocalDate.of(year, month, day);
                }
            } catch (Exception e2) {
                log.warn("Could not parse date: {}", value);
            }
        }
        return null;
    }

    private String rowToJson(Row row, Map<Integer, String> columnIndexToName) {
        Map<String, String> data = new HashMap<>();
        for (Map.Entry<Integer, String> entry : columnIndexToName.entrySet()) {
            String value = parserService.getCellValueAsString(row.getCell(entry.getKey()));
            if (value != null) {
                data.put(entry.getValue(), value);
            }
        }
        try {
            return objectMapper.writeValueAsString(data);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }



    private String normalizeArabicText(String text) {
        if (text == null) return "";
        
        // 0. Essential Cleanup
        String input = text.replace("\uFEFF", "") // BOM
                           .replace('\u00A0', ' ')
                           .replace('\u200B', ' ') // NBSP & ZWSP
                           .replace("\u0640", ""); // Tatweel

        // 1. Basic Normalization
        String normalized = input.trim().replaceAll("\\s+", " ");

        // 2. Alef Variations -> ا (\u0627)
        normalized = normalized.replace('\u0623', '\u0627') // أ
                               .replace('\u0625', '\u0627') // إ
                               .replace('\u0622', '\u0627'); // آ

        // 3. Taa Marbouta -> ه (\u0647)
        normalized = normalized.replace('\u0629', '\u0647'); // ة

        // 4. Ya and Kaf variations -> ي (\u064A) and ك (\u0643)
        normalized = normalized.replace('\u0649', '\u064A') // ى -> ي
                               .replace('\u06CC', '\u064A') // Persian ی -> ي
                               .replace('\u064A', '\u064A') // Standard Ya
                               .replace('\u06A9', '\u0643'); // Persian ک -> ك

        // 5. Remove Tashkeel ([\u064B-\u0652]) and other combining marks
        normalized = normalized.replaceAll("[\u064B-\u0652\u0653\u0654\u0655\u0670]", "");

        // 6. Handle Alef Wasla and other Alif variations
        normalized = normalized.replace('\u0671', '\u0627'); // ٱ -> ا

        return normalized.toLowerCase().trim();
    }

    /**
     * Result of processing a single row
     */
    public static class ImportRowResult { // Changed from private to public
        private final boolean created;
        private final boolean updated;
        private final boolean skipped;

        public ImportRowResult(boolean created, boolean updated, boolean skipped) { // Changed from private to public
            this.created = created;
            this.updated = updated;
            this.skipped = skipped;
        }

        public static ImportRowResult created() { // Changed from package-private (implicit) to public
            return new ImportRowResult(true, false, false);
        }

        public static ImportRowResult updated() { // Changed from package-private to public
            return new ImportRowResult(false, true, false);
        }

        public static ImportRowResult skipped() { // Changed from package-private to public
            return new ImportRowResult(false, false, true);
        }

        public boolean isCreated() { // Already public-ish (package-private originally?)
            return created;
        }

        public boolean isUpdated() {
            return updated;
        }

        public boolean isSkipped() {
            return skipped;
        }
    }
    @Transactional(readOnly = true)
    public MemberImportLog getImportLog(String batchId) {
        return importLogRepository.findByImportBatchId(batchId).orElse(null);
    }

    @Transactional(readOnly = true)
    public List<MemberImportResultDto.ImportErrorDetailDto> getImportErrors(String batchId) {
        Optional<MemberImportLog> logOpt = importLogRepository.findByImportBatchId(batchId);
        if (logOpt.isEmpty()) return new ArrayList<>();

        List<MemberImportError> errors = importErrorRepository.findByImportLogId(logOpt.get().getId());
        return errors.stream().map(e -> (MemberImportResultDto.ImportErrorDetailDto) MemberImportResultDto.ImportErrorDetailDto.builder()
                .rowNumber(e.getRowNumber())
                .errorType(e.getErrorType() != null ? e.getErrorType().name() : "UNKNOWN")
                .messageAr(e.getErrorMessage())
                .message(e.getErrorMessage())
                .build()).toList();
    }
}
