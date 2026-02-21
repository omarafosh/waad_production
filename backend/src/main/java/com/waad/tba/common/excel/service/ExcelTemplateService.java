package com.waad.tba.common.excel.service;

import com.waad.tba.common.excel.dto.ExcelLookupData;
import com.waad.tba.common.excel.dto.ExcelTemplateColumn;
import com.waad.tba.common.excel.dto.ExcelTemplateColumn.ColumnType;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.xssf.usermodel.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

/**
 * Unified service for generating Excel templates and parsing imports
 */
@Slf4j
@Service
public class ExcelTemplateService {
    
    private static final String TEMPLATE_VERSION = "1.1.0";
    private static final String METADATA_SHEET = "Metadata";
    private static final String DATA_SHEET = "Data";
    private static final String INSTRUCTIONS_SHEET = "Instructions / التعليمات";
    
    /**
     * Generate Excel template workbook
     */
    public byte[] generateTemplate(
            String moduleName,
            List<ExcelTemplateColumn> columns,
            List<ExcelLookupData> lookups
    ) throws IOException {
        log.info("[ExcelTemplate] Generating branded template for: {}", moduleName);
        
        XSSFWorkbook workbook = new XSSFWorkbook();
        
        // 1. Create Styles
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle requiredHeaderStyle = createRequiredHeaderStyle(workbook);
        CellStyle exampleStyle = createExampleStyle(workbook);
        CellStyle lookupHeaderStyle = createLookupHeaderStyle(workbook);
        
        // 2. Create sheets
        createInstructionsSheet(workbook, moduleName, columns);
        createMetadataSheet(workbook, moduleName, columns);
        createDataSheet(workbook, columns, headerStyle, requiredHeaderStyle, exampleStyle);
        
        if (lookups != null && !lookups.isEmpty()) {
            for (ExcelLookupData lookup : lookups) {
                createLookupSheet(workbook, lookup, lookupHeaderStyle);
            }
        }
        
        // 3. Finalize
        workbook.setActiveSheet(workbook.getSheetIndex(INSTRUCTIONS_SHEET));
        
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        workbook.write(outputStream);
        workbook.close();
        
        return outputStream.toByteArray();
    }

    private void createInstructionsSheet(XSSFWorkbook workbook, String moduleName, List<ExcelTemplateColumn> columns) {
        Sheet sheet = workbook.createSheet(INSTRUCTIONS_SHEET);
        sheet.setRightToLeft(true);
        
        CellStyle titleStyle = workbook.createCellStyle();
        Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 16);
        titleFont.setColor(IndexedColors.DARK_BLUE.getIndex());
        titleStyle.setFont(titleFont);
        
        int rowNum = 0;
        Row titleRow = sheet.createRow(rowNum++);
        titleRow.createCell(0).setCellValue("دليل تعبئة نموذج: " + moduleName);
        titleRow.getCell(0).setCellStyle(titleStyle);
        
        rowNum++;
        Row infoRow = sheet.createRow(rowNum++);
        infoRow.createCell(0).setCellValue("يرجى اتباع التعليمات التالية لضمان نجاح عملية الاستيراد:");
        
        rowNum++;
        String[] rules = {
            "1. الحقول المميزة باللون الأصفر والنجمة (*) هي حقول إجبارية.",
            "2. لا تقم بتغيير مسميات الأعمدة في ورقة البيانات (Data).",
            "3. يجب الالتزام بصيغ التواريخ المطلوبة (YYYY-MM-DD).",
            "4. استخدم القيم المتاحة في القوائم المنسدلة إن وجدت."
        };
        for (String rule : rules) {
            sheet.createRow(rowNum++).createCell(0).setCellValue(rule);
        }
        
        rowNum++;
        CellStyle headerStyle = createLookupHeaderStyle(workbook);
        Row headerRow = sheet.createRow(rowNum++);
        headerRow.createCell(0).setCellValue("الحقل");
        headerRow.createCell(1).setCellValue("الوصف");
        headerRow.createCell(2).setCellValue("إلزامي؟");
        for (int i=0; i<3; i++) headerRow.getCell(i).setCellStyle(headerStyle);
        
        for (ExcelTemplateColumn col : columns) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue((String) (col.getNameAr() != null ? col.getNameAr() : col.getName()));
            row.createCell(1).setCellValue(col.getDescriptionAr() != null ? col.getDescriptionAr() : "");
            row.createCell(2).setCellValue(col.isRequired() ? "نعم" : "لا");
        }
        
        sheet.autoSizeColumn(0);
        sheet.autoSizeColumn(1);
        sheet.autoSizeColumn(2);
    }
    
    private void createMetadataSheet(XSSFWorkbook workbook, String moduleName, List<ExcelTemplateColumn> columns) {
        Sheet sheet = workbook.createSheet(METADATA_SHEET);
        int rowNum = 0;
        sheet.createRow(rowNum++).createCell(0).setCellValue("TBA-WAAD System Metadata");
        sheet.createRow(rowNum++).createCell(0).setCellValue("Module: " + moduleName);
        sheet.createRow(rowNum++).createCell(0).setCellValue("Version: " + TEMPLATE_VERSION);
        
        workbook.setSheetHidden(workbook.getSheetIndex(METADATA_SHEET), true);
    }
    
    private void createDataSheet(XSSFWorkbook workbook, List<ExcelTemplateColumn> columns, CellStyle headerStyle, CellStyle requiredHeaderStyle, CellStyle exampleStyle) {
        Sheet sheet = workbook.createSheet(DATA_SHEET);
        
        Row headerRow = sheet.createRow(0);
        Row exampleRow = sheet.createRow(1);
        
        for (int i = 0; i < columns.size(); i++) {
            ExcelTemplateColumn column = columns.get(i);
            Cell headerCell = headerRow.createCell(i);
            String text = (column.getNameAr() != null ? column.getNameAr() + "\n" : "") + column.getName();
            if (column.isRequired()) text = "* " + text;
            headerCell.setCellValue(text);
            headerCell.setCellStyle(column.isRequired() ? requiredHeaderStyle : headerStyle);
            
            Cell exampleCell = exampleRow.createCell(i);
            if (column.getExample() != null) {
                exampleCell.setCellValue(column.getExample());
                exampleCell.setCellStyle(exampleStyle);
            }
            sheet.setColumnWidth(i, column.getWidth() * 256);
            if (column.getType() == ColumnType.ENUM && column.getAllowedValues() != null) {
                addDropdownValidation(sheet, i, column.getAllowedValues());
            }
        }
        sheet.createFreezePane(0, 1);
    }
    
    private void createLookupSheet(XSSFWorkbook workbook, ExcelLookupData lookup, CellStyle headerStyle) {
        String name = lookup.getSheetNameAr() != null ? lookup.getSheetNameAr() : lookup.getSheetName();
        Sheet sheet = workbook.createSheet(name);
        sheet.setRightToLeft(true);
        Row headerRow = sheet.createRow(0);
        for (int i=0; i<lookup.getHeaders().size(); i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(lookup.getHeaders().get(i));
            cell.setCellStyle(headerStyle);
        }
        int rowNum = 1;
        for (List<String> dataRow : lookup.getData()) {
            Row row = sheet.createRow(rowNum++);
            for (int i=0; i<dataRow.size(); i++) row.createCell(i).setCellValue(dataRow.get(i));
        }
        for (int i=0; i<lookup.getHeaders().size(); i++) sheet.autoSizeColumn(i);
    }
    
    private void addDropdownValidation(Sheet sheet, int columnIndex, List<String> allowedValues) {
        DataValidationHelper helper = sheet.getDataValidationHelper();
        DataValidationConstraint constraint = helper.createExplicitListConstraint(allowedValues.toArray(new String[0]));
        CellRangeAddressList addressList = new CellRangeAddressList(2, 5000, columnIndex, columnIndex);
        DataValidation validation = helper.createValidation(constraint, addressList);
        validation.setShowErrorBox(true);
        sheet.addValidationData(validation);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STYLES
    // ═══════════════════════════════════════════════════════════════════════════

    private CellStyle createHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }
    
    private CellStyle createRequiredHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LEMON_CHIFFON.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.MEDIUM);
        style.setBottomBorderColor(IndexedColors.GOLD.getIndex());
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.RED.getIndex());
        style.setFont(font);
        return style;
    }
    
    private CellStyle createExampleStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font font = workbook.createFont();
        font.setItalic(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        return style;
    }
    
    private CellStyle createLookupHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        return style;
    }
}
