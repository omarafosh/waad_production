package com.waad.tba.common.excel.service;

import com.waad.tba.common.excel.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Generic Smart Column Mapping Service
 * 
 * Provides intelligent matching between Excel columns and system fields.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmartColumnMappingService {

    private final ExcelParserService parserService;

    /**
     * Detect columns and suggest mappings based on provided field definitions
     */
    public ExcelColumnDetectionDto detectColumns(MultipartFile file, List<ExcelFieldDefinition> fieldDefinitions) throws IOException {
        log.info("[SmartMapping] Detecting columns for file: {}", file.getOriginalFilename());

        try (Workbook workbook = parserService.openWorkbook(file)) {
            Sheet sheet = parserService.getDataSheet(workbook);
            int headerRowIndex = findHeaderRow(sheet, fieldDefinitions);
            Row headerRow = sheet.getRow(headerRowIndex);
            
            if (headerRow == null) {
                throw new IllegalArgumentException("Could not find header row in Excel file");
            }

            List<String> columnHeaders = readRow(headerRow);
            List<ExcelMappingSuggestionDto> suggestions = generateSuggestions(columnHeaders, sheet, headerRowIndex, fieldDefinitions);
            List<ExcelPreviewRowDto> previewRows = readPreviewRows(sheet, headerRowIndex + 1, 3);

            Set<String> mappedFields = suggestions.stream()
                .filter(s -> s.getSuggestedField() != null)
                .map(ExcelMappingSuggestionDto::getSuggestedField)
                .collect(Collectors.toSet());
            
            List<String> missingFields = fieldDefinitions.stream()
                .filter(ExcelFieldDefinition::isRequired)
                .filter(field -> !mappedFields.contains(field.getFieldName()))
                .map(ExcelFieldDefinition::getLabelAr)
                .collect(Collectors.toList());

            long autoAcceptedCount = suggestions.stream().filter(ExcelMappingSuggestionDto::getAutoAccepted).count();
            double overallConfidence = suggestions.stream()
                .filter(s -> s.getConfidence() != null && s.getConfidence() > 0)
                .mapToDouble(ExcelMappingSuggestionDto::getConfidence)
                .average().orElse(0.0);

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
                .manualReviewCount(suggestions.size() - (int) autoAcceptedCount)
                .warnings(detectWarnings(columnHeaders, suggestions, fieldDefinitions))
                .build();
        }
    }

    private int findHeaderRow(Sheet sheet, List<ExcelFieldDefinition> fieldDefinitions) {
        int bestRow = 0;
        int maxMatches = -1;

        for (int i = 0; i <= Math.min(sheet.getLastRowNum(), 15); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;

            int matches = 0;
            int totalTextLength = 0;
            int cellCount = 0;

            for (int c = 0; c < row.getLastCellNum(); c++) {
                String cellValue = parserService.getCellValueAsString(row.getCell(c));
                if (cellValue == null || cellValue.trim().isEmpty()) continue;

                cellCount++;
                totalTextLength += cellValue.length();
                String normalized = normalizeText(cellValue);
                for (ExcelFieldDefinition def : fieldDefinitions) {
                    for (String keyword : def.getKeywords()) {
                        if (normalized.equals(normalizeText(keyword))) {
                            matches++;
                            break;
                        }
                    }
                }
            }

            if (cellCount > 0 && (double) totalTextLength / cellCount > 35) continue;

            if (matches > maxMatches) {
                maxMatches = matches;
                bestRow = i;
            }
        }
        return bestRow;
    }

    private List<ExcelMappingSuggestionDto> generateSuggestions(List<String> columnHeaders, Sheet sheet, int headerRowIndex, List<ExcelFieldDefinition> fieldDefinitions) {
        List<ExcelMappingSuggestionDto> suggestions = new ArrayList<>();
        for (int i = 0; i < columnHeaders.size(); i++) {
            String header = columnHeaders.get(i);
            String sampleValue = getSampleValue(sheet, i, headerRowIndex);
            suggestions.add(suggestMapping(i, header, sampleValue, fieldDefinitions));
        }
        return suggestions;
    }

    private ExcelMappingSuggestionDto suggestMapping(int columnIndex, String header, String sampleValue, List<ExcelFieldDefinition> fieldDefinitions) {
        if (header == null || header.trim().isEmpty()) {
            return ExcelMappingSuggestionDto.builder().columnIndex(columnIndex).sampleValue(sampleValue).confidence(0.0).autoAccepted(false).build();
        }

        String normalizedHeader = normalizeText(header);
        ExcelFieldDefinition bestField = null;
        double maxConf = 0.0;
        String reason = "";

        for (ExcelFieldDefinition def : fieldDefinitions) {
            double conf = calculateConfidence(normalizedHeader, def, sampleValue);
            if (conf > maxConf) {
                maxConf = conf;
                bestField = def;
                reason = "Matched by keywords/pattern";
            }
        }

        if (bestField == null || maxConf < 0.3) {
            return ExcelMappingSuggestionDto.builder().columnIndex(columnIndex).columnName(header).sampleValue(sampleValue).confidence(0.0).autoAccepted(false).build();
        }

        return ExcelMappingSuggestionDto.builder()
            .columnIndex(columnIndex)
            .columnName(header)
            .suggestedField(bestField.getFieldName())
            .suggestedFieldLabelAr(bestField.getLabelAr())
            .suggestedFieldLabelEn(bestField.getLabelEn())
            .confidence(Math.round(maxConf * 100.0) / 100.0)
            .matchReason(reason)
            .autoAccepted(maxConf >= 0.9)
            .sampleValue(sampleValue)
            .build();
    }

    private double calculateConfidence(String normalizedHeader, ExcelFieldDefinition def, String sampleValue) {
        double max = 0.0;
        for (String kw : def.getKeywords()) {
            String nkw = normalizeText(kw);
            if (normalizedHeader.equals(nkw)) return 1.0;
            if (normalizedHeader.contains(nkw) || nkw.contains(normalizedHeader)) max = Math.max(max, 0.8);
        }
        return max;
    }

    private String normalizeText(String text) {
        if (text == null) return "";
        return text.toLowerCase().trim()
            .replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').replace('ى', 'ي')
            .replaceAll("[^a-zA-Z0-9\\u0600-\\u06FF\\s]", "");
    }

    private List<String> readRow(Row row) {
        List<String> values = new ArrayList<>();
        if (row == null) return values;
        for (int i = 0; i < row.getLastCellNum(); i++) {
            values.add(parserService.getCellValueAsString(row.getCell(i)));
        }
        return values;
    }

    private String getSampleValue(Sheet sheet, int columnIndex, int headerRowIndex) {
        for (int i = headerRowIndex + 1; i <= Math.min(sheet.getLastRowNum(), headerRowIndex + 10); i++) {
            Row row = sheet.getRow(i);
            if (row != null) {
                String val = parserService.getCellValueAsString(row.getCell(columnIndex));
                if (val != null && !val.trim().isEmpty()) return val;
            }
        }
        return null;
    }

    private List<ExcelPreviewRowDto> readPreviewRows(Sheet sheet, int startRow, int count) {
        List<ExcelPreviewRowDto> previewRows = new ArrayList<>();
        for (int i = 0; i < count && startRow + i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(startRow + i);
            if (row != null) {
                previewRows.add(ExcelPreviewRowDto.builder().rowNumber(startRow + i + 1).values(readRow(row)).build());
            }
        }
        return previewRows;
    }

    private List<String> detectWarnings(List<String> headers, List<ExcelMappingSuggestionDto> suggestions, List<ExcelFieldDefinition> fieldDefinitions) {
        List<String> warnings = new ArrayList<>();
        Set<String> seenHeaders = new HashSet<>();
        for (String h : headers) {
            if (h != null && !h.trim().isEmpty() && !seenHeaders.add(h.toLowerCase())) warnings.add("Warning: Duplicate header: " + h);
        }
        return warnings;
    }
}
