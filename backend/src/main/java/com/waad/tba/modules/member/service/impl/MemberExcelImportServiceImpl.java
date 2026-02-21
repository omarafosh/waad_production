package com.waad.tba.modules.member.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.enums.OrganizationType;
import com.waad.tba.common.excel.service.ExcelParserService;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.dto.MemberCreateDto;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto.ImportValidationErrorDto;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto.MemberImportRowDto;
import com.waad.tba.modules.member.dto.MemberImportResultDto;
import com.waad.tba.modules.member.dto.MemberImportResultDto.ImportErrorDetailDto;
import com.waad.tba.modules.member.dto.MemberViewDto;
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
import com.waad.tba.modules.member.service.BarcodeGeneratorService;
import com.waad.tba.modules.member.service.ExcelColumnMappingService;
import com.waad.tba.modules.member.service.MemberExcelImportService;
import com.waad.tba.modules.member.service.UnifiedMemberService;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.security.AuthorizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * تنفيذ خدمة استيراد الأعضاء من ملفات Excel.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberExcelImportServiceImpl implements MemberExcelImportService {

    private final MemberRepository memberRepository;
    private final MemberAttributeRepository attributeRepository;
    private final MemberImportLogRepository importLogRepository;
    private final MemberImportErrorRepository importErrorRepository;
    private final BenefitPolicyRepository benefitPolicyRepository;
    private final OrganizationRepository organizationRepository;
    private final AuthorizationService authorizationService;
    private final ObjectMapper objectMapper;
    private final BarcodeGeneratorService barcodeGeneratorService;
    private final ExcelParserService parserService; // واجهة الآن
    private final UnifiedMemberService unifiedMemberService;
    private final ExcelColumnMappingService columnMappingService;

    private MemberExcelImportServiceImpl self;

    @Autowired
    public void setSelf(@Lazy MemberExcelImportServiceImpl self) {
        this.self = self;
    }

    private static final List<String[]> MANDATORY_COLUMNS = List.of(
            new String[] {
                    "full_name", "name", "fullname", "member_name",
                    "الاسم الكامل", "الاسم", "اسم الموظف", "اسم العضو",
                    "الاسم الثلاثي", "الاسم الرباعي", "اسم المؤمن عليه"
            },
            new String[] {
                    "جهة العمل", "employer", "company", "company_id", "company_name", "employer_name",
                    "work_company", "organization", "employer_code",
                    "الشركة", "اسم الشركة", "المؤسسة", "جهة الانتساب",
                    "صاحب العمل", "الجهة", "مكان العمل", "كود الجهة"
            });

    private static final Map<String, String[]> OPTIONAL_FIELD_MAPPINGS = Map.ofEntries(
            Map.entry("civilId", new String[] {
                    "national_id", "identification_id", "civil_id", "civilid", "national_number",
                    "id_number", "identity_number",
                    "الرقم الوطني", "رقم الهوية", "الرقم المدني", "رقم البطاقة الشخصية", "رقم الهوية الوطنية"
            }),
            Map.entry("cardNumber", new String[] {
                    "card_number", "cardnumber", "card number", "member_no", "member_number",
                    "insurance_no", "insurance_number", "membership_no", "membership_number",
                    "barcode", "badge_id", "employee_id",
                    "رقم البطاقة", "رقم العضوية", "رقم التأمين", "رقم العضو", "رقم بطاقة التأمين",
                    "الباركود", "رقم الشارة"
            }),
            Map.entry("birthDate", new String[] {
                    "birth_date", "birthday", "dob", "date_of_birth", "birthdate",
                    "تاريخ الميلاد", "تاريخ الولادة", "الميلاد"
            }),
            Map.entry("gender", new String[] {
                    "gender", "sex", "الجنس", "النوع"
            }),
            Map.entry("phone", new String[] {
                    "phone", "mobile", "mobile_phone", "work_phone", "phone_number",
                    "telephone", "tel", "cell", "cellphone",
                    "الهاتف", "الجوال", "رقم الهاتف", "رقم الجوال", "هاتف العمل", "الموبايل", "رقم التواصل"
            }),
            Map.entry("email", new String[] {
                    "email", "work_email", "email_address", "e_mail", "البريد الإلكتروني", "الإيميل", "البريد"
            }),
            Map.entry("nationality", new String[] {
                    "nationality", "country", "country_id", "الجنسية", "البلد"
            }),
            Map.entry("employeeNumber", new String[] {
                    "employee_number", "employee_id", "badge_id", "barcode", "emp_no",
                    "employee_code", "staff_id", "رقم الموظف", "الرقم الوظيفي", "رقم العمل", "كود الموظف"
            }),
            Map.entry("address", new String[] {
                    "address", "home_address", "street", "location", "العنوان", "عنوان السكن", "الموقع"
            }),
            Map.entry("maritalStatus", new String[] {
                    "marital_status", "marital", "status_marital", "الحالة الاجتماعية", "الحالة الزوجية"
            }));

    private static final Map<String, String[]> ATTRIBUTE_MAPPINGS = Map.ofEntries(
            Map.entry("job_title", new String[] {
                    "job_title", "job_id", "job", "position", "title", "job_position",
                    "الوظيفة", "المسمى الوظيفي", "المنصب", "الدرجة الوظيفية"
            }),
            Map.entry("department", new String[] {
                    "department", "department_id", "dept", "division", "section",
                    "القسم", "الإدارة", "الوحدة", "الفرع"
            }),
            Map.entry("work_location", new String[] {
                    "work_location", "work_location_id", "location", "office", "branch",
                    "موقع العمل", "مكان العمل", "الفرع", "المكتب"
            }),
            Map.entry("grade", new String[] {
                    "grade", "x_grade", "level", "rank", "class",
                    "الدرجة", "المستوى", "الرتبة", "الفئة"
            }),
            Map.entry("manager", new String[] {
                    "manager", "parent_id", "manager_name", "supervisor", "direct_manager",
                    "المدير", "المسؤول", "المدير المباشر"
            }),
            Map.entry("cost_center", new String[] {
                    "cost_center", "x_cost_center", "cost_code", "مركز التكلفة", "رمز التكلفة"
            }),
            Map.entry("start_date", new String[] {
                    "start_date", "join_date", "hire_date", "employment_date",
                    "تاريخ البداية", "تاريخ الالتحاق", "تاريخ التعيين"
            }),
            Map.entry("end_date", new String[] {
                    "end_date", "termination_date", "leave_date", "تاريخ النهاية", "تاريخ الانتهاء"
            }),
            Map.entry("benefit_class", new String[] {
                    "benefit_class", "class", "coverage_class", "plan_class",
                    "فئة المنافع", "فئة التغطية", "الفئة"
            }),
            Map.entry("notes", new String[] {
                    "notes", "remarks", "comment", "comments", "ملاحظات", "تعليقات"
            }));

    @Override
    @Transactional(readOnly = true)
    public MemberImportPreviewDto parseAndPreview(MultipartFile file) throws Exception {
        return parseAndPreview(file, (String) null, 0);
    }

    @Override
    @Transactional(readOnly = true)
    public MemberImportPreviewDto parseAndPreview(MultipartFile file, Map<String, String> customMappings) throws Exception {
        String json = null;
        if (customMappings != null) {
            json = objectMapper.writeValueAsString(customMappings);
        }
        return parseAndPreview(file, json, 0);
    }

    @Override
    @Transactional(readOnly = true)
    public MemberImportPreviewDto parseAndPreview(MultipartFile file, String customMappingsJson, Integer headerRowNumber) throws Exception {
        log.info("📊 Parsing Excel file for preview: {} (headerRow: {})", file.getOriginalFilename(), headerRowNumber);

        int hRow = headerRowNumber != null ? headerRowNumber : 0;
        String batchId = UUID.randomUUID().toString();
        List<MemberImportRowDto> previewRows = new ArrayList<>();
        List<ImportValidationErrorDto> validationErrors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        Map<String, String> columnMappings = new LinkedHashMap<>();
        List<String> detectedColumns = new ArrayList<>();

        Map<String, String> customMappings = null;
        if (customMappingsJson != null && !customMappingsJson.isBlank()) {
            try {
                customMappings = objectMapper.readValue(customMappingsJson, new com.fasterxml.jackson.core.type.TypeReference<Map<String, String>>() {});
            } catch (Exception e) {
                log.warn("Failed to parse custom mappings JSON");
            }
        }

        int newCount = 0;
        int errorCount = 0;
        int warningCount = 0;

        try (Workbook workbook = parserService.openWorkbook(file)) {
            Sheet sheet = parserService.getDataSheet(workbook);
            int totalRows = sheet.getLastRowNum();

            Row headerRow = sheet.getRow(hRow);
            if (headerRow == null) {
                throw new BusinessRuleException("Excel file has no header row at row " + hRow);
            }

            Map<Integer, String> columnIndexToName = new HashMap<>();
            Map<String, Integer> fieldToColumnIndex = new HashMap<>();

            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                String colName = parserService.getCellValueAsString(cell);
                if (colName == null) colName = "";
                columnIndexToName.put(i, colName.trim().toLowerCase());
                detectedColumns.add(colName.trim());
            }

            if (customMappings != null && !customMappings.isEmpty()) {
                for (Map.Entry<String, String> entry : customMappings.entrySet()) {
                    String excelColumn = entry.getKey().trim().toLowerCase();
                    String systemField = entry.getValue();
                    Integer columnIndex = parserService.findColumnIndex(headerRow, excelColumn);
                    if (columnIndex != null) {
                        fieldToColumnIndex.put(systemField, columnIndex);
                        columnMappings.put(excelColumn, systemField);
                    }
                }
            } else {
                for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                    mapColumnToField(columnIndexToName.get(i), i, fieldToColumnIndex, columnMappings);
                }
            }

            validateMandatoryColumns(fieldToColumnIndex, validationErrors);

            int previewLimit = Math.min(totalRows, 50);
            Set<String> seenCardNumbers = new HashSet<>();
            List<Organization> allEmployers = organizationRepository.findAll();
            Map<String, Long> normalizedEmployerMap = new HashMap<>();
            for (Organization org : allEmployers) {
                if (org.getName() != null) normalizedEmployerMap.put(normalizeArabicText(org.getName()), org.getId());
                if (org.getCode() != null) normalizedEmployerMap.put(org.getCode().toLowerCase().trim(), org.getId());
            }

            for (int rowNum = hRow + 1; rowNum <= totalRows; rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || parserService.isEmptyRow(row)) continue;

                MemberImportRowDto rowDto = parseRow(row, rowNum, fieldToColumnIndex, columnIndexToName, validationErrors, seenCardNumbers, normalizedEmployerMap);
                boolean hasErrors = rowDto.getErrors() != null && !rowDto.getErrors().isEmpty();
                boolean hasWarnings = rowDto.getWarnings() != null && !rowDto.getWarnings().isEmpty();

                if (hasErrors) {
                    rowDto.setStatus("ERROR");
                    errorCount++;
                } else {
                    rowDto.setStatus(hasWarnings ? "WARNING" : "NEW");
                    newCount++;
                    if (hasWarnings) warningCount++;
                }

                if (rowNum <= previewLimit) previewRows.add(rowDto);
            }

            if (totalRows > previewLimit) warnings.add(String.format("عرض أول %d صف من إجمالي %d صف", previewLimit, totalRows));
            if (warningCount > 0) warnings.add(String.format("%d صف بها تحذيرات - ستُستورد مع ملاحظات", warningCount));
            if (errorCount > 0) warnings.add(String.format("%d صف بها أخطاء - سيتم تخطيها", errorCount));

            List<MemberImportPreviewDto.EmployerOptionDto> employerOptions = allEmployers.stream()
                    .map(e -> MemberImportPreviewDto.EmployerOptionDto.builder().id(e.getId()).code(e.getCode()).nameAr(e.getName()).active(e.isActive()).build())
                    .toList();

            List<BenefitPolicy> allPolicies = benefitPolicyRepository.findAll();
            List<MemberImportPreviewDto.BenefitPolicyOptionDto> policyOptions = allPolicies.stream()
                    .map(p -> MemberImportPreviewDto.BenefitPolicyOptionDto.builder().id(p.getId()).policyNumber(p.getPolicyCode()).nameAr(p.getName()).nameEn(p.getName()).employerId(p.getEmployerOrganization() != null ? p.getEmployerOrganization().getId() : null).isActive(p.getStatus() == BenefitPolicy.BenefitPolicyStatus.ACTIVE).build())
                    .toList();

            return MemberImportPreviewDto.builder().batchId(batchId).fileName(file.getOriginalFilename()).totalRows(totalRows).newCount(newCount).updateCount(0).warningCount(warningCount).errorCount(errorCount).detectedColumns(detectedColumns).columnMappings(columnMappings).previewRows(previewRows).validationErrors(validationErrors).canProceed(newCount > 0).matchKeyUsed("CARD_NUMBER").warnings(warnings).availableEmployers(employerOptions).availableBenefitPolicies(policyOptions).build();
        }
    }

    @Override
    @Transactional
    public void executeImport(File file, String batchId, Long employerId, Long benefitPolicyId, String username, Long userId) throws Exception {
        executeImport(file, batchId, employerId, benefitPolicyId, 0, username, userId);
    }

    @Override
    @Transactional
    public void executeImport(File file, String batchId, Long employerId, Long benefitPolicyId, Integer headerRowNumber, String username, Long userId) throws Exception {
        executeImport(file, batchId, employerId, benefitPolicyId, headerRowNumber, "UPDATE", username, userId);
    }

    @Override
    @Async
    @Transactional
    public void executeImport(File file, String batchId, Long employerId, Long benefitPolicyId, Integer headerRowNumber, String importPolicy, String username, Long userId) throws Exception {
        log.info("🚀 Starting async import task for batch: {}", batchId);
        int hRow = headerRowNumber != null ? headerRowNumber : 0;
        
        try {
            if (file == null || !file.exists()) throw new IllegalArgumentException("الملف غير موجود");
            MemberImportLog importLog = self.createImportLog(batchId, file.getName(), file.length(), username, userId);
            try { barcodeGeneratorService.ensureSequencesExist(); } catch (Exception e) {}

            try (Workbook workbook = parserService.openWorkbook(file)) {
                Sheet sheet = parserService.getDataSheet(workbook);
                int totalRows = sheet.getLastRowNum();
                int rowsToProcess = Math.max(0, totalRows - hRow);
                self.updateImportProgress(batchId, MemberImportLog.ImportStatus.PROCESSING, rowsToProcess, 0, 0, 0, 0, 0);

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

                Map<String, Long> employerNameCache = new HashMap<>();
                Map<String, Long> normalizedEmployerMap = new HashMap<>();
                List<Organization> allEmployers = organizationRepository.findAll();
                for (Organization org : allEmployers) {
                    if (org.getName() != null) normalizedEmployerMap.put(normalizeArabicText(org.getName()), org.getId());
                    if (org.getCode() != null) normalizedEmployerMap.put(org.getCode().toLowerCase().trim(), org.getId());
                }

                Map<String, Member> nationalNumberMap = new HashMap<>(); 
                Map<String, Member> employeeNumberMap = new HashMap<>();
                Map<String, Member> normalizedNameMap = new HashMap<>();
                List<Member> allActiveMembers = memberRepository.findByActiveTrue();
                for (Member m : allActiveMembers) {
                    if (m.getCivilId() != null) nationalNumberMap.put(m.getCivilId(), m);
                    if (m.getEmployeeNumber() != null) employeeNumberMap.put(m.getEmployeeNumber(), m);
                    if (m.getFullName() != null) normalizedNameMap.put(normalizeArabicText(m.getFullName()), m);
                }

                int totalProcessed = 0, createdCount = 0, updatedCount = 0, skippedCount = 0, errorCount = 0;

                for (int rowNum = hRow + 1; rowNum <= totalRows; rowNum++) {
                    Row row = sheet.getRow(rowNum);
                    if (row == null || parserService.isEmptyRow(row)) { skippedCount++; continue; }
                    totalProcessed++;

                    if (totalProcessed % 20 == 0 || totalProcessed == rowsToProcess) {
                        self.updateImportProgress(batchId, MemberImportLog.ImportStatus.PROCESSING, rowsToProcess, totalProcessed, createdCount, updatedCount, skippedCount, errorCount);
                    }

                    try {
                        ImportRowResult result = self.processRow(row, rowNum, fieldToColumnIndex, columnIndexToName, importLog.getId(), employerId, benefitPolicyId, importPolicy, nationalNumberMap, employeeNumberMap, normalizedNameMap, employerNameCache, normalizedEmployerMap);
                        if (result.isCreated()) createdCount++;
                        else if (result.isUpdated()) updatedCount++;
                        else if (result.isSkipped()) skippedCount++;
                    } catch (Exception e) {
                        errorCount++;
                        self.saveImportError(importLog.getId(), rowNum, e.getMessage(), rowToJson(row, columnIndexToName));
                    }
                }

                self.updateImportProgress(batchId, errorCount > 0 ? MemberImportLog.ImportStatus.PARTIAL : MemberImportLog.ImportStatus.COMPLETED, rowsToProcess, totalProcessed, createdCount, updatedCount, skippedCount, errorCount);
            }
        } catch (Exception e) {
            log.error("❌ Fatal failure in background import batch {}", batchId, e);
            self.markImportAsFailed(batchId, e.getMessage());
            throw e;
        } finally {
            if (file != null && file.exists()) file.delete();
        }
    }

    @Override
    public File saveToTempFile(MultipartFile file) throws Exception {
        Path tempPath = Files.createTempFile("import_" + UUID.randomUUID(), ".xlsx");
        try (InputStream is = file.getInputStream()) {
            Files.copy(is, tempPath, StandardCopyOption.REPLACE_EXISTING);
        }
        return tempPath.toFile();
    }

    @Override
    @Transactional(readOnly = true)
    public MemberImportLog getImportLog(String batchId) {
        return importLogRepository.findByImportBatchId(batchId).orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemberImportResultDto.ImportErrorDetailDto> getImportErrors(String batchId) {
        Optional<MemberImportLog> logOpt = importLogRepository.findByImportBatchId(batchId);
        if (logOpt.isEmpty()) return new ArrayList<>();
        return importErrorRepository.findByImportLogId(logOpt.get().getId()).stream().map(e -> (MemberImportResultDto.ImportErrorDetailDto) MemberImportResultDto.ImportErrorDetailDto.builder().rowNumber(e.getRowNumber()).errorType(e.getErrorType() != null ? e.getErrorType().name() : "UNKNOWN").messageAr(e.getErrorMessage()).message(e.getErrorMessage()).build()).toList();
    }

    // --- Helpers ---

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public MemberImportLog createImportLog(String batchId, String fileName, long fileSize, String username, Long userId) {
        MemberImportLog importLog = MemberImportLog.builder().importBatchId(batchId).fileName(fileName).fileSizeBytes(fileSize).status(ImportStatus.VALIDATING).importedByUserId(userId).importedByUsername(username != null ? username : "system").build();
        importLog.markStarted();
        return importLogRepository.save(importLog);
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
    public void markImportAsFailed(String batchId, String errorMessage) {
        importLogRepository.findByImportBatchId(batchId).ifPresent(l -> {
            l.setStatus(ImportStatus.FAILED);
            l.setErrorMessage(errorMessage);
            l.setCompletedAt(LocalDateTime.now());
            importLogRepository.saveAndFlush(l);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void saveImportError(Long logId, int rowNum, String message, String rowData) {
        importLogRepository.findById(logId).ifPresent(l -> {
            importErrorRepository.save(MemberImportError.systemError(l, rowNum, message, rowData));
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ImportRowResult processRow(Row row, int rowNum, Map<String, Integer> fieldToColumnIndex, Map<Integer, String> columnIndexToName, Long importLogId, Long globalEmployerId, Long benefitPolicyId, String importPolicy, Map<String, Member> nationalNumberMap, Map<String, Member> employeeNumberMap, Map<String, Member> normalizedNameMap, Map<String, Long> employerNameCache, Map<String, Long> normalizedEmployerMap) {
        Long effectiveEmployerId = globalEmployerId;
        Organization employerOrg = null;

        if (effectiveEmployerId != null) {
            employerOrg = organizationRepository.findById(effectiveEmployerId).orElse(null);
        } else {
            String empName = getFieldValue(row, fieldToColumnIndex, "employer");
            if (empName == null || empName.isBlank()) { saveImportError(importLogId, rowNum, "Missing Employer", rowToJson(row, columnIndexToName)); return ImportRowResult.skipped(); }
            String empKey = empName.trim().toLowerCase();
            Long cachedId = employerNameCache.get(empKey);
            if (cachedId != null) { employerOrg = organizationRepository.findById(cachedId).orElse(null); effectiveEmployerId = cachedId; }
            else {
                List<Organization> matches = organizationRepository.searchActive(empName);
                if (!matches.isEmpty()) { employerOrg = matches.get(0); effectiveEmployerId = employerOrg.getId(); employerNameCache.put(empKey, effectiveEmployerId); }
                else {
                    Long fuzzyId = normalizedEmployerMap.get(normalizeArabicText(empName));
                    if (fuzzyId != null) { effectiveEmployerId = fuzzyId; employerOrg = organizationRepository.findById(fuzzyId).orElse(null); employerNameCache.put(empKey, effectiveEmployerId); }
                    else { saveImportError(importLogId, rowNum, "Employer not found: " + empName, rowToJson(row, columnIndexToName)); return ImportRowResult.skipped(); }
                }
            }
        }

        if (employerOrg == null) { saveImportError(importLogId, rowNum, "Invalid Employer", rowToJson(row, columnIndexToName)); return ImportRowResult.skipped(); }

        String fullName = getFieldValue(row, fieldToColumnIndex, "fullName");
        String civilId = getFieldValue(row, fieldToColumnIndex, "civilId");
        if (fullName == null || fullName.isBlank()) return ImportRowResult.skipped();

        Member existingMember = null;
        if (civilId != null && !civilId.isBlank()) existingMember = nationalNumberMap.get(civilId);
        if (existingMember == null) {
            String empNo = getFieldValue(row, fieldToColumnIndex, "employeeNumber");
            if (empNo != null && !empNo.isBlank()) existingMember = employeeNumberMap.get(empNo);
        }
        if (existingMember == null) existingMember = normalizedNameMap.get(normalizeArabicText(fullName));

        if (existingMember == null && globalEmployerId == null) {
            if (civilId != null && !civilId.isBlank()) {
                List<Member> m = memberRepository.findByCivilIdAndEmployerOrganizationId(civilId, effectiveEmployerId);
                if (!m.isEmpty()) existingMember = m.get(0);
            }
            if (existingMember == null) {
                String empNo = getFieldValue(row, fieldToColumnIndex, "employeeNumber");
                if (empNo != null && !empNo.isBlank()) {
                    List<Member> m = memberRepository.findByEmployeeNumberAndEmployerOrganizationId(empNo, effectiveEmployerId);
                    if (!m.isEmpty()) existingMember = m.get(0);
                }
            }
            if (existingMember == null) existingMember = normalizedNameMap.get(normalizeArabicText(fullName));
        }

        Member member;
        boolean isUpdate = false;
        if (existingMember != null) {
            if ("SKIP".equalsIgnoreCase(importPolicy)) return ImportRowResult.skipped();
            member = existingMember; member.setFullName(fullName);
            if (member.getEmployerOrganization() == null || !member.getEmployerOrganization().getId().equals(employerOrg.getId())) member.setEmployerOrganization(employerOrg);
            isUpdate = true;
        } else {
            MemberCreateDto dto = MemberCreateDto.builder().fullName(fullName).employerId(effectiveEmployerId).benefitPolicyId(benefitPolicyId).status(MemberStatus.ACTIVE).cardStatus(Member.CardStatus.ACTIVE).active(true).employeeNumber(getFieldValue(row, fieldToColumnIndex, "employeeNumber")).civilId(civilId).phone(getFieldValue(row, fieldToColumnIndex, "phone")).email(getFieldValue(row, fieldToColumnIndex, "email")).build();
            String manualCard = getFieldValue(row, fieldToColumnIndex, "cardNumber");
            if (manualCard != null && !manualCard.isBlank()) dto.setCardNumber(manualCard);
            MemberViewDto created = unifiedMemberService.createPrincipalMember(dto);
            member = memberRepository.findById(created.getId()).orElseThrow(() -> new RuntimeException("Reload failed"));
        }

        if (isUpdate) {
            String p = getFieldValue(row, fieldToColumnIndex, "phone"); if (p != null) member.setPhone(p);
            String e = getFieldValue(row, fieldToColumnIndex, "email"); if (e != null) member.setEmail(e);
            if (civilId != null) member.setCivilId(civilId);
            String en = getFieldValue(row, fieldToColumnIndex, "employeeNumber"); if (en != null) member.setEmployeeNumber(en);
        }

        String bd = getFieldValue(row, fieldToColumnIndex, "birthDate"); if (bd != null) { try { member.setBirthDate(parseDate(bd)); } catch (Exception e) {} }
        String g = getFieldValue(row, fieldToColumnIndex, "gender"); if (g != null) { try { member.setGender(parseGender(g)); } catch (Exception e) {} }

        saveAttributeIfExists(member, "job_title", getFieldValue(row, fieldToColumnIndex, "jobTitle"));
        saveAttributeIfExists(member, "department", getFieldValue(row, fieldToColumnIndex, "department"));

        memberRepository.save(member);
        return isUpdate ? ImportRowResult.updated() : ImportRowResult.created();
    }

    private void saveAttributeIfExists(Member member, String code, String value) {
        if (value != null && !value.isBlank()) {
            member.getAttributes().add(MemberAttribute.builder().member(member).attributeCode(code).attributeValue(value).source(AttributeSource.IMPORT).build());
        }
    }

    private String getFieldValue(Row row, Map<String, Integer> fieldToColumnIndex, String field) {
        Integer idx = fieldToColumnIndex.get(field);
        return idx == null ? null : parserService.getCellValueAsString(row.getCell(idx));
    }

    private void mapColumnToField(String colName, int index, Map<String, Integer> fieldToColumnIndex, Map<String, String> columnMappings) {
        String base = colName.replace("\uFEFF", "").replace('\u00A0', ' ').replace('\u200B', ' ').trim();
        Set<String> candidates = new LinkedHashSet<>(); candidates.add(base);
        for (String l : base.split("[\\r\\n]+")) candidates.add(l.trim());
        List<String> raw = new ArrayList<>(candidates);
        for (String c : raw) { if (c.contains("*")) candidates.add(c.replace("*", "").trim()); String dc = c.replaceAll("[*\\(\\):\\-_]", " ").replaceAll("\\s+", " ").trim(); if (!dc.isEmpty()) candidates.add(dc); }

        for (int i = 0; i < MANDATORY_COLUMNS.size(); i++) {
            String f = i == 0 ? "fullName" : "employer";
            for (String v : MANDATORY_COLUMNS.get(i)) {
                for (String c : candidates) {
                    if (c.equalsIgnoreCase(v) || normalizeArabicText(c).equals(normalizeArabicText(v))) { fieldToColumnIndex.put(f, index); columnMappings.put(colName, f); return; }
                }
            }
        }
        for (Map.Entry<String, String[]> entry : OPTIONAL_FIELD_MAPPINGS.entrySet()) {
            for (String v : entry.getValue()) {
                for (String c : candidates) {
                    if (c.equalsIgnoreCase(v) || normalizeArabicText(c).equals(normalizeArabicText(v))) { fieldToColumnIndex.put(entry.getKey(), index); columnMappings.put(colName, entry.getKey()); return; }
                }
            }
        }
        String normalized = base.replace("*", "").trim().replaceAll("[^a-z0-9_]", "_").replaceAll("_+", "_");
        if (!normalized.isBlank()) { fieldToColumnIndex.put("attr:" + normalized, index); columnMappings.put(colName, "attribute:" + normalized); }
    }

    private void validateMandatoryColumns(Map<String, Integer> fieldToColumnIndex, List<ImportValidationErrorDto> errors) {
        if (!fieldToColumnIndex.containsKey("fullName")) {
            errors.add(ImportValidationErrorDto.builder().rowNumber(0).field("header").message("Missing mandatory column: full_name").build());
        }
    }

    private MemberImportRowDto parseRow(Row row, int rowNum, Map<String, Integer> fieldToColumnIndex, Map<Integer, String> columnIndexToName, List<ImportValidationErrorDto> validationErrors, Set<String> seenCardNumbers, Map<String, Long> normalizedEmployerMap) {
        String cn = getFieldValue(row, fieldToColumnIndex, "cardNumber");
        String fn = getFieldValue(row, fieldToColumnIndex, "fullName");
        String en = getFieldValue(row, fieldToColumnIndex, "employer");
        String ci = getFieldValue(row, fieldToColumnIndex, "civilId");

        List<String> errs = new ArrayList<>(), warns = new ArrayList<>();
        boolean hasError = false, hasWarning = false;

        if (fn == null || fn.isBlank()) { errs.add("الاسم الكامل مطلوب"); validationErrors.add(ImportValidationErrorDto.builder().rowNumber(rowNum).field("full_name").message("الاسم الكامل مطلوب").severity("ERROR").build()); hasError = true; }
        if (en == null || en.isBlank()) { errs.add("جهة العمل مطلوبة"); validationErrors.add(ImportValidationErrorDto.builder().rowNumber(rowNum).field("employer").message("جهة العمل مطلوبة").severity("ERROR").build()); hasError = true; }
        else if (normalizedEmployerMap.get(normalizeArabicText(en)) == null && organizationRepository.searchActive(en).isEmpty()) {
            warns.add("جهة العمل غير موجودة: " + en); validationErrors.add(ImportValidationErrorDto.builder().rowNumber(rowNum).field("employer").value(en).message("جهة العمل غير موجودة").severity("WARNING").build()); hasWarning = true;
        }

        if (cn != null && !cn.isBlank()) { if (seenCardNumbers.contains(cn)) { warns.add("رقم بطاقة مكرر: " + cn); validationErrors.add(ImportValidationErrorDto.builder().rowNumber(rowNum).field("card_number").value(cn).message("رقم بطاقة مكرر").severity("WARNING").build()); hasWarning = true; } else seenCardNumbers.add(cn); }

        Map<String, String> attrs = new HashMap<>();
        for (Map.Entry<String, Integer> e : fieldToColumnIndex.entrySet()) { if (e.getKey().startsWith("attr:")) { String v = parserService.getCellValueAsString(row.getCell(e.getValue())); if (v != null && !v.isBlank()) attrs.put(e.getKey().substring(5), v); } }

        return MemberImportRowDto.builder().rowNumber(rowNum).cardNumber(cn).fullName(fn).civilId(ci).employerName(en).attributes(attrs).status(hasError ? "ERROR" : hasWarning ? "WARNING" : "NEW").errors(errs).warnings(warns).build();
    }

    private Gender parseGender(String value) {
        if (value == null || value.isBlank()) return Gender.UNDEFINED;
        String v = value.toLowerCase().trim();
        if (v.contains("male") || v.contains("ذكر") || v.equals("m")) return Gender.MALE;
        if (v.contains("female") || v.contains("أنثى") || v.equals("f")) return Gender.FEMALE;
        return Gender.UNDEFINED;
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try { return LocalDate.parse(value); }
        catch (Exception e1) {
            try {
                String[] p = value.split("[/\\-]");
                if (p.length == 3) {
                    int d = Integer.parseInt(p[0]), m = Integer.parseInt(p[1]), y = Integer.parseInt(p[2]);
                    if (y < 100) y += 2000;
                    return LocalDate.of(y, m, d);
                }
            } catch (Exception e2) {}
        }
        return null;
    }

    private String rowToJson(Row row, Map<Integer, String> columnIndexToName) {
        Map<String, String> data = new HashMap<>();
        for (Map.Entry<Integer, String> e : columnIndexToName.entrySet()) {
            String v = parserService.getCellValueAsString(row.getCell(e.getKey()));
            if (v != null) data.put(e.getValue(), v);
        }
        try { return objectMapper.writeValueAsString(data); } catch (Exception e) { return "{}"; }
    }

    private String normalizeArabicText(String text) {
        if (text == null) return "";
        String n = text.replace("\uFEFF", "").replace('\u00A0', ' ').replace('\u200B', ' ').replace("\u0640", "").trim().replaceAll("\\s+", " ");
        n = n.replace('\u0623', '\u0627').replace('\u0625', '\u0627').replace('\u0622', '\u0627').replace('\u0629', '\u0647').replace('\u0649', '\u064A').replace('\u06CC', '\u064A').replace('\u06A9', '\u0643');
        n = n.replaceAll("[\u064B-\u0652\u0653\u0654\u0655\u0670]", "").replace('\u0671', '\u0627');
        return n.toLowerCase().trim();
    }

    public static class ImportRowResult {
        private final boolean created;
        private final boolean updated;
        private final boolean skipped;
        public ImportRowResult(boolean created, boolean updated, boolean skipped) { this.created = created; this.updated = updated; this.skipped = skipped; }
        public static ImportRowResult created() { return new ImportRowResult(true, false, false); }
        public static ImportRowResult updated() { return new ImportRowResult(false, true, false); }
        public static ImportRowResult skipped() { return new ImportRowResult(false, false, true); }
        public boolean isCreated() { return created; }
        public boolean isUpdated() { return updated; }
        public boolean isSkipped() { return skipped; }
    }
}
