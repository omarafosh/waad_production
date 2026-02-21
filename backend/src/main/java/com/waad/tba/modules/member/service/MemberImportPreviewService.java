package com.waad.tba.modules.member.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.common.entity.Organization;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.repository.OrganizationRepository;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto.ImportValidationErrorDto;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto.MemberImportRowDto;
import com.waad.tba.common.excel.service.ExcelParserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

/**
 * Service dedicated to parsing Excel files and generating previews for member imports.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberImportPreviewService {

    private final ExcelParserService parserService;
    private final MemberImportMappingService mappingService;
    private final OrganizationRepository organizationRepository;
    private final BenefitPolicyRepository benefitPolicyRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public MemberImportPreviewDto parseAndPreview(MultipartFile file, String customMappingsJson, Integer headerRowNumber) throws Exception {
        Map<String, String> customMappings = null;
        if (customMappingsJson != null && !customMappingsJson.isBlank()) {
            customMappings = objectMapper.readValue(customMappingsJson, new TypeReference<Map<String, String>>() {});
        }
        return parseAndPreview(file, customMappings, headerRowNumber);
    }

    @Transactional(readOnly = true)
    public MemberImportPreviewDto parseAndPreview(MultipartFile file, Map<String, String> customMappings, Integer headerRowNumber) throws Exception {
        int hRow = headerRowNumber != null ? headerRowNumber : 0;
        String batchId = UUID.randomUUID().toString();
        List<MemberImportRowDto> previewRows = new ArrayList<>();
        List<ImportValidationErrorDto> validationErrors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        Map<String, String> columnMappings = new LinkedHashMap<>();
        List<String> detectedColumns = new ArrayList<>();

        try (Workbook workbook = parserService.openWorkbook(file)) {
            Sheet sheet = parserService.getDataSheet(workbook);
            int totalRows = sheet.getLastRowNum();

            Row headerRow = sheet.getRow(hRow);
            if (headerRow == null) throw new BusinessRuleException("Excel file has no header row at row " + hRow);

            Map<Integer, String> columnIndexToName = new HashMap<>();
            Map<String, Integer> fieldToColumnIndex = new HashMap<>();

            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                String colName = parserService.getCellValueAsString(headerRow.getCell(i));
                if (colName == null) colName = "";
                columnIndexToName.put(i, colName.trim().toLowerCase());
                detectedColumns.add(colName.trim());
            }

            if (customMappings != null && !customMappings.isEmpty()) {
                for (Map.Entry<String, String> entry : customMappings.entrySet()) {
                    Integer columnIndex = parserService.findColumnIndex(headerRow, entry.getKey().trim().toLowerCase());
                    if (columnIndex != null) {
                        fieldToColumnIndex.put(entry.getValue(), columnIndex);
                        columnMappings.put(entry.getKey().trim().toLowerCase(), entry.getValue());
                    }
                }
            } else {
                for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                    mappingService.mapColumnToField(columnIndexToName.get(i), i, fieldToColumnIndex, columnMappings);
                }
            }

            validateMandatoryColumns(fieldToColumnIndex, validationErrors);

            int previewLimit = Math.min(totalRows, 50);
            Set<String> seenCardNumbers = new HashSet<>();
            Map<String, Long> normalizedEmployerMap = prepareEmployerLookup();

            int newCount = 0;
            int errorCount = 0;
            int warningCount = 0;

            for (int rowNum = hRow + 1; rowNum <= totalRows; rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || parserService.isEmptyRow(row)) continue;

                MemberImportRowDto rowDto = parseRow(row, rowNum, fieldToColumnIndex, validationErrors, seenCardNumbers, normalizedEmployerMap);
                
                if ("ERROR".equals(rowDto.getStatus())) errorCount++;
                else {
                    newCount++;
                    if ("WARNING".equals(rowDto.getStatus())) warningCount++;
                }

                if (rowNum <= previewLimit) previewRows.add(rowDto);
            }

            return buildPreviewDto(batchId, file.getOriginalFilename(), totalRows, newCount, warningCount, errorCount, detectedColumns, columnMappings, previewRows, validationErrors, warnings);
        }
    }

    private Map<String, Long> prepareEmployerLookup() {
        Map<String, Long> map = new HashMap<>();
        organizationRepository.findAll().forEach(org -> {
            if (org.getName() != null) map.put(mappingService.normalizeArabicText(org.getName()), org.getId());
            if (org.getCode() != null) map.put(org.getCode().toLowerCase().trim(), org.getId());
        });
        return map;
    }

    private void validateMandatoryColumns(Map<String, Integer> fieldToColumnIndex, List<ImportValidationErrorDto> errors) {
        if (!fieldToColumnIndex.containsKey("fullName")) {
            errors.add(ImportValidationErrorDto.builder().rowNumber(0).field("header").message("Missing mandatory column: full_name / name (الاسم الكامل)").build());
        }
    }

    private MemberImportRowDto parseRow(Row row, int rowNum, Map<String, Integer> fieldToColumnIndex, List<ImportValidationErrorDto> validationErrors, Set<String> seenCardNumbers, Map<String, Long> normalizedEmployerMap) {
        String fullName = getFieldValue(row, fieldToColumnIndex, "fullName");
        String employerName = getFieldValue(row, fieldToColumnIndex, "employer");
        String cardNumber = getFieldValue(row, fieldToColumnIndex, "cardNumber");
        String civilId = getFieldValue(row, fieldToColumnIndex, "civilId");

        List<String> rowErrors = new ArrayList<>();
        List<String> rowWarnings = new ArrayList<>();
        boolean hasError = false;
        boolean hasWarning = false;

        if (fullName == null || fullName.isBlank()) {
            rowErrors.add("الاسم الكامل مطلوب (Full name is required)");
            hasError = true;
        }

        if (employerName == null || employerName.isBlank()) {
            rowErrors.add("جهة العمل مطلوبة (Employer is required)");
            hasError = true;
        } else {
            if (!normalizedEmployerMap.containsKey(mappingService.normalizeArabicText(employerName))) {
                rowWarnings.add("جهة العمل غير موجودة: " + employerName);
                hasWarning = true;
            }
        }

        if (cardNumber != null && !cardNumber.isBlank()) {
            if (seenCardNumbers.contains(cardNumber)) {
                rowWarnings.add("رقم بطاقة مكرر في الملف: " + cardNumber);
                hasWarning = true;
            } else seenCardNumbers.add(cardNumber);
        }

        Map<String, String> attributes = new HashMap<>();
        fieldToColumnIndex.forEach((key, index) -> {
            if (key.startsWith("attr:")) {
                String val = parserService.getCellValueAsString(row.getCell(index));
                if (val != null && !val.isBlank()) attributes.put(key.substring(5), val);
            }
        });

        String status = hasError ? "ERROR" : (hasWarning ? "WARNING" : "NEW");
        return MemberImportRowDto.builder()
                .rowNumber(rowNum).fullName(fullName).employerName(employerName).cardNumber(cardNumber).civilId(civilId)
                .attributes(attributes).status(status).errors(rowErrors).warnings(rowWarnings).build();
    }

    private String getFieldValue(Row row, Map<String, Integer> fieldToColumnIndex, String field) {
        Integer colIndex = fieldToColumnIndex.get(field);
        return colIndex != null ? parserService.getCellValueAsString(row.getCell(colIndex)) : null;
    }

    private MemberImportPreviewDto buildPreviewDto(String batchId, String fileName, int totalRows, int newCount, int warningCount, int errorCount, List<String> detectedColumns, Map<String, String> columnMappings, List<MemberImportRowDto> previewRows, List<ImportValidationErrorDto> validationErrors, List<String> warnings) {
        if (totalRows > 50) warnings.add(String.format("عرض أول 50 صف من إجمالي %d صف", totalRows));
        if (warningCount > 0) warnings.add(String.format("%d صف بها تحذيرات", warningCount));
        if (errorCount > 0) warnings.add(String.format("%d صف بها أخطاء - سيتم تخطيها", errorCount));

        return MemberImportPreviewDto.builder()
                .batchId(batchId).fileName(fileName).totalRows(totalRows)
                .newCount(newCount).warningCount(warningCount).errorCount(errorCount)
                .detectedColumns(detectedColumns).columnMappings(columnMappings)
                .previewRows(previewRows).validationErrors(validationErrors)
                .canProceed(newCount > 0).warnings(warnings)
                .availableEmployers(organizationRepository.findAll().stream().map(e -> MemberImportPreviewDto.EmployerOptionDto.builder().id(e.getId()).code(e.getCode()).nameAr(e.getName()).active(e.isActive()).build()).toList())
                .availableBenefitPolicies(benefitPolicyRepository.findAll().stream().map(p -> MemberImportPreviewDto.BenefitPolicyOptionDto.builder().id(p.getId()).policyNumber(p.getPolicyCode()).nameAr(p.getName()).employerId(p.getEmployerOrganization() != null ? p.getEmployerOrganization().getId() : null).isActive(p.getStatus() == BenefitPolicy.BenefitPolicyStatus.ACTIVE).build()).toList())
                .build();
    }
}
