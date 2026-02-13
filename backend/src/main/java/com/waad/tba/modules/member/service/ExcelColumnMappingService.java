package com.waad.tba.modules.member.service;

import com.waad.tba.modules.member.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Excel Column Mapping Service
 * 
 * Analyzes Excel files and suggests column-to-field mappings
 * using smart matching algorithms
 */
@Slf4j
@Service
@lombok.RequiredArgsConstructor
public class ExcelColumnMappingService {

    private final com.waad.tba.common.excel.service.ExcelParserService parserService;

    /**
     * Field definitions with Arabic and English labels
     */
    private static final Map<String, FieldDefinition> FIELD_DEFINITIONS = new HashMap<>() {{
        put("nationalNumber", new FieldDefinition("nationalNumber", "الرقم الوطني", "National Number", 
            Arrays.asList("national number", "national_number", "national id", "civil id", "civilid", "رقم مدني", "رقم", "معرف", "الرقم الوطني", "civil_id")));
        put("fullName", new FieldDefinition("fullName", "الاسم الكامل", "Full Name",
            Arrays.asList("full name", "fullname", "name", "member_name", "اسم", "الاسم", "اسم كامل", "الاسم الكامل", "full_name", "اسم الموظف", "اسم العضو")));
        put("email", new FieldDefinition("email", "البريد الإلكتروني", "Email",
            Arrays.asList("email", "e-mail", "work_email", "email_address", "بريد", "بريد إلكتروني", "ايميل", "البريد الإلكتروني")));
        put("phone", new FieldDefinition("phone", "رقم الهاتف", "Phone",
            Arrays.asList("phone", "mobile", "tel", "telephone", "mobile_phone", "work_phone", "هاتف", "جوال", "موبايل", "رقم الهاتف", "رقم الجوال")));
        put("dateOfBirth", new FieldDefinition("dateOfBirth", "تاريخ الميلاد", "Date of Birth",
            Arrays.asList("dob", "birth date", "date of birth", "birthdate", "تاريخ ميلاد", "ميلاد", "تاريخ الميلاد", "birth_date")));
        put("gender", new FieldDefinition("gender", "الجنس", "Gender",
            Arrays.asList("gender", "sex", "جنس", "الجنس", "النوع")));
        put("policyNumber", new FieldDefinition("policyNumber", "رقم البوليصة", "Policy Number",
            Arrays.asList("policy", "policy number", "policy_number", "بوليصة", "رقم بوليصة", "رقم الوثيقة", "الوثيقة")));
        put("employer", new FieldDefinition("employer", "جهة العمل", "Employer",
            Arrays.asList("employer", "employer id", "company", "company_id", "company_name", "work_company", "organization", "جهة عمل", "جهة العمل", "شركة", "اسم جهة العمل", "المؤسسة", "جهة الانتساب", "صاحب العمل")));
        put("nationality", new FieldDefinition("nationality", "الجنسية", "Nationality",
            Arrays.asList("nationality", "nation", "country", "جنسية", "الجنسية", "البلد")));
        put("employeeNumber", new FieldDefinition("employeeNumber", "الرقم الوظيفي", "Employee Number",
            Arrays.asList("employee number", "emp number", "badge id", "رقم وظيفي", "الرقم الوظيفي", "employee_number")));
        put("cardNumber", new FieldDefinition("cardNumber", "رقم البطاقة", "Card Number",
            Arrays.asList("card number", "card_number", "cardnumber", "رقم البطاقة", "رقم العضوية", "membership number")));
    }};

    /**
     * Required fields for Member import
     */
    private static final Set<String> REQUIRED_FIELDS = new HashSet<>(Arrays.asList(
        "fullName", "employer"
    ));

    /**
     * Detect columns and suggest mappings from Excel file
     */
    public ExcelColumnDetectionDto detectColumns(MultipartFile file) throws IOException {
        log.info("[ExcelColumnMapping] Detecting columns from file: {}", file.getOriginalFilename());

        try (Workbook workbook = parserService.openWorkbook(file)) {
            Sheet sheet = parserService.getDataSheet(workbook);
            
            // Scan for header row (check first 10 rows)
            int headerRowIndex = findHeaderRow(sheet);
            Row headerRow = sheet.getRow(headerRowIndex);
            
            if (headerRow == null) {
                throw new IllegalArgumentException("لا يمكن العثور على صف العناوين في ملف Excel");
            }

            List<String> columnHeaders = readRow(headerRow);
            log.info("[ExcelColumnMapping] Found {} columns at row {}", columnHeaders.size(), headerRowIndex);

            // Generate suggestions for each column
            List<ExcelMappingSuggestionDto> suggestions = generateSuggestions(columnHeaders, sheet, headerRowIndex);

            // Read preview rows (next 3 rows after header)
            List<ExcelPreviewRowDto> previewRows = readPreviewRows(sheet, headerRowIndex + 1, 3);

            // Find missing required fields
            Set<String> mappedFields = suggestions.stream()
                .filter(s -> s.getSuggestedField() != null)
                .map(ExcelMappingSuggestionDto::getSuggestedField)
                .collect(Collectors.toSet());
            
            List<String> missingFields = REQUIRED_FIELDS.stream()
                .filter(field -> !mappedFields.contains(field))
                .map(field -> FIELD_DEFINITIONS.get(field).getLabelAr())
                .collect(Collectors.toList());

            // Calculate statistics
            long autoAcceptedCount = suggestions.stream()
                .filter(ExcelMappingSuggestionDto::getAutoAccepted)
                .count();
            
            long manualReviewCount = suggestions.size() - autoAcceptedCount;
            
            double overallConfidence = suggestions.stream()
                .filter(s -> s.getConfidence() != null && s.getConfidence() > 0)
                .mapToDouble(ExcelMappingSuggestionDto::getConfidence)
                .average()
                .orElse(0.0);

            // Detect warnings
            List<String> warnings = detectWarnings(columnHeaders, suggestions);

            return ExcelColumnDetectionDto.builder()
                .fileName(file.getOriginalFilename())
                .sheetName(sheet.getSheetName())
                .totalRows(sheet.getLastRowNum() + 1)
                .totalColumns(columnHeaders.size())
                .headerRowNumber(headerRowIndex)
                .columnHeaders(columnHeaders)
                .suggestions(suggestions)
                .previewRows(previewRows)
                .missingRequiredFields(missingFields)
                .overallConfidence(Math.round(overallConfidence * 100.0) / 100.0)
                .autoAcceptedCount((int) autoAcceptedCount)
                .manualReviewCount((int) manualReviewCount)
                .warnings(warnings)
                .build();
        }
    }

    /**
     * Find the most likely header row by scanning first 10 rows
     */
    public int findHeaderRow(Sheet sheet) {
        int bestRow = 0;
        int maxMatches = -1;

        for (int i = 0; i <= Math.min(sheet.getLastRowNum(), 15); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;

            int matches = 0;
            int totalTextLength = 0;
            int cellCount = 0;

            for (int c = 0; c < row.getLastCellNum(); c++) {
                String cellValue = getCellValueAsString(row.getCell(c));
                if (cellValue == null || cellValue.trim().isEmpty()) continue;

                cellCount++;
                totalTextLength += cellValue.length();
                String normalized = normalizeText(cellValue);
                for (FieldDefinition def : FIELD_DEFINITIONS.values()) {
                    for (String keyword : def.getKeywords()) {
                        if (normalized.equals(normalizeText(keyword))) {
                            matches++;
                            break;
                        }
                    }
                }
            }

            // SMART FILTER: A header row shouldn't have rows with very long descriptions (instructions)
            // If the average cell length is too high (> 30 chars), it's likely an instruction row, not headers
            double avgLength = cellCount > 0 ? (double) totalTextLength / cellCount : 0;
            if (avgLength > 35) {
                log.debug("[ExcelColumnMapping] Skipping row {} - looks like instructions (avg length: {})", i, avgLength);
                continue;
            }

            if (matches > maxMatches) {
                maxMatches = matches;
                bestRow = i;
            }
        }

        log.info("[ExcelColumnMapping] Best header row found: {} with {} matches", bestRow, maxMatches);
        return bestRow;
    }

    /**
     * Generate mapping suggestions for each column
     */
    private List<ExcelMappingSuggestionDto> generateSuggestions(List<String> columnHeaders, Sheet sheet, int headerRowIndex) {
        List<ExcelMappingSuggestionDto> suggestions = new ArrayList<>();

        for (int i = 0; i < columnHeaders.size(); i++) {
            String header = columnHeaders.get(i);
            String sampleValue = getSampleValue(sheet, i, headerRowIndex);
            
            ExcelMappingSuggestionDto suggestion = suggestMapping(i, header, sampleValue);
            suggestions.add(suggestion);
        }

        return suggestions;
    }

    /**
     * Suggest mapping for a single column using smart matching
     */
    private ExcelMappingSuggestionDto suggestMapping(int columnIndex, String header, String sampleValue) {
        if (header == null || header.trim().isEmpty()) {
            return ExcelMappingSuggestionDto.builder()
                .columnIndex(columnIndex)
                .columnName(header)
                .confidence(0.0)
                .matchReason("Empty column header")
                .autoAccepted(false)
                .sampleValue(sampleValue)
                .build();
        }

        String normalizedHeader = normalizeText(header);
        
        // Try to find best matching field
        MatchResult bestMatch = null;
        for (Map.Entry<String, FieldDefinition> entry : FIELD_DEFINITIONS.entrySet()) {
            String fieldName = entry.getKey();
            FieldDefinition fieldDef = entry.getValue();
            
            MatchResult match = calculateMatch(normalizedHeader, fieldDef, sampleValue);
            if (match != null && (bestMatch == null || match.confidence > bestMatch.confidence)) {
                match.fieldName = fieldName;
                match.fieldDef = fieldDef;
                bestMatch = match;
            }
        }

        if (bestMatch == null || bestMatch.confidence < 0.3) {
            // No good match found
            return ExcelMappingSuggestionDto.builder()
                .columnIndex(columnIndex)
                .columnName(header)
                .confidence(0.0)
                .matchReason("No matching field found")
                .autoAccepted(false)
                .sampleValue(sampleValue)
                .build();
        }

        return ExcelMappingSuggestionDto.builder()
            .columnIndex(columnIndex)
            .columnName(header)
            .suggestedField(bestMatch.fieldName)
            .suggestedFieldLabelAr(bestMatch.fieldDef.getLabelAr())
            .suggestedFieldLabelEn(bestMatch.fieldDef.getLabelEn())
            .confidence(Math.round(bestMatch.confidence * 100.0) / 100.0)
            .matchReason(bestMatch.reason)
            .autoAccepted(bestMatch.confidence >= 0.9)
            .sampleValue(sampleValue)
            .build();
    }

    /**
     * Calculate match confidence between header and field definition
     */
    private MatchResult calculateMatch(String normalizedHeader, FieldDefinition fieldDef, String sampleValue) {
        double maxConfidence = 0.0;
        String matchReason = "";

        // Check exact match
        for (String keyword : fieldDef.getKeywords()) {
            String normalizedKeyword = normalizeText(keyword);
            
            if (normalizedHeader.equals(normalizedKeyword)) {
                maxConfidence = 1.0;
                matchReason = "Exact match";
                break;
            }
            
            // Check contains
            if (normalizedHeader.contains(normalizedKeyword) || normalizedKeyword.contains(normalizedHeader)) {
                double containsConfidence = 0.8;
                if (containsConfidence > maxConfidence) {
                    maxConfidence = containsConfidence;
                    matchReason = "Header contains keyword";
                }
            }
            
            // Check similarity (Levenshtein-like)
            double similarity = calculateSimilarity(normalizedHeader, normalizedKeyword);
            if (similarity > 0.7 && similarity > maxConfidence) {
                maxConfidence = similarity * 0.7; // Reduce confidence for fuzzy match
                matchReason = "Similar header name";
            }
        }

        // Boost confidence if sample value matches expected pattern
        if (maxConfidence > 0 && sampleValue != null && !sampleValue.trim().isEmpty()) {
            if (matchesExpectedPattern(fieldDef.getFieldName(), sampleValue)) {
                maxConfidence = Math.min(1.0, maxConfidence + 0.1);
                matchReason += " + Data pattern match";
            }
        }

        if (maxConfidence > 0) {
            MatchResult result = new MatchResult();
            result.confidence = maxConfidence;
            result.reason = matchReason;
            return result;
        }

        return null;
    }

    /**
     * Check if sample value matches expected pattern for field
     */
    private boolean matchesExpectedPattern(String fieldName, String value) {
        switch (fieldName) {
            case "civilId":
                return value.matches("\\d{12}"); // 12 digits
            case "email":
                return value.contains("@");
            case "phone":
                return value.matches("\\+?\\d{8,15}");
            case "dateOfBirth":
                return value.matches("\\d{1,2}/\\d{1,2}/\\d{2,4}|\\d{4}-\\d{2}-\\d{2}");
            case "policyNumber":
                return value.matches("[A-Z0-9-]+");
            default:
                return false;
        }
    }

    /**
     * Calculate text similarity (simple approach)
     */
    private double calculateSimilarity(String s1, String s2) {
        if (s1 == null || s2 == null) return 0.0;
        if (s1.equals(s2)) return 1.0;
        
        int longer = Math.max(s1.length(), s2.length());
        if (longer == 0) return 1.0;
        
        int editDistance = levenshteinDistance(s1, s2);
        return (longer - editDistance) / (double) longer;
    }

    /**
     * Levenshtein distance calculation
     */
    private int levenshteinDistance(String s1, String s2) {
        int[][] dp = new int[s1.length() + 1][s2.length() + 1];
        
        for (int i = 0; i <= s1.length(); i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= s2.length(); j++) {
            dp[0][j] = j;
        }
        
        for (int i = 1; i <= s1.length(); i++) {
            for (int j = 1; j <= s2.length(); j++) {
                int cost = s1.charAt(i - 1) == s2.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(
                    dp[i - 1][j] + 1,      // deletion
                    dp[i][j - 1] + 1),     // insertion
                    dp[i - 1][j - 1] + cost); // substitution
            }
        }
        
        return dp[s1.length()][s2.length()];
    }

    /**
     * Normalize text for comparison (lowercase, remove special chars, etc.)
     */
    private String normalizeText(String text) {
        if (text == null) return "";
        String input = text.replace('\u00A0', ' ').replace('\u200B', ' ');
        String normalized = input.toLowerCase()
            .replaceAll("[\\s_-]+", " ")
            .replaceAll("[^a-zA-Z0-9\\u0600-\\u06FF\\s]", "")
            .trim();
            
        // Enhanced Arabic Normalization
        normalized = normalized.replace('أ', 'ا');
        normalized = normalized.replace('إ', 'ا');
        normalized = normalized.replace('آ', 'ا');
        normalized = normalized.replace('ة', 'ه');
        normalized = normalized.replace('ى', 'ي');
        normalized = normalized.replaceAll("[\\u064B-\\u0652]", ""); // Remove harakat
        
        return normalized;
    }

    /**
     * Read row values
     */
    private List<String> readRow(Row row) {
        List<String> values = new ArrayList<>();
        if (row == null) return values;
        
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            values.add(getCellValueAsString(cell));
        }
        return values;
    }

    /**
     * Read preview rows
     */
    private List<ExcelPreviewRowDto> readPreviewRows(Sheet sheet, int startRow, int count) {
        List<ExcelPreviewRowDto> previewRows = new ArrayList<>();
        
        for (int i = 0; i < count && startRow + i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(startRow + i);
            if (row != null) {
                previewRows.add(ExcelPreviewRowDto.builder()
                    .rowNumber(startRow + i + 1) // 1-based for display
                    .values(readRow(row))
                    .build());
            }
        }
        
        return previewRows;
    }

    /**
     * Get sample value from column (first non-empty value after header)
     */
    private String getSampleValue(Sheet sheet, int columnIndex, int headerRowIndex) {
        for (int rowNum = headerRowIndex + 1; rowNum <= Math.min(sheet.getLastRowNum(), headerRowIndex + 10); rowNum++) {
            Row row = sheet.getRow(rowNum);
            if (row != null) {
                Cell cell = row.getCell(columnIndex);
                String value = getCellValueAsString(cell);
                if (value != null && !value.trim().isEmpty()) {
                    return value;
                }
            }
        }
        return null;
    }

    /**
     * Get cell value as string
     */
    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getLocalDateTimeCellValue().toString();
                }
                return String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return cell.getCellFormula();
            default:
                return "";
        }
    }

    /**
     * Detect warnings in Excel file
     */
    private List<String> detectWarnings(List<String> headers, List<ExcelMappingSuggestionDto> suggestions) {
        List<String> warnings = new ArrayList<>();

        // Check for duplicate headers
        Set<String> seen = new HashSet<>();
        for (String header : headers) {
            if (header != null && !header.trim().isEmpty()) {
                if (!seen.add(header.toLowerCase())) {
                    warnings.add("تحذير: عمود مكرر: " + header);
                }
            }
        }

        // Check for unmapped columns
        long unmappedCount = suggestions.stream()
            .filter(s -> s.getSuggestedField() == null || s.getConfidence() < 0.5)
            .count();
        if (unmappedCount > 0) {
            warnings.add("تحذير: " + unmappedCount + " أعمدة غير مطابقة");
        }

        // Check for duplicate field mappings
        Map<String, Long> fieldCounts = suggestions.stream()
            .filter(s -> s.getSuggestedField() != null)
            .collect(Collectors.groupingBy(ExcelMappingSuggestionDto::getSuggestedField, Collectors.counting()));
        
        fieldCounts.entrySet().stream()
            .filter(e -> e.getValue() > 1)
            .forEach(e -> warnings.add("تحذير: حقل " + FIELD_DEFINITIONS.get(e.getKey()).getLabelAr() + " مطابق لعدة أعمدة"));

        return warnings;
    }

    /**
     * Field definition helper class
     */
    private static class FieldDefinition {
        private final String fieldName;
        private final String labelAr;
        private final String labelEn;
        private final List<String> keywords;

        public FieldDefinition(String fieldName, String labelAr, String labelEn, List<String> keywords) {
            this.fieldName = fieldName;
            this.labelAr = labelAr;
            this.labelEn = labelEn;
            this.keywords = keywords;
        }

        public String getFieldName() { return fieldName; }
        public String getLabelAr() { return labelAr; }
        public String getLabelEn() { return labelEn; }
        public List<String> getKeywords() { return keywords; }
    }

    /**
     * Match result helper class
     */
    private static class MatchResult {
        String fieldName;
        FieldDefinition fieldDef;
        double confidence;
        String reason;
    }
}
