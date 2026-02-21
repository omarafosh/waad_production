package com.waad.tba.modules.medicaltaxonomy.service;

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
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Collectors;

/**
 * Medical Services Excel Template Generator and Import Service
 * 
 * STRICT RULES:
 * - Templates MUST be downloaded from system
 * - Create-only mode (upsert if code exists)
 * - Service code is required and unique
 * - Category lookup is MANDATORY
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MedicalServiceExcelTemplateService {
    
    private final ExcelTemplateService templateService;
    private final ExcelParserService parserService;
    private final MedicalServiceRepository serviceRepository;
    private final MedicalCategoryRepository categoryRepository;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // TEMPLATE GENERATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Generate Medical Services import template
     */
    public byte[] generateTemplate() throws IOException {
        log.info("[MedicalServiceTemplate] Generating Excel template");
        
        List<ExcelTemplateColumn> columns = buildColumnDefinitions();
        List<ExcelLookupData> lookups = buildLookupSheets();
        
        return templateService.generateTemplate("Medical Services / الخدمات الطبية", columns, lookups);
    }
    
    private List<ExcelTemplateColumn> buildColumnDefinitions() {
        return List.of(
            // Service Code - Mandatory & Unique
            ExcelTemplateColumn.builder()
                .name("code")
                .nameAr("رمز الخدمة")
                .type(ColumnType.TEXT)
                .required(true)
                .example("SRV-CARDIO-001")
                .description("رمز الخدمة الفريد (إجباري) - لا يمكن تعديله لاحقاً")
                .descriptionAr("رمز الخدمة الفريد (إجباري)")
                .width(18)
                .build(),
                
            // Name - Mandatory (Arabic-only system)
            ExcelTemplateColumn.builder()
                .name("name")
                .nameAr("اسم الخدمة")
                .type(ColumnType.TEXT)
                .required(true)
                .example("فحص القلب الشامل")
                .description("اسم الخدمة (إجباري)")
                .descriptionAr("اسم الخدمة (إجباري)")
                .width(35)
                .build(),
                
            // Category Code - Mandatory Lookup
            ExcelTemplateColumn.builder()
                .name("category_code")
                .nameAr("رمز التصنيف")
                .type(ColumnType.TEXT)
                .required(true)
                .example("CONSULTATION")
                .description("رمز التصنيف (إجباري) - راجع ورقة التصنيفات")
                .descriptionAr("رمز التصنيف من ورقة Lookup (إجباري)")
                .width(20)
                .build(),
                
            // Description - Optional
            ExcelTemplateColumn.builder()
                .name("description")
                .nameAr("الوصف")
                .type(ColumnType.TEXT)
                .required(false)
                .example("فحص شامل للقلب يتضمن تخطيط القلب...")
                .description("وصف الخدمة (اختياري)")
                .descriptionAr("وصف الخدمة (اختياري)")
                .width(40)
                .build(),
                
            // Price - Optional
            ExcelTemplateColumn.builder()
                .name("base_price")
                .nameAr("السعر المرجعي")
                .type(ColumnType.NUMBER)
                .required(false)
                .example("150.00")
                .description("السعر المرجعي بالدينار (اختياري)")
                .descriptionAr("السعر المرجعي - للإشارة فقط (اختياري)")
                .width(15)
                .build(),
                
            // Active - Optional Boolean
            ExcelTemplateColumn.builder()
                .name("active")
                .nameAr("نشط")
                .type(ColumnType.TEXT)
                .required(false)
                .example("نعم")
                .description("نعم / لا (الافتراضي: نعم)")
                .descriptionAr("هل الخدمة نشطة؟ (نعم/لا)")
                .width(12)
                .build()
        );
    }
    
    private List<ExcelLookupData> buildLookupSheets() {
        // Load categories from database
        List<MedicalCategory> categories = categoryRepository.findByActiveTrue();
        
        List<List<String>> categoryData = categories.stream()
            .map(cat -> Arrays.<String>asList(
                cat.getCode(),
                cat.getName() != null ? cat.getName() : ""
            ))
            .collect(Collectors.toList());
        
        return List.of(
            ExcelLookupData.builder()
                .sheetName("التصنيفات")
                .headers(Arrays.asList("رمز التصنيف", "اسم التصنيف"))
                .data(categoryData)
                .description("استخدم رمز التصنيف (العمود الأول) في عمود category_code")
                .descriptionAr("قائمة التصنيفات المتاحة - استخدم الرمز في ملف البيانات")
                .build()
        );
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // IMPORT FROM EXCEL
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Import medical services from Excel template
     */
    @Transactional
    public ExcelImportResult importFromExcel(MultipartFile file) {
        log.info("[MedicalServiceImport] Starting import from file: {}", file.getOriginalFilename());
        
        // Validate file
        if (file.isEmpty()) {
            throw new BusinessRuleException("الملف فارغ");
        }
        
        ImportSummary summary = ImportSummary.builder()
                .totalRows(0)
                .created(0)
                .updated(0)
                .skipped(0)
                .failed(0)
                .build();
        
        List<ImportError> errors = new ArrayList<>();
        
        try {
            Workbook workbook = parserService.openWorkbook(file);
            Sheet dataSheet = parserService.getDataSheet(workbook);
            
            // Load category cache for lookup
            Map<String, MedicalCategory> categoryCache = loadCategoryCache();
            
            // Process data rows
            int lastRow = dataSheet.getLastRowNum();
            log.info("[MedicalServiceImport] Processing {} rows", lastRow);
            
            for (int rowNum = 2; rowNum <= lastRow; rowNum++) { // Start from row 2 (after header)
                Row row = dataSheet.getRow(rowNum);
                if (row == null || parserService.isEmptyRow(row)) {
                    continue;
                }
                
                summary.setTotalRows(summary.getTotalRows() + 1);
                
                try {
                    processRow(row, rowNum + 1, categoryCache, summary, errors);
                } catch (Exception e) {
                    log.warn("[MedicalServiceImport] Row {} failed: {}", rowNum + 1, e.getMessage());
                    summary.setFailed(summary.getFailed() + 1);
                    errors.add(ImportError.builder()
                            .rowNumber(rowNum + 1)
                            .errorType(ErrorType.PROCESSING_ERROR)
                            .messageAr(e.getMessage())
                            .messageEn(e.getMessage())
                            .build());
                }
            }
            
            log.info("[MedicalServiceImport] Import completed: {} total, {} created, {} updated, {} failed",
                    summary.getTotalRows(), summary.getCreated(), summary.getUpdated(), summary.getFailed());
            
            return ExcelImportResult.builder()
                    .summary(summary)
                    .errors(errors)
                    .success(summary.getCreated() + summary.getUpdated() > 0)
                    .messageAr(String.format("تم استيراد %d خدمة", summary.getCreated() + summary.getUpdated()))
                    .messageEn(String.format("Imported %d services", summary.getCreated() + summary.getUpdated()))
                    .build();
            
        } catch (IOException e) {
            log.error("[MedicalServiceImport] Failed to read Excel file", e);
            throw new BusinessRuleException("فشل قراءة ملف Excel");
        }
    }
    
    private void processRow(Row row, int rowNumber, Map<String, MedicalCategory> categoryCache, 
                           ImportSummary summary, List<ImportError> errors) {
        // Read columns based on new template structure
        String code = getCellValue(row, 0);           // Column A: code
        String name = getCellValue(row, 1);           // Column B: name
        String categoryCode = getCellValue(row, 2);   // Column C: category_code
        String description = getCellValue(row, 3);    // Column D: description
        String priceStr = getCellValue(row, 4);       // Column E: base_price
        String activeStr = getCellValue(row, 5);      // Column F: active
        
        // Validate required fields
        if (code == null || code.trim().isEmpty()) {
            throw new BusinessRuleException("رمز الخدمة مطلوب");
        }
        
        if (name == null || name.trim().isEmpty()) {
            throw new BusinessRuleException("اسم الخدمة مطلوب");
        }
        
        if (categoryCode == null || categoryCode.trim().isEmpty()) {
            throw new BusinessRuleException("رمز التصنيف مطلوب");
        }
        
        // Lookup category by code
        MedicalCategory category = categoryCache.get(categoryCode.trim());
        if (category == null) {
            throw new BusinessRuleException("التصنيف غير موجود: " + categoryCode);
        }
        
        // Parse price
        BigDecimal basePrice = null;
        if (priceStr != null && !priceStr.trim().isEmpty()) {
            try {
                basePrice = new BigDecimal(priceStr.trim());
                if (basePrice.compareTo(BigDecimal.ZERO) < 0) {
                    throw new BusinessRuleException("السعر يجب أن يكون أكبر من أو يساوي صفر");
                }
            } catch (NumberFormatException e) {
                throw new BusinessRuleException("السعر غير صحيح: " + priceStr);
            }
        }
        
        // Parse active flag
        boolean active = parseBoolean(activeStr, true); // Default to true
        
        // Check if service exists (upsert logic)
        Optional<MedicalService> existingOpt = serviceRepository.findByCode(code.trim());
        
        MedicalService service;
        boolean isUpdate = false;
        
        if (existingOpt.isPresent()) {
            // Update existing
            service = existingOpt.get();
            isUpdate = true;
        } else {
            // Create new
            service = new MedicalService();
            service.setCode(code.trim());
        }
        
        // Set/Update fields
        service.setName(name.trim());
        service.setCategoryId(category.getId());
        if (description != null && !description.trim().isEmpty()) {
            service.setDescription(description.trim());
        }
        service.setBasePrice(basePrice);
        service.setActive(active);
        
        // Save
        serviceRepository.save(service);
        
        if (isUpdate) {
            summary.setUpdated(summary.getUpdated() + 1);
        } else {
            summary.setCreated(summary.getCreated() + 1);
        }
    }
    
    private Map<String, MedicalCategory> loadCategoryCache() {
        List<MedicalCategory> categories = categoryRepository.findAll();
        Map<String, MedicalCategory> cache = new HashMap<>();
        
        for (MedicalCategory cat : categories) {
            // Index by code (primary lookup)
            if (cat.getCode() != null) {
                cache.put(cat.getCode().trim(), cat);
            }
            // Also index by name for backward compatibility
            if (cat.getName() != null) {
                cache.put(cat.getName().trim(), cat);
            }
        }
        
        return cache;
    }
    
    private String getCellValue(Row row, int columnIndex) {
        return parserService.getCellValueAsString(row.getCell(columnIndex));
    }
    
    private boolean parseBoolean(String value, boolean defaultValue) {
        if (value == null || value.trim().isEmpty()) {
            return defaultValue;
        }
        
        String normalized = value.trim().toLowerCase();
        return normalized.equals("yes") || 
               normalized.equals("نعم") || 
               normalized.equals("true") || 
               normalized.equals("1");
    }
}
