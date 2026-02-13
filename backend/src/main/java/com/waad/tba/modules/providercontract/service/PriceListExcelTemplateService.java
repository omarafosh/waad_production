package com.waad.tba.modules.providercontract.service;

import com.waad.tba.common.excel.dto.ExcelImportResult;
import com.waad.tba.common.excel.dto.ExcelImportResult.ImportError;
import com.waad.tba.common.excel.dto.ExcelImportResult.ImportError.ErrorType;
import com.waad.tba.common.excel.dto.ExcelImportResult.ImportSummary;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.providercontract.dto.*;
import com.waad.tba.modules.providercontract.entity.ProviderContract;
import com.waad.tba.modules.providercontract.entity.ProviderContractPricingItem;
import com.waad.tba.modules.providercontract.repository.ProviderContractPricingItemRepository;
import com.waad.tba.modules.providercontract.repository.ProviderContractRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;

/**
 * Price List Excel Template Service - SIMPLIFIED VERSION
 * 
 * Purpose: Generate and import pricing items for provider contracts
 * 
 * SIMPLIFIED DESIGN (2026-01-14):
 * - Only ONE mandatory column: service_name
 * - Optional: unit_price, quantity, notes
 * - NO medical service lookup required
 * - NO complex validation
 * - Currency is system default (LYD)
 * 
 * Template Structure:
 * - Sheet: Pricing_Template
 * - Columns: service_name (required), unit_price, quantity, notes
 * 
 * @version 3.0
 * @since 2026-01-14
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PriceListExcelTemplateService {
    
    private final ProviderContractRepository contractRepository;
    private final ProviderContractPricingItemRepository pricingRepository;
    private final MedicalServiceRepository medicalServiceRepository;
    
    private static final String SHEET_NAME = "Pricing_Template";
    
    // Column indices (0-based) - ENHANCED with service_code and category
    private static final int COL_SERVICE_NAME = 0;
    private static final int COL_SERVICE_CODE = 1;
    private static final int COL_CATEGORY = 2;
    private static final int COL_UNIT_PRICE = 3;
    private static final int COL_QUANTITY = 4;
    private static final int COL_NOTES = 5;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TEMPLATE GENERATION - SIMPLIFIED
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Generate simple Price List import template
     * 
     * Template is generated ALWAYS - no dependencies on existing data
     * 
     * @param contractId Contract ID (for validation only)
     * @return Excel template bytes
     */
    @Transactional(readOnly = true)
    public byte[] generateTemplate(Long contractId) throws IOException {
        log.info("[PriceListTemplate] Generating simple template for contract ID: {}", contractId);
        
        // 1. Validate contract exists (returns 400 if not found)
        if (contractId == null) {
            throw new BusinessRuleException("معرف العقد غير صالح");
        }
        
        ProviderContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new BusinessRuleException("العقد غير موجود - Invalid contractId: " + contractId));
        
        // Check if inactive (soft deleted)
        if (Boolean.FALSE.equals(contract.getActive())) {
            throw new BusinessRuleException("لا يمكن استيراد الأسعار لعقد غير نشط");
        }
        
        // 2. Generate template (NO database dependencies)
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            // Create main sheet
            XSSFSheet sheet = workbook.createSheet(SHEET_NAME);
            sheet.setRightToLeft(true); // RTL for Arabic
            
            // Create styles
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle requiredStyle = createRequiredHeaderStyle(workbook);
            CellStyle exampleStyle = createExampleStyle(workbook);
            
            // Row 0: Header row with column names
            Row headerRow = sheet.createRow(0);
            
            // service_name (REQUIRED)
            Cell cell0 = headerRow.createCell(COL_SERVICE_NAME);
            cell0.setCellValue("service_name / اسم الخدمة ★");
            cell0.setCellStyle(requiredStyle);
            
            // service_code (optional)
            Cell cell1 = headerRow.createCell(COL_SERVICE_CODE);
            cell1.setCellValue("service_code / رمز الخدمة");
            cell1.setCellStyle(headerStyle);
            
            // category (optional)
            Cell cell2 = headerRow.createCell(COL_CATEGORY);
            cell2.setCellValue("category / التصنيف");
            cell2.setCellStyle(headerStyle);
            
            // unit_price (optional)
            Cell cell3 = headerRow.createCell(COL_UNIT_PRICE);
            cell3.setCellValue("unit_price / السعر");
            cell3.setCellStyle(headerStyle);
            
            // quantity (optional, default 0)
            Cell cell4 = headerRow.createCell(COL_QUANTITY);
            cell4.setCellValue("quantity / الكمية");
            cell4.setCellStyle(headerStyle);
            
            // notes (optional)
            Cell cell5 = headerRow.createCell(COL_NOTES);
            cell5.setCellValue("notes / ملاحظات");
            cell5.setCellStyle(headerStyle);
            
            // Row 1: Example data row
            Row exampleRow = sheet.createRow(1);
            
            Cell ex0 = exampleRow.createCell(COL_SERVICE_NAME);
            ex0.setCellValue("فحص شامل");
            ex0.setCellStyle(exampleStyle);
            
            Cell ex1 = exampleRow.createCell(COL_SERVICE_CODE);
            ex1.setCellValue("SRV-001");
            ex1.setCellStyle(exampleStyle);
            
            Cell ex2 = exampleRow.createCell(COL_CATEGORY);
            ex2.setCellValue("الفحوصات");
            ex2.setCellStyle(exampleStyle);
            
            Cell ex3 = exampleRow.createCell(COL_UNIT_PRICE);
            ex3.setCellValue(100.00);
            ex3.setCellStyle(exampleStyle);
            
            Cell ex4 = exampleRow.createCell(COL_QUANTITY);
            ex4.setCellValue(1);
            ex4.setCellStyle(exampleStyle);
            
            Cell ex5 = exampleRow.createCell(COL_NOTES);
            ex5.setCellValue("مثال - احذف هذا الصف");
            ex5.setCellStyle(exampleStyle);
            
            // Set column widths
            sheet.setColumnWidth(COL_SERVICE_NAME, 40 * 256);
            sheet.setColumnWidth(COL_SERVICE_CODE, 20 * 256);
            sheet.setColumnWidth(COL_CATEGORY, 25 * 256);
            sheet.setColumnWidth(COL_UNIT_PRICE, 15 * 256);
            sheet.setColumnWidth(COL_QUANTITY, 15 * 256);
            sheet.setColumnWidth(COL_NOTES, 50 * 256);
            
            // Add instructions sheet
            createInstructionsSheet(workbook, contract);
            
            // Write to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            
            byte[] result = outputStream.toByteArray();
            log.info("[PriceListTemplate] Template generated: {} bytes", result.length);
            
            return result;
        }
    }
    
    private void createInstructionsSheet(XSSFWorkbook workbook, ProviderContract contract) {
        XSSFSheet sheet = workbook.createSheet("التعليمات");
        sheet.setRightToLeft(true);
        
        CellStyle titleStyle = workbook.createCellStyle();
        Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 14);
        titleStyle.setFont(titleFont);
        
        int rowNum = 0;
        
        // Contract info
        Row row0 = sheet.createRow(rowNum++);
        row0.createCell(0).setCellValue("معلومات العقد:");
        row0.getCell(0).setCellStyle(titleStyle);
        
        Row row1 = sheet.createRow(rowNum++);
        row1.createCell(0).setCellValue("رقم العقد: " + (contract.getContractCode() != null ? contract.getContractCode() : contract.getId()));
        
        Row row2 = sheet.createRow(rowNum++);
        String providerName = contract.getProvider() != null ? contract.getProvider().getName() : "غير محدد";
        row2.createCell(0).setCellValue("مقدم الخدمة: " + providerName);
        
        rowNum++;
        
        // Instructions
        Row row3 = sheet.createRow(rowNum++);
        row3.createCell(0).setCellValue("تعليمات الاستخدام:");
        row3.getCell(0).setCellStyle(titleStyle);
        
        sheet.createRow(rowNum++).createCell(0).setCellValue("1. العمود الوحيد الإلزامي هو: service_name (اسم الخدمة)");
        sheet.createRow(rowNum++).createCell(0).setCellValue("2. باقي الأعمدة اختيارية");
        sheet.createRow(rowNum++).createCell(0).setCellValue("3. إذا تركت السعر فارغاً، سيتم حفظه كصفر");
        sheet.createRow(rowNum++).createCell(0).setCellValue("4. إذا تركت الكمية فارغة، سيتم حفظها كصفر");
        sheet.createRow(rowNum++).createCell(0).setCellValue("5. العملة ثابتة (LYD) - لا تكتبها في الإكسيل");
        sheet.createRow(rowNum++).createCell(0).setCellValue("6. احذف صف المثال قبل الرفع");
        
        sheet.setColumnWidth(0, 80 * 256);
    }
    
    private CellStyle createHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }
    
    private CellStyle createRequiredHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.CENTER);
        return style;
    }
    
    private CellStyle createExampleStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LIGHT_YELLOW.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font font = workbook.createFont();
        font.setItalic(true);
        font.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
        style.setFont(font);
        return style;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // IMPORT FROM EXCEL - SIMPLIFIED
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Import pricing items from Excel template - SIMPLIFIED
     * 
     * Rules:
     * - service_name is REQUIRED
     * - unit_price defaults to 0 if empty
     * - quantity defaults to 0 if empty
     * - Empty rows are skipped
     * - No medical service lookup - just text storage
     */
    @Transactional
    public ExcelImportResult importFromExcel(Long contractId, MultipartFile file) {
        log.info("[PriceListImport] Starting import for contract ID: {} from file: {}", 
                contractId, file.getOriginalFilename());
        
        ImportSummary summary = ImportSummary.builder()
                .totalRows(0)
                .created(0)
                .updated(0)
                .skipped(0)
                .rejected(0)
                .failed(0)
                .build();
        List<ImportError> errors = new ArrayList<>();
        
        // Validate file
        if (file == null || file.isEmpty()) {
            return buildErrorResult(summary, errors, "الملف فارغ");
        }
        
        // Validate contract
        ProviderContract contract = contractRepository.findById(Objects.requireNonNull(contractId))
                .orElseThrow(() -> new BusinessRuleException("العقد غير موجود"));
        
        if (Boolean.FALSE.equals(contract.getActive())) {
            throw new BusinessRuleException("لا يمكن استيراد الأسعار لعقد غير نشط");
        }
        
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            // Find the data sheet
            Sheet sheet = workbook.getSheet(SHEET_NAME);
            if (sheet == null) {
                // Try first sheet as fallback
                sheet = workbook.getSheetAt(0);
            }
            
            if (sheet == null) {
                return buildErrorResult(summary, errors, "لم يتم العثور على ورقة البيانات");
            }
            
            // Find header row and validate service_name column exists
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                return buildErrorResult(summary, errors, "لم يتم العثور على صف العناوين");
            }
            
            // Find column indices (flexible - supports both English and Arabic)
            Map<String, Integer> columnIndices = findColumnIndices(headerRow);
            
            if (columnIndices.get("service_name") == null) {
                errors.add(ImportError.builder()
                        .rowNumber(0)
                        .errorType(ErrorType.MISSING_REQUIRED)
                        .columnName("service_name")
                        .messageAr("عمود اسم الخدمة مفقود")
                        .messageEn("service_name column is missing")
                        .build());
                return buildErrorResult(summary, errors, "عمود اسم الخدمة مفقود");
            }
            
            // Process data rows (skip header row)
            int lastRow = sheet.getLastRowNum();
            summary.setTotalRows(lastRow); // Excluding header
            
            log.info("[PriceListImport] Processing {} rows", lastRow);
            
            for (int rowNum = 1; rowNum <= lastRow; rowNum++) {
                Row row = sheet.getRow(rowNum);
                
                if (isEmptyRow(row)) {
                    summary.setSkipped(summary.getSkipped() + 1);
                    continue;
                }
                
                try {
                    ProviderContractPricingItem pricing = parseRow(row, rowNum, columnIndices, contract, errors);
                    
                    if (pricing != null) {
                        pricingRepository.save(pricing);
                        summary.setCreated(summary.getCreated() + 1);
                        log.debug("[PriceListImport] Created pricing: {}", pricing.getServiceName());
                    } else {
                        summary.setRejected(summary.getRejected() + 1);
                    }
                    
                } catch (Exception e) {
                    log.error("[PriceListImport] Error processing row {}: {}", rowNum, e.getMessage());
                    errors.add(ImportError.builder()
                            .rowNumber(rowNum)
                            .errorType(ErrorType.PROCESSING_ERROR)
                            .messageAr("خطأ في معالجة الصف: " + e.getMessage())
                            .messageEn("Error processing row: " + e.getMessage())
                            .build());
                    summary.setFailed(summary.getFailed() + 1);
                }
            }
            
            String messageAr = String.format("تم إنشاء %d بند، تخطي %d، رفض %d", 
                    summary.getCreated(), summary.getSkipped(), summary.getRejected());
            String messageEn = String.format("Created %d items, skipped %d, rejected %d",
                    summary.getCreated(), summary.getSkipped(), summary.getRejected());
            
            log.info("[PriceListImport] Import completed: {}", messageEn);
            
            return ExcelImportResult.builder()
                    .summary(summary)
                    .errors(errors)
                    .success(summary.getCreated() > 0)
                    .messageAr(messageAr)
                    .messageEn(messageEn)
                    .build();
                    
        } catch (IOException e) {
            log.error("[PriceListImport] Failed to read Excel file", e);
            throw new BusinessRuleException("فشل قراءة ملف Excel: " + e.getMessage());
        }
    }
    
    private Map<String, Integer> findColumnIndices(Row headerRow) {
        Map<String, Integer> indices = new HashMap<>();
        
        for (int i = 0; i <= headerRow.getLastCellNum(); i++) {
            Cell cell = headerRow.getCell(i);
            if (cell == null) continue;
            
            String value = getCellStringValue(cell).toLowerCase().trim();
            
            // service_name detection
            if (value.contains("service_name") || value.contains("اسم الخدمة")) {
                indices.put("service_name", i);
            }
            // service_code detection
            else if (value.contains("service_code") || value.contains("رمز الخدمة") || value.contains("كود")) {
                indices.put("service_code", i);
            }
            // category detection
            else if (value.contains("category") || value.contains("التصنيف") || value.contains("تصنيف") || value.contains("الفئة")) {
                indices.put("category", i);
            }
            // unit_price detection
            else if (value.contains("unit_price") || value.contains("السعر") || value.contains("price")) {
                indices.put("unit_price", i);
            }
            // quantity detection
            else if (value.contains("quantity") || value.contains("الكمية") || value.contains("كمية")) {
                indices.put("quantity", i);
            }
            // notes detection
            else if (value.contains("notes") || value.contains("ملاحظات")) {
                indices.put("notes", i);
            }
        }
        
        log.debug("[PriceListImport] Found columns: {}", indices);
        return indices;
    }
    
    private boolean isEmptyRow(Row row) {
        if (row == null) return true;
        
        for (int i = row.getFirstCellNum(); i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String value = getCellStringValue(cell);
                if (value != null && !value.trim().isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }
    
    private ProviderContractPricingItem parseRow(
            Row row,
            int rowNum,
            Map<String, Integer> columnIndices,
            ProviderContract contract,
            List<ImportError> errors
    ) {
        // Get service name (REQUIRED)
        Integer serviceNameIdx = columnIndices.get("service_name");
        String serviceName = serviceNameIdx != null ? getCellStringValue(row.getCell(serviceNameIdx)) : null;
        
        if (serviceName == null || serviceName.trim().isEmpty()) {
            // Skip rows without service name - they might be example rows
            if (rowNum == 1) {
                // First data row might be example, just skip silently
                return null;
            }
            errors.add(ImportError.builder()
                    .rowNumber(rowNum)
                    .errorType(ErrorType.MISSING_REQUIRED)
                    .columnName("service_name")
                    .messageAr("اسم الخدمة مطلوب")
                    .messageEn("Service name is required")
                    .build());
            return null;
        }
        
        serviceName = serviceName.trim();
        
        // Get unit_price (optional, default 0)
        BigDecimal unitPrice = BigDecimal.ZERO;
        Integer unitPriceIdx = columnIndices.get("unit_price");
        if (unitPriceIdx != null) {
            Cell priceCell = row.getCell(unitPriceIdx);
            if (priceCell != null) {
                try {
                    if (priceCell.getCellType() == CellType.NUMERIC) {
                        unitPrice = BigDecimal.valueOf(priceCell.getNumericCellValue());
                    } else {
                        String priceStr = getCellStringValue(priceCell);
                        if (priceStr != null && !priceStr.trim().isEmpty()) {
                            unitPrice = new BigDecimal(priceStr.trim());
                        }
                    }
                } catch (NumberFormatException e) {
                    // Keep default 0
                    log.debug("[PriceListImport] Invalid price at row {}, using 0", rowNum);
                }
            }
        }
        
        // Get quantity (optional, default 0)
        int quantity = 0;
        Integer quantityIdx = columnIndices.get("quantity");
        if (quantityIdx != null) {
            Cell quantityCell = row.getCell(quantityIdx);
            if (quantityCell != null) {
                try {
                    if (quantityCell.getCellType() == CellType.NUMERIC) {
                        quantity = (int) quantityCell.getNumericCellValue();
                    } else {
                        String qtyStr = getCellStringValue(quantityCell);
                        if (qtyStr != null && !qtyStr.trim().isEmpty()) {
                            quantity = Integer.parseInt(qtyStr.trim());
                        }
                    }
                } catch (NumberFormatException e) {
                    // Keep default 0
                }
            }
        }
        
        // Get notes (optional)
        String notes = null;
        Integer notesIdx = columnIndices.get("notes");
        if (notesIdx != null) {
            notes = getCellStringValue(row.getCell(notesIdx));
            if (notes != null) notes = notes.trim();
        }
        
        // Get service_code (optional)
        String serviceCode = null;
        Integer serviceCodeIdx = columnIndices.get("service_code");
        if (serviceCodeIdx != null) {
            serviceCode = getCellStringValue(row.getCell(serviceCodeIdx));
            if (serviceCode != null) serviceCode = serviceCode.trim();
        }
        
        // Get category (optional)
        String categoryName = null;
        Integer categoryIdx = columnIndices.get("category");
        if (categoryIdx != null) {
            categoryName = getCellStringValue(row.getCell(categoryIdx));
            if (categoryName != null) categoryName = categoryName.trim();
        }
        
        // Create pricing item - WITH medical service lookup attempt
        MedicalService medicalService = null;
        
        // 1. Try lookup by Code
        if (serviceCode != null && !serviceCode.isEmpty()) {
            medicalService = medicalServiceRepository.findByCode(serviceCode).orElse(null);
        }
        
        // 2. Fallback: Try lookup by Name (if code didn't match)
        if (medicalService == null && serviceName != null) {
            medicalService = medicalServiceRepository.findByName(serviceName).orElse(null);
            // Also try English name if needed, but repository findByName usually checks primary name
        }
        
        // Return constructed object
        return ProviderContractPricingItem.builder()
                .contract(contract)
                .serviceName(serviceName)
                .serviceCode(serviceCode)
                .categoryName(categoryName) // This could be populated from MedicalService if linked, but keep explicit import
                .contractPrice(unitPrice)
                .quantity(quantity)
                .notes(notes)
                .medicalService(medicalService) // <--- CRITICAL FIX: Link to system taxonomy
                .active(true)
                .build();
    }
    
    private String getCellStringValue(Cell cell) {
        if (cell == null) return null;
        
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getLocalDateTimeCellValue().toString();
                }
                double numValue = cell.getNumericCellValue();
                if (numValue == Math.floor(numValue)) {
                    return String.valueOf((long) numValue);
                }
                return String.valueOf(numValue);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    return String.valueOf(cell.getNumericCellValue());
                }
            case BLANK:
            default:
                return null;
        }
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
