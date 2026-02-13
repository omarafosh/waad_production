package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.modules.medicaltaxonomy.dto.ImportChangeDto;
import com.waad.tba.modules.medicaltaxonomy.dto.ImportPreviewResultDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceImportDto;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.waad.tba.modules.medicaltaxonomy.dto.ExcelImportResultDto;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicalServiceImportService {

    private final MedicalServiceRepository serviceRepository;
    private final MedicalCategoryRepository categoryRepository;

    /**
     * Parse Excel file and preview changes without saving.
     */
    @Transactional(readOnly = true)
    public ImportPreviewResultDto previewImport(MultipartFile file) throws IOException {
        List<MedicalServiceImportDto> importedRows = parseExcel(file);
        return calculateDiff(importedRows);
    }

    /**
     * Parse Excel file to DTOs.
     * Assumes standard format: Code | Name | Category | Price
     */
    private List<MedicalServiceImportDto> parseExcel(MultipartFile file) throws IOException {
        List<MedicalServiceImportDto> rows = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            // Skip header (row 0)
            boolean firstRow = true;
            for (Row row : sheet) {
                if (firstRow) {
                    firstRow = false;
                    continue;
                }

                // Stop at empty rows
                if (row.getCell(0) == null || row.getCell(0).toString().trim().isEmpty()) {
                    break;
                }

                try {
                    String code = getCellValueAsString(row.getCell(0));
                    String name = getCellValueAsString(row.getCell(1));
                    String category = getCellValueAsString(row.getCell(2));
                    BigDecimal price = getCellValueAsBigDecimal(row.getCell(3));

                    rows.add(MedicalServiceImportDto.builder()
                            .code(code)
                            .name(name)
                            .category(category)
                            .basePrice(price)
                            .build());
                } catch (Exception e) {
                    log.warn("Error parsing row {}: {}", row.getRowNum(), e.getMessage());
                }
            }
        }
        return rows;
    }

    /**
     * Calculate what will change if these rows are imported.
     */
    private ImportPreviewResultDto calculateDiff(List<MedicalServiceImportDto> rows) {
        List<ImportChangeDto> changes = new ArrayList<>();
        int newCount = 0;
        int updatedCount = 0;
        int unchangedCount = 0;
        int errorCount = 0;

        for (int i = 0; i < rows.size(); i++) {
            MedicalServiceImportDto row = rows.get(i);
            String rowNum = String.valueOf(i + 2); // Excel row number (1-based, +header)

            try {
                Optional<MedicalService> existingOpt = serviceRepository.findByCode(row.getCode());

                if (existingOpt.isPresent()) {
                    MedicalService existing = existingOpt.get();
                    boolean isChanged = false;
                    List<String> updates = new ArrayList<>();

                    // Check for changes
                    if (!trim(row.getName()).equalsIgnoreCase(trim(existing.getName()))) {
                        updates.add("Name update");
                        isChanged = true;
                    }
                    if (row.getBasePrice() != null && existing.getBasePrice() != null
                            && row.getBasePrice().compareTo(existing.getBasePrice()) != 0) {
                        updates.add("Price update");
                        isChanged = true;
                    }

                    // Category Check (Simulation)
                    MedicalCategory cat = findCategory(row.getCategory());
                    if (cat != null && !cat.getId().equals(existing.getCategoryId())) {
                        updates.add("Category update");
                        isChanged = true;
                    }

                    if (isChanged) {
                        updatedCount++;
                        changes.add(ImportChangeDto.builder()
                                .rowNumber(rowNum)
                                .serviceCode(row.getCode())
                                .serviceName(row.getName())
                                .category(row.getCategory())
                                .changeType("UPDATE")
                                .oldPrice(existing.getBasePrice())
                                .newPrice(row.getBasePrice())
                                .oldName(existing.getName())
                                .newName(row.getName())
                                .notes(String.join(", ", updates))
                                .build());
                    } else {
                        unchangedCount++;
                    }

                } else {
                    // NEW Service
                    newCount++;
                    changes.add(ImportChangeDto.builder()
                            .rowNumber(rowNum)
                            .serviceCode(row.getCode())
                            .serviceName(row.getName())
                            .category(row.getCategory())
                            .changeType("NEW")
                            .newPrice(row.getBasePrice())
                            .newName(row.getName())
                            .notes("New Entry")
                            .build());
                }
            } catch (Exception e) {
                errorCount++;
                changes.add(ImportChangeDto.builder()
                        .rowNumber(rowNum)
                        .serviceCode(row.getCode())
                        .changeType("ERROR")
                        .notes(e.getMessage())
                        .build());
            }
        }

        return ImportPreviewResultDto.builder()
                .totalRecords(rows.size())
                .newServices(newCount)
                .updatedServices(updatedCount)
                .unchangedServices(unchangedCount)
                .errorCount(errorCount)
                .changes(changes)
                .build();
    }

    private MedicalCategory findCategory(String name) {
        if (name == null)
            return null;
        return categoryRepository.findByName(name.trim()).orElse(null);
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null)
            return "";
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                return String.valueOf((long) cell.getNumericCellValue());
            default:
                return "";
        }
    }

    private BigDecimal getCellValueAsBigDecimal(Cell cell) {
        if (cell == null)
            return null;
        if (cell.getCellType() == CellType.NUMERIC) {
            return BigDecimal.valueOf(cell.getNumericCellValue());
        }
        try {
            return new BigDecimal(cell.getStringCellValue().trim());
        } catch (Exception e) {
            return null;
        }
    }

    private String trim(String s) {
        return s == null ? "" : s.trim();
    }

    /**
     * Complete implementation of Excel Import.
     * Processes the file, saves/updates services, and handles categories.
     */
    @Transactional
    public ExcelImportResultDto importExcel(MultipartFile file) {
        log.info("[IMPORT] Starting Excel import for medical services");
        
        int inserted = 0;
        int updated = 0;
        int failed = 0;
        int total = 0;
        List<ExcelImportResultDto.ImportError> importErrors = new ArrayList<>();

        try {
            List<MedicalServiceImportDto> rows = parseExcel(file);
            total = rows.size();

            for (int i = 0; i < rows.size(); i++) {
                MedicalServiceImportDto row = rows.get(i);
                int excelRow = i + 2; // Offset for header

                try {
                    processRow(row, excelRow);
                    
                    // Count as insert or update
                    if (serviceRepository.existsByCode(row.getCode())) {
                        updated++;
                    } else {
                        inserted++;
                    }
                } catch (Exception e) {
                    failed++;
                    importErrors.add(ExcelImportResultDto.ImportError.builder()
                            .row(excelRow)
                            .error(e.getMessage())
                            .value(row.getCode())
                            .build());
                    log.error("[IMPORT] Error processing row {}: {}", excelRow, e.getMessage());
                }
            }

            return ExcelImportResultDto.builder()
                    .success(failed == 0)
                    .message(String.format("تمت معالجة %d خدمة: نجاح %d، فشل %d", total, (inserted + updated), failed))
                    .summary(ExcelImportResultDto.ImportSummary.builder()
                            .total(total)
                            .inserted(inserted)
                            .updated(updated)
                            .failed(failed)
                            .errors(importErrors)
                            .build())
                    .build();

        } catch (IOException e) {
            log.error("[IMPORT] Critical IO Error: {}", e.getMessage());
            return ExcelImportResultDto.builder()
                    .success(false)
                    .message("فشل في قراءة ملف Excel: " + e.getMessage())
                    .build();
        }
    }

    private void processRow(MedicalServiceImportDto dto, int rowNum) {
        if (dto.getCode() == null || dto.getCode().trim().isEmpty()) {
            throw new IllegalArgumentException("كود الخدمة مطلوب في السطر " + rowNum);
        }

        // 1. Resolve Category
        Long categoryId = null;
        if (dto.getCategory() != null && !dto.getCategory().trim().isEmpty()) {
            MedicalCategory cat = categoryRepository.findByName(dto.getCategory().trim())
                    .orElseGet(() -> {
                        // Optional: Create category if not found? 
                        // For now, let's just log and skip or throw
                        log.warn("[IMPORT] Category '{}' not found for code {}", dto.getCategory(), dto.getCode());
                        return null; 
                    });
            if (cat != null) categoryId = cat.getId();
        }

        // 2. Find or Create Service
        MedicalService service = serviceRepository.findByCode(dto.getCode())
                .orElse(MedicalService.builder()
                        .code(dto.getCode().trim())
                        .active(true)
                        .isMaster(true)
                        .build());

        // 3. Update Fields
        service.setName(dto.getName());
        if (dto.getEnglishName() != null) service.setNameEn(dto.getEnglishName());
        if (dto.getBasePrice() != null) service.setBasePrice(dto.getBasePrice());
        if (categoryId != null) service.setCategoryId(categoryId);

        serviceRepository.save(service);
    }
}
