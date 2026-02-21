package com.waad.tba.modules.providercontract.service;

import com.waad.tba.common.excel.dto.ExcelImportResult;
import com.waad.tba.common.excel.dto.ExcelImportResult.ImportError;
import com.waad.tba.common.excel.dto.ExcelImportResult.ImportError.ErrorType;
import com.waad.tba.common.excel.dto.ExcelImportResult.ImportSummary;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.providercontract.dto.*;
import com.waad.tba.modules.providercontract.entity.PricingImportLog;
import com.waad.tba.modules.providercontract.entity.ProviderContract;
import com.waad.tba.modules.providercontract.entity.ProviderContractPricingItem;
import com.waad.tba.modules.providercontract.repository.PricingImportLogRepository;
import com.waad.tba.modules.providercontract.repository.ProviderContractPricingItemRepository;
import com.waad.tba.modules.providercontract.repository.ProviderContractRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.scheduling.annotation.Async;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
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
    private final PricingImportLogRepository importLogRepository;
    private final ProviderRepository providerRepository;
    
    private PriceListExcelTemplateService self;

    @org.springframework.beans.factory.annotation.Autowired
    public void setSelf(@org.springframework.context.annotation.Lazy PriceListExcelTemplateService self) {
        this.self = self;
    }
    
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
        log.info("[PriceListTemplate] Generating multi-sheet template for contract ID: {}", contractId);
        
        if (contractId == null) {
            throw new BusinessRuleException("معرف العقد غير صالح");
        }
        
        ProviderContract contract = contractRepository.findById(contractId)
                .filter(c -> Boolean.TRUE.equals(c.getActive()))
                .orElseThrow(() -> new BusinessRuleException("العقد غير موجود أو غير نشط / Contract not found or inactive"));

        // ARCHITECTURAL FIX: Extract data to DTO within transactional service
        // This prevents LazyInitializationException when accessing provider/employer details
        ContractTemplateContext context = ContractTemplateContext.builder()
                .contractId(contract.getId())
                .contractCode(contract.getContractCode())
                .providerName(contract.getProvider() != null ? contract.getProvider().getName() : "Unknown")
                .providerNameEn(contract.getProvider() != null ? contract.getProvider().getName() : "Unknown")
                .contractStatus(contract.getStatus().name())
                .build();
        
        log.info("[PriceListTemplate] Built context for template: {}", context.getContractCode());
        
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            log.info("[PriceListTemplate] Workbook created, adding sheets...");
            
            // 1. Sheet: Instructions
            log.info("[PriceListTemplate] Creating instructions sheet...");
            createInstructionsSheet(workbook, context);
            log.info("[PriceListTemplate] Instructions sheet created.");

            // 2. Sheet: Data Entry (Pricing_Template)
            log.info("[PriceListTemplate] Creating data sheet...");
            createDataSheet(workbook);
            log.info("[PriceListTemplate] Data sheet created.");
            
            // 3. Sheet: Providers Lookup
            log.info("[PriceListTemplate] Creating providers lookup sheet...");
            createProvidersSheet(workbook);
            log.info("[PriceListTemplate] Providers lookup sheet created.");
            
            // Set active sheet to Instructions
            workbook.setActiveSheet(0);
            
            // Write to byte array
            log.info("[PriceListTemplate] Writing workbook to output stream...");
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            
            byte[] result = outputStream.toByteArray();
            log.info("[PriceListTemplate] Template generated successfully for contract {}: {} bytes", contractId, result.length);
            return result;
        } catch (Exception e) {
            log.error("[PriceListTemplate] Error generating Excel template for contract " + contractId, e);
            throw e;
        }
    }
    
    private void createInstructionsSheet(XSSFWorkbook workbook, ContractTemplateContext context) {
        XSSFSheet sheet = workbook.createSheet("Instructions - التعليمات");
        sheet.setRightToLeft(true);
        
        CellStyle titleStyle = workbook.createCellStyle();
        Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 14);
        titleStyle.setFont(titleFont);
        
        int rowNum = 0;
        
        // 1. Contract info
        Row row0 = sheet.createRow(rowNum++);
        row0.createCell(0).setCellValue("معلومات العقد / Contract Info:");
        row0.getCell(0).setCellStyle(titleStyle);
        
        Row row1 = sheet.createRow(rowNum++);
        row1.createCell(0).setCellValue("رقم العقد: " + context.getContractCode());
        
        Row row2 = sheet.createRow(rowNum++);
        row2.createCell(0).setCellValue("مقدم الخدمة: " + context.getProviderName());
        
        rowNum++;
        
        // 2. Instructions
        Row row3 = sheet.createRow(rowNum++);
        row3.createCell(0).setCellValue("تعليمات الاستخدام:");
        row3.getCell(0).setCellStyle(titleStyle);
        
        String[] instructions = {
            "1. الحقول المميزة بالنجمة (★) هي حقول إلزامية في ورقة 'Pricing_Template'.",
            "2. 'اسم الخدمة' هو أهم حقل ويجب إدخاله بدقة.",
            "3. إذا تركت السعر فارغاً، سيتم حفظه كصفر.",
            "4. العملة ثابتة (LYD) - لا تكتب اختصار العملة في الخانات.",
            "5. يرجى عدم تغيير أسماء الأعمدة في السطر الأول لضمان نجاح المعالجة.",
            "6. يمكنك الرجوع لورقة 'Providers' لمعرفة تفاصيل مقدمي الخدمة."
        };

        for (String line : instructions) {
            sheet.createRow(rowNum++).createCell(0).setCellValue(line);
        }
        
        sheet.autoSizeColumn(0);
    }

    private void createDataSheet(XSSFWorkbook workbook) {
        XSSFSheet sheet = workbook.createSheet(SHEET_NAME);
        sheet.setRightToLeft(true);

        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle requiredStyle = createRequiredHeaderStyle(workbook);
        CellStyle exampleStyle = createExampleStyle(workbook);

        Row headerRow = sheet.createRow(0);

        // Headers
        String[] headers = {
            "service_name / اسم الخدمة ★",
            "service_code / رمز الخدمة",
            "category / التصنيف",
            "unit_price / السعر",
            "quantity / الكمية",
            "notes / ملاحظات"
        };

        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(i == COL_SERVICE_NAME ? requiredStyle : headerStyle);
            sheet.setColumnWidth(i, i == COL_NOTES ? 50 * 256 : 25 * 256);
        }

        // Add an example row
        Row exampleRow = sheet.createRow(1);
        exampleRow.createCell(COL_SERVICE_NAME).setCellValue("مثال: فحص شامل");
        exampleRow.createCell(COL_SERVICE_CODE).setCellValue("SRV-001");
        exampleRow.createCell(COL_CATEGORY).setCellValue("الفحوصات");
        exampleRow.createCell(COL_UNIT_PRICE).setCellValue(100.0);
        exampleRow.createCell(COL_QUANTITY).setCellValue(1);
        exampleRow.createCell(COL_NOTES).setCellValue("مثال لملاحظات - احذف هذا الصف");
        
        for (int i = 0; i < headers.length; i++) {
            Cell cell = exampleRow.getCell(i);
            if (cell != null) cell.setCellStyle(exampleStyle);
        }
        
        sheet.createFreezePane(0, 1);
    }

    private void createProvidersSheet(XSSFWorkbook workbook) {
        XSSFSheet sheet = workbook.createSheet("Providers - مقدمي الخدمة");
        sheet.setRightToLeft(true);

        Row headerRow = sheet.createRow(0);
        headerRow.createCell(0).setCellValue("كود مقدم الخدمة");
        headerRow.createCell(1).setCellValue("اسم مقدم الخدمة");
        
        CellStyle headerStyle = createHeaderStyle(workbook);
        headerRow.getCell(0).setCellStyle(headerStyle);
        headerRow.getCell(1).setCellStyle(headerStyle);

        List<Provider> providers = providerRepository.findAllActive();
        int rowNum = 1;
        for (Provider p : providers) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(p.getLicenseNumber() != null ? p.getLicenseNumber() : "");
            row.createCell(1).setCellValue(p.getName() != null ? p.getName() : "");
        }
        
        sheet.autoSizeColumn(0);
        sheet.autoSizeColumn(1);
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
        // LEGACY - Keeping for backward compatibility if needed, but Wizard uses preview/execute
        log.info("[PriceListImport] Starting legacy synchronous import for contract ID: {}", contractId);
        
        String batchId = UUID.randomUUID().toString();
        try {
            // Fix: Create log BEFORE async execution to prevent race condition
            createImportLog(batchId, contractId, file.getOriginalFilename(), file.getSize(), "system", null);
            
            File tempFile = saveToTempFile(file);
            executeImport(tempFile, batchId, contractId, "system", null);
            return ExcelImportResult.builder().success(true).messageEn("Import started in background with batch: " + batchId).build();
        } catch (Exception e) {
            return buildErrorResult(ImportSummary.builder().build(), new ArrayList<>(), e.getMessage());
        }
    }

    /**
     * Parse Excel and return preview data for the wizard
     */
    @Transactional(readOnly = true)
    public PricingImportPreviewDto parseAndPreview(Long contractId, MultipartFile file) throws IOException {
        log.info("[PriceListImport] Preview requested for contract: {}", contractId);
        
        ProviderContract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new BusinessRuleException("العقد غير موجود"));

        String batchId = UUID.randomUUID().toString();
        List<PricingImportPreviewDto.PricingImportRowDto> previewRows = new ArrayList<>();
        List<String> detectedColumns = new ArrayList<>();
        
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheet(SHEET_NAME);
            if (sheet == null) sheet = workbook.getSheetAt(0);
            if (sheet == null) throw new BusinessRuleException("لم يتم العثور على ورقة البيانات");

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) throw new BusinessRuleException("لم يتم العثور على صف العناوين");

            Map<String, Integer> columnIndices = findColumnIndices(headerRow);
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                String val = getCellStringValue(cell);
                if (val != null) detectedColumns.add(val.trim());
            }

            int lastRow = sheet.getLastRowNum();
            int previewLimit = Math.min(lastRow, 50);
            int newCount = 0, errorCount = 0;

            for (int rowNum = 1; rowNum <= lastRow; rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (isEmptyRow(row)) continue;

                List<ImportError> errors = new ArrayList<>();
                ProviderContractPricingItem pricing = parseRow(row, rowNum, columnIndices, contract, errors);
                
                if (rowNum <= previewLimit) {
                    previewRows.add(PricingImportPreviewDto.PricingImportRowDto.builder()
                            .rowNumber(rowNum)
                            .serviceName(pricing != null ? pricing.getServiceName() : null)
                            .serviceCode(pricing != null ? pricing.getServiceCode() : null)
                            .categoryName(pricing != null ? pricing.getCategoryName() : null)
                            .unitPrice(pricing != null && pricing.getContractPrice() != null ? pricing.getContractPrice().doubleValue() : 0.0)
                            .quantity(pricing != null ? pricing.getQuantity() : 0)
                            .status(errors.isEmpty() ? "NEW" : "ERROR")
                            .errors(errors.stream().map(ImportError::getMessageAr).toList())
                            .build());
                }

                if (errors.isEmpty()) newCount++;
                else errorCount++;
            }

            return PricingImportPreviewDto.builder()
                    .batchId(batchId)
                    .fileName(file.getOriginalFilename())
                    .totalRows(lastRow)
                    .newCount(newCount)
                    .errorCount(errorCount)
                    .detectedColumns(detectedColumns)
                    .previewRows(previewRows)
                    .canProceed(newCount > 0)
                    .build();
        }
    }

    /**
     * Execute import in background
     */
    @Async
    @Transactional
    public void executeImport(File file, String batchId, Long contractId, String username, Long userId) {
        log.info("[PriceListImport] Starting async import for batch: {}", batchId);
        
        try {
            ProviderContract contract = contractRepository.findById(contractId)
                    .orElseThrow(() -> new BusinessRuleException("العقد غير موجود"));

            // Note: Import log is created by the caller (Controller) BEFORE this async method starts
            // to prevent race conditions during frontend polling
            
            try (Workbook workbook = WorkbookFactory.create(file)) {
                Sheet sheet = workbook.getSheet(SHEET_NAME);
                if (sheet == null) sheet = workbook.getSheetAt(0);
                
                int totalRows = sheet.getLastRowNum();
                Row headerRow = sheet.getRow(0);
                Map<String, Integer> columnIndices = findColumnIndices(headerRow);

                int created = 0, updated = 0, skipped = 0, failed = 0;
                
                for (int rowNum = 1; rowNum <= totalRows; rowNum++) {
                    Row row = sheet.getRow(rowNum);
                    if (isEmptyRow(row)) { skipped++; continue; }

                    try {
                        List<ImportError> errors = new ArrayList<>();
                        ProviderContractPricingItem pricing = parseRow(row, rowNum, columnIndices, contract, errors);
                        
                        if (pricing != null && errors.isEmpty()) {
                            // Check if already exists (Simple check by Service Name in this contract)
                             Optional<ProviderContractPricingItem> existing = pricingRepository
                                    .findByContractIdAndServiceNameIgnoreCase(contractId, pricing.getServiceName());
                            
                            if (existing.isPresent()) {
                                ProviderContractPricingItem item = existing.get();
                                item.setContractPrice(pricing.getContractPrice());
                                item.setQuantity(pricing.getQuantity());
                                item.setServiceCode(pricing.getServiceCode());
                                item.setCategoryName(pricing.getCategoryName());
                                item.setNotes(pricing.getNotes());
                                pricingRepository.save(item);
                                updated++;
                            } else {
                                pricingRepository.save(pricing);
                                created++;
                            }
                        } else {
                            failed++;
                        }
                    } catch (Exception e) {
                        failed++;
                        log.error("[PriceListImport] Error row {}: {}", rowNum, e.getMessage());
                    }

                    // Update progress every 20 rows
                    if (rowNum % 20 == 0 || rowNum == totalRows) {
                        self.updateImportProgress(batchId, PricingImportLog.ImportStatus.PROCESSING, totalRows, created, updated, skipped, failed);
                    }
                }

                self.updateImportProgress(batchId, failed > 0 ? PricingImportLog.ImportStatus.PARTIAL : PricingImportLog.ImportStatus.COMPLETED, 
                        totalRows, created, updated, skipped, failed);
            }
        } catch (Exception e) {
            log.error("[PriceListImport] Fatal error in batch {}", batchId, e);
            self.markImportAsFailed(batchId, e.getMessage());
        } finally {
            if (file != null && file.exists()) file.delete();
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PricingImportLog createImportLog(String batchId, Long contractId, String fileName, long fileSize, String username, Long userId) {
        PricingImportLog logEntry = PricingImportLog.builder()
                .importBatchId(batchId)
                .contractId(contractId)
                .fileName(fileName)
                .fileSizeBytes(fileSize)
                .status(PricingImportLog.ImportStatus.PROCESSING)
                .startedAt(LocalDateTime.now())
                .importedByUserId(userId)
                .importedByUsername(username)
                .build();
        return importLogRepository.save(logEntry);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateImportProgress(String batchId, PricingImportLog.ImportStatus status, int total, int created, int updated, int skipped, int failed) {
        importLogRepository.findByImportBatchId(batchId).ifPresent(logEntry -> {
            logEntry.setStatus(status);
            logEntry.setTotalRows(total);
            logEntry.setCreatedCount(created);
            logEntry.setUpdatedCount(updated);
            logEntry.setSkippedCount(skipped);
            logEntry.setErrorCount(failed);
            if (status == PricingImportLog.ImportStatus.COMPLETED || status == PricingImportLog.ImportStatus.PARTIAL || status == PricingImportLog.ImportStatus.FAILED) {
                logEntry.setCompletedAt(LocalDateTime.now());
            }
            importLogRepository.saveAndFlush(logEntry);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markImportAsFailed(String batchId, String error) {
        importLogRepository.findByImportBatchId(batchId).ifPresent(logEntry -> {
            logEntry.setStatus(PricingImportLog.ImportStatus.FAILED);
            logEntry.setErrorMessage(error);
            logEntry.setCompletedAt(LocalDateTime.now());
            importLogRepository.saveAndFlush(logEntry);
        });
    }

    public File saveToTempFile(MultipartFile file) throws IOException {
        Path tempPath = Files.createTempFile("pricing_import_" + UUID.randomUUID(), ".xlsx");
        try (InputStream is = file.getInputStream()) {
            Files.copy(is, tempPath, StandardCopyOption.REPLACE_EXISTING);
        }
        return tempPath.toFile();
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
            if (medicalService == null) {
                medicalService = medicalServiceRepository.findByNameEn(serviceName).orElse(null);
            }
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

    @Transactional(readOnly = true)
    public PricingImportLog getImportLog(String batchId) {
        return importLogRepository.findByImportBatchId(batchId).orElse(null);
    }
}
