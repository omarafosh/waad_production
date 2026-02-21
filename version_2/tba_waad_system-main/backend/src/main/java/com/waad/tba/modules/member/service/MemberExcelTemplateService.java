package com.waad.tba.modules.member.service;

import com.waad.tba.common.excel.dto.ExcelImportResult;
import com.waad.tba.common.excel.dto.ExcelImportResult.ImportError;
import com.waad.tba.common.excel.dto.ExcelImportResult.ImportError.ErrorType;
import com.waad.tba.common.excel.dto.ExcelImportResult.ImportSummary;
import com.waad.tba.common.excel.dto.ExcelLookupData;
import com.waad.tba.common.excel.dto.ExcelTemplateColumn;
import com.waad.tba.common.excel.dto.ExcelTemplateColumn.ColumnType;
import com.waad.tba.common.excel.service.ExcelParserService;
import com.waad.tba.common.excel.service.ExcelTemplateService;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.employer.entity.Employer;
import com.waad.tba.modules.employer.repository.EmployerRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.entity.Member.Gender;
import com.waad.tba.modules.member.entity.Member.MemberStatus;
import com.waad.tba.modules.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Members Excel Template Generator and Import Service
 * 
 * STRICT RULES:
 * - Templates MUST be downloaded from system
 * - Create-only mode (no updates in Phase 1)
 * - Card number is auto-generated (NEVER from Excel)
 * - Employer lookup is MANDATORY
 * - Civil ID is optional and non-unique
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberExcelTemplateService {
    
    private final ExcelTemplateService templateService;
    private final ExcelParserService parserService;
    private final MemberRepository memberRepository;
    private final EmployerRepository employerRepository;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TEMPLATE GENERATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Generate Members import template
     */
    public byte[] generateTemplate() throws IOException {
        log.info("[MemberTemplate] Generating Excel template");
        
        List<ExcelTemplateColumn> columns = buildColumnDefinitions();
        List<ExcelLookupData> lookups = buildLookupSheets();
        
        return templateService.generateTemplate("Members / الأعضاء", columns, lookups);
    }
    
    private List<ExcelTemplateColumn> buildColumnDefinitions() {
        return List.of(
            // Mandatory Fields
            ExcelTemplateColumn.builder()
                .name("full_name")
                .nameAr("الاسم الكامل")
                .type(ColumnType.TEXT)
                .required(true)
                .example("أحمد محمد علي")
                .description("Full name in Arabic (mandatory)")
                .descriptionAr("الاسم الكامل بالعربية (إجباري)")
                .width(25)
                .build(),
                
            ExcelTemplateColumn.builder()
                .name("employer")
                .nameAr("جهة العمل")
                .type(ColumnType.TEXT)
                .required(true)
                .example("شركة النفط الليبية")
                .description("Employer name (must match lookup sheet)")
                .descriptionAr("اسم جهة العمل (يجب أن يطابق ورقة البحث)")
                .width(30)
                .build(),
                
            ExcelTemplateColumn.builder()
                .name("birth_date")
                .nameAr("تاريخ الميلاد")
                .type(ColumnType.DATE)
                .required(false) // Changed to false (Optional)
                .example("1990-01-15")
                .description("Birth date (YYYY-MM-DD format) - Optional")
                .descriptionAr("تاريخ الميلاد (صيغة: سنة-شهر-يوم) - اختياري")
                .width(15)
                .build(),
                
            ExcelTemplateColumn.builder()
                .name("gender")
                .nameAr("الجنس")
                .type(ColumnType.ENUM)
                .required(false) // Changed to false (Optional)
                .allowedValues(Arrays.asList("MALE", "FEMALE", "ذكر", "أنثى"))
                .example("MALE")
                .description("Gender (MALE/FEMALE) - Optional")
                .descriptionAr("الجنس (ذكر/أنثى) - اختياري")
                .width(12)
                .build(),
                
            // Optional Fields
            ExcelTemplateColumn.builder()
                .name("civil_id")
                .nameAr("الرقم الوطني")
                .type(ColumnType.TEXT)
                .required(false)
                .example("123456789012")
                .description("National ID / Civil ID (optional)")
                .descriptionAr("الرقم الوطني (اختياري)")
                .width(18)
                .build(),
                
            ExcelTemplateColumn.builder()
                .name("phone")
                .nameAr("رقم الهاتف")
                .type(ColumnType.TEXT)
                .required(false)
                .example("0912345678")
                .description("Phone number")
                .descriptionAr("رقم الهاتف")
                .width(15)
                .build(),
                
            ExcelTemplateColumn.builder()
                .name("email")
                .nameAr("البريد الإلكتروني")
                .type(ColumnType.TEXT)
                .required(false)
                .example("ahmed@example.com")
                .description("Email address")
                .descriptionAr("البريد الإلكتروني")
                .width(25)
                .build(),
                
            ExcelTemplateColumn.builder()
                .name("policy_number")
                .nameAr("رقم الوثيقة")
                .type(ColumnType.TEXT)
                .required(false)
                .example("POL-2025-001")
                .description("Policy number (optional)")
                .descriptionAr("رقم الوثيقة (اختياري)")
                .width(18)
                .build(),
                
            ExcelTemplateColumn.builder()
                .name("nationality")
                .nameAr("الجنسية")
                .type(ColumnType.TEXT)
                .required(false)
                .example("ليبي")
                .description("Nationality")
                .descriptionAr("الجنسية")
                .width(15)
                .build(),
                
            ExcelTemplateColumn.builder()
                .name("employee_number")
                .nameAr("الرقم الوظيفي")
                .type(ColumnType.TEXT)
                .required(false)
                .example("EMP-001")
                .description("Employee number")
                .descriptionAr("الرقم الوظيفي")
                .width(15)
                .build()
        );
    }
    
    private List<ExcelLookupData> buildLookupSheets() {
        // Fetch all employers
        List<Employer> employers = employerRepository.findByActiveTrue();
        
        List<List<String>> employerData = employers.stream()
            .map(emp -> Arrays.<String>asList(
                emp.getId().toString(),
                emp.getName() != null ? emp.getName() : ""
            ))
            .collect(Collectors.toList());
        
        ExcelLookupData employersLookup = ExcelLookupData.builder()
            .sheetName("Employers")
            .sheetNameAr("جهات العمل")
            .headers(Arrays.asList("ID", "Name"))
            .data(employerData)
            .description("List of valid employers - Use exact name from this sheet")
            .descriptionAr("قائمة جهات العمل الصالحة - استخدم الاسم المطابق تماماً من هذه الورقة")
            .build();
        
        return List.of(employersLookup);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // IMPORT PROCESSING
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Import members from Excel file (CREATE-ONLY)
     */
    // @Transactional - Removed to allow partial success (commit valid rows immediately)
    public ExcelImportResult importFromExcel(MultipartFile file) {
        log.info("[MemberImport] Starting import from file: {}", file.getOriginalFilename());
        
        ImportSummary summary = ImportSummary.builder().build();
        List<ImportError> errors = new ArrayList<>();
        
        try (Workbook workbook = parserService.openWorkbook(file)) {
            Sheet sheet = parserService.getDataSheet(workbook);
            
            // Find header row and column indices
            Row headerRow = sheet.getRow(0);
            Map<String, Integer> columnIndices = findColumnIndices(headerRow);
            
            // Validate mandatory columns
            validateMandatoryColumns(columnIndices, errors);
            if (!errors.isEmpty()) {
                // Return immediately if template is invalid, do not attempt to read data
                return buildErrorResult(summary, errors, "Mandatory columns missing");
            }
            
            // Build employer lookup map
            Map<String, Employer> employerLookup = buildEmployerLookup();
            
            // Process data rows (skip header row at index 0, example row at index 1)
            int firstDataRow = 2;
            int lastRow = sheet.getLastRowNum();
            summary.setTotalRows(lastRow - firstDataRow + 1);
            
            log.info("[MemberImport] Processing {} rows", summary.getTotalRows());
            
            for (int rowNum = firstDataRow; rowNum <= lastRow; rowNum++) {
                Row row = sheet.getRow(rowNum);
                
                if (parserService.isEmptyRow(row)) {
                    continue;
                }
                
                try {
                    Member member = parseAndCreateMember(row, rowNum, columnIndices, employerLookup, errors);
                    
                    if (member != null) {
                        memberRepository.save(member);
                        summary.setCreated(summary.getCreated() + 1);
                        log.debug("[MemberImport] Created member: {}", member.getCardNumber());
                    } else {
                        summary.setRejected(summary.getRejected() + 1);
                    }
                    
                } catch (Exception e) {
                    log.error("[MemberImport] Error processing row {}: {}", rowNum, e.getMessage());
                    errors.add(ImportError.builder()
                        .rowNumber(rowNum - 1) // Adjust for user-friendly numbering
                        .errorType(ErrorType.PROCESSING_ERROR)
                        .messageAr("خطأ في معالجة الصف")
                        .messageEn("Error processing row: " + e.getMessage())
                        .build());
                    summary.setFailed(summary.getFailed() + 1);
                }
            }
            
            String messageAr = String.format("تم إنشاء %d عضو، تم تخطي %d، فشل %d",
                summary.getCreated(), summary.getSkipped(), summary.getRejected() + summary.getFailed());
            String messageEn = String.format("Created %d members, skipped %d, failed %d",
                summary.getCreated(), summary.getSkipped(), summary.getRejected() + summary.getFailed());
            
            log.info("[MemberImport] Import completed: {}", messageEn);
            
            return ExcelImportResult.builder()
                .summary(summary)
                .errors(errors)
                .success(summary.getCreated() > 0)
                .messageAr(messageAr)
                .messageEn(messageEn)
                .build();
                
        } catch (IOException e) {
            log.error("[MemberImport] Failed to read Excel file", e);
            throw new BusinessRuleException("فشل قراءة ملف Excel: " + e.getMessage());
        } catch (Exception e) {
            log.error("[MemberImport] Import failed", e);
            throw new BusinessRuleException("فشل استيراد البيانات: " + e.getMessage());
        }
    }
    
    private Map<String, Integer> findColumnIndices(Row headerRow) {
        Map<String, Integer> indices = new HashMap<>();
        
        indices.put("full_name", parserService.findColumnIndex(headerRow, 
            "full_name", "الاسم الكامل", "name", "الاسم"));
        indices.put("employer", parserService.findColumnIndex(headerRow, 
            "employer", "جهة العمل", "company", "الشركة"));
        indices.put("birth_date", parserService.findColumnIndex(headerRow, 
            "birth_date", "تاريخ الميلاد", "dob", "الميلاد"));
        indices.put("gender", parserService.findColumnIndex(headerRow, 
            "gender", "الجنس", "sex"));
        indices.put("civil_id", parserService.findColumnIndex(headerRow, 
            "civil_id", "الرقم الوطني", "national_id"));
        indices.put("phone", parserService.findColumnIndex(headerRow, 
            "phone", "رقم الهاتف", "الهاتف", "mobile"));
        indices.put("email", parserService.findColumnIndex(headerRow, 
            "email", "البريد الإلكتروني"));
        indices.put("policy_number", parserService.findColumnIndex(headerRow, 
            "policy_number", "رقم الوثيقة"));
        indices.put("nationality", parserService.findColumnIndex(headerRow, 
            "nationality", "الجنسية"));
        indices.put("employee_number", parserService.findColumnIndex(headerRow, 
            "employee_number", "الرقم الوظيفي"));
        
        return indices;
    }
    
    private void validateMandatoryColumns(Map<String, Integer> columnIndices, List<ImportError> errors) {
        // RELAXED VALIDATION: Only truly MANDATORY columns are required
        // full_name and employer are the only truly mandatory fields
        // Other columns are optional and won't block import if missing
        String[] mandatoryColKeys = {
            "full_name", "employer"
        };
        
        List<String> missingMandatoryCols = new ArrayList<>();
        
        for (String col : mandatoryColKeys) {
            if (columnIndices.get(col) == null) {
                missingMandatoryCols.add(col);
            }
        }
        
        if (!missingMandatoryCols.isEmpty()) {
            errors.add(ImportError.builder()
                .rowNumber(0)
                .errorType(ErrorType.MISSING_REQUIRED)
                .columnName("TEMPLATE_HEADER")
                .messageAr("الأعمدة الإجبارية مفقودة: " + String.join(", ", missingMandatoryCols) + ". يجب وجود عمود الاسم الكامل وجهة العمل.")
                .messageEn("Missing mandatory columns: " + String.join(", ", missingMandatoryCols) + ". full_name and employer columns are required.")
                .build());
        }
        
        // Log warning for missing optional columns (but don't block import)
        String[] optionalColKeys = {
            "birth_date", "gender", "civil_id", "phone", "email", 
            "policy_number", "nationality", "employee_number"
        };
        
        List<String> missingOptionalCols = new ArrayList<>();
        for (String col : optionalColKeys) {
            if (columnIndices.get(col) == null) {
                missingOptionalCols.add(col);
            }
        }
        
        if (!missingOptionalCols.isEmpty()) {
            log.info("[MemberImport] Optional columns not found (will be ignored): {}", missingOptionalCols);
        }
    }
    
    private String normalizeText(String text) {
        if (text == null) return "";
        return text.trim().toLowerCase()
            .replaceAll("[أإآ]", "ا")
            .replaceAll("ة", "ه")
            .replaceAll("ى", "ي")
            .replaceAll("\\s+", " ");
    }

    private Map<String, Employer> buildEmployerLookup() {
        List<Employer> employers = employerRepository.findByActiveTrue();
        Map<String, Employer> lookup = new HashMap<>();
        
        for (Employer emp : employers) {
            // By ID
            String idStr = emp.getId().toString();
            lookup.put(idStr, emp);
            
            // By Name (normalized) - Employer has 'name' field
            if (emp.getName() != null) {
                lookup.put(normalizeText(emp.getName()), emp);
                // Also store exact name (case-insensitive)
                lookup.put(emp.getName().trim().toLowerCase(), emp);
            }
            
            // By Code if available
            if (emp.getCode() != null) {
                lookup.put(emp.getCode().trim().toLowerCase(), emp);
            }
        }
        
        log.debug("[MemberImport] Built employer lookup with {} entries for {} employers", 
            lookup.size(), employers.size());
        
        return lookup;
    }
    
    /**
     * Try to find employer with fuzzy matching
     */
    private Employer findEmployerFuzzy(String employerName, Map<String, Employer> employerLookup) {
        if (employerName == null || employerName.trim().isEmpty()) {
            return null;
        }
        
        // Try exact normalized match
        String normalizedInput = normalizeText(employerName);
        Employer employer = employerLookup.get(normalizedInput);
        if (employer != null) return employer;
        
        // Try exact case-insensitive
        employer = employerLookup.get(employerName.trim().toLowerCase());
        if (employer != null) return employer;
        
        // Try ID match
        employer = employerLookup.get(employerName.trim());
        if (employer != null) return employer;
        
        // Try partial match (check if any key contains our input or vice versa)
        String inputLower = employerName.trim().toLowerCase();
        for (Map.Entry<String, Employer> entry : employerLookup.entrySet()) {
            String key = entry.getKey();
            if (key.contains(inputLower) || inputLower.contains(key)) {
                log.debug("[MemberImport] Found partial match: '{}' matches '{}'", employerName, key);
                return entry.getValue();
            }
        }
        
        return null;
    }
    
    private Member parseAndCreateMember(
            Row row,
            int rowNum,
            Map<String, Integer> columnIndices,
            Map<String, Employer> employerLookup,
            List<ImportError> errors
    ) {
        // Extract values
        String fullName = getCellValue(row, columnIndices.get("full_name"));
        String employerName = getCellValue(row, columnIndices.get("employer"));
        LocalDate birthDate = getCellValueAsDate(row, columnIndices.get("birth_date"));
        String genderStr = getCellValue(row, columnIndices.get("gender"));
        
        // Validate mandatory fields
        boolean hasErrors = false;
        
        if (fullName == null || fullName.trim().isEmpty()) {
            errors.add(createError(rowNum, ErrorType.MISSING_REQUIRED, "full_name", 
                "الاسم الكامل مطلوب", "Full name is required", fullName));
            hasErrors = true;
        }
        
        if (employerName == null || employerName.trim().isEmpty()) {
            errors.add(createError(rowNum, ErrorType.MISSING_REQUIRED, "employer", 
                "جهة العمل مطلوبة", "Employer is required", employerName));
            hasErrors = true;
        }
        
        // Removed validation for birth_date (Optional in V112)
        // Removed validation for gender (Optional in V112)
        
        // Lookup employer using fuzzy matching
        Employer employer = findEmployerFuzzy(employerName, employerLookup);
        
        if (employer == null && employerName != null && !employerName.trim().isEmpty()) {
            errors.add(createError(rowNum, ErrorType.LOOKUP_FAILED, "employer", 
                "جهة العمل غير موجودة: " + employerName + ". تأكد من تطابق الاسم مع قائمة جهات العمل.", 
                "Employer not found: " + employerName + ". Please check the Employers lookup sheet.", employerName));
            hasErrors = true;
        }
        
        // Parse gender
        Gender gender = null;
        if (genderStr != null && !genderStr.trim().isEmpty()) {
            gender = parseGender(genderStr);
            if (gender == null) {
                errors.add(createError(rowNum, ErrorType.INVALID_ENUM, "gender", 
                    "قيمة الجنس غير صحيحة: " + genderStr, 
                    "Invalid gender value: " + genderStr, genderStr));
                hasErrors = true;
            }
        }
        
        if (hasErrors) {
            return null;
        }
        
        // Create member
        Member member = Member.builder()
            .fullName(fullName.trim())
            .civilId(getCellValue(row, columnIndices.get("civil_id")))
            .birthDate(birthDate)
            .gender(gender)
            .phone(getCellValue(row, columnIndices.get("phone")))
            .email(getCellValue(row, columnIndices.get("email")))
            .policyNumber(getCellValue(row, columnIndices.get("policy_number")))
            .nationality(getCellValue(row, columnIndices.get("nationality")))
            .employeeNumber(getCellValue(row, columnIndices.get("employee_number")))
            .employer(employer)
            .status(MemberStatus.ACTIVE)
            .build();
        
        // Card number will be auto-generated by @PrePersist
        
        return member;
    }
    
    private String getCellValue(Row row, Integer columnIndex) {
        if (columnIndex == null) {
            return null;
        }
        return parserService.getCellValueAsString(row.getCell(columnIndex));
    }
    
    private LocalDate getCellValueAsDate(Row row, Integer columnIndex) {
        if (columnIndex == null) {
            return null;
        }
        return parserService.getCellValueAsDate(row.getCell(columnIndex));
    }
    
    private Gender parseGender(String value) {
        if (value == null) return null;
        
        String normalized = value.trim().toUpperCase();
        
        if (normalized.equals("MALE") || normalized.equals("M") || normalized.equals("ذكر")) {
            return Gender.MALE;
        } else if (normalized.equals("FEMALE") || normalized.equals("F") || normalized.equals("أنثى")) {
            return Gender.FEMALE;
        }
        
        return null;
    }
    
    private ImportError createError(int rowNum, ErrorType type, String columnName, 
                                    String messageAr, String messageEn, String value) {
        return ImportError.builder()
            .rowNumber(rowNum - 1) // Adjust for user-friendly numbering
            .errorType(type)
            .columnName(columnName)
            .messageAr(messageAr)
            .messageEn(messageEn)
            .value(value)
            .build();
    }
    
    private ExcelImportResult buildErrorResult(ImportSummary summary, List<ImportError> errors, String message) {
        return ExcelImportResult.builder()
            .summary(summary)
            .errors(errors)
            .success(false)
            .messageAr("فشل الاستيراد: " + message)
            .messageEn("Import failed: " + message)
            .build();
    }
}
