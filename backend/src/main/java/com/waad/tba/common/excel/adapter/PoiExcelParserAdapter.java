package com.waad.tba.common.excel.adapter;

import com.waad.tba.common.excel.service.ExcelParserService;
import com.waad.tba.common.exception.BusinessRuleException;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;

/**
 * تنفيذ خدمة تحليل Excel باستخدام مكتبة Apache POI.
 */
@Slf4j
@Component
public class PoiExcelParserAdapter implements ExcelParserService {

    @Override
    public void validateExcelFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessRuleException("الملف فارغ");
        }
        
        String filename = file.getOriginalFilename();
        if (filename == null || 
            (!filename.toLowerCase().endsWith(".xlsx") && !filename.toLowerCase().endsWith(".xls"))) {
            throw new BusinessRuleException(
                "نوع الملف غير صحيح. يجب أن يكون ملف Excel (.xlsx أو .xls)"
            );
        }
    }

    @Override
    public Workbook openWorkbook(MultipartFile file) throws IOException {
        validateExcelFile(file);
        try (InputStream inputStream = file.getInputStream()) {
            return WorkbookFactory.create(inputStream);
        }
    }

    @Override
    public Workbook openWorkbook(java.io.File file) throws IOException {
        if (file == null || !file.exists()) {
            throw new IOException("Excel file does not exist on disk");
        }
        return WorkbookFactory.create(file);
    }

    @Override
    public Sheet getDataSheet(Workbook workbook) {
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            String sheetName = workbook.getSheetName(i).trim();
            if (sheetName.equalsIgnoreCase("Data")) {
                log.info("[ExcelParser] Found requested data sheet: {}", sheetName);
                return workbook.getSheetAt(i);
            }
        }

        String[] possibleNames = {"Members", "الأعضاء", "المنتفعين", "الاعضاء", "Sheet1", "البيانات"};
        for (String name : possibleNames) {
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                String sheetName = workbook.getSheetName(i);
                if (sheetName.equalsIgnoreCase(name) || sheetName.toLowerCase().contains(name.toLowerCase())) {
                    if (!workbook.isSheetHidden(i)) {
                        log.info("[ExcelParser] Found data sheet by name: {}", sheetName);
                        return workbook.getSheetAt(i);
                    }
                }
            }
        }
        
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            String sheetName = workbook.getSheetName(i).toLowerCase();
            if (!workbook.isSheetHidden(i) && 
                !sheetName.contains("lookup") && 
                !sheetName.contains("جهات") && 
                !sheetName.contains("قوالب")) {
                log.info("[ExcelParser] Falling back to first visible data-like sheet: {}", workbook.getSheetName(i));
                return workbook.getSheetAt(i);
            }
        }
        
        for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
            if (!workbook.isSheetHidden(i)) {
                return workbook.getSheetAt(i);
            }
        }
        
        throw new BusinessRuleException("لم يتم العثور على ورقة بيانات صالحة في الملف");
    }

    @Override
    public boolean isEmptyRow(Row row) {
        if (row == null) return true;
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String value = getCellValueAsString(cell);
                if (value != null && !value.trim().isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }

    @Override
    public String getCellValueAsString(Cell cell) {
        if (cell == null) return null;
        try {
            switch (cell.getCellType()) {
                case STRING: return cell.getStringCellValue().trim();
                case NUMERIC:
                    if (DateUtil.isCellDateFormatted(cell)) {
                        Date date = cell.getDateCellValue();
                        return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate().toString();
                    } else {
                        double numValue = cell.getNumericCellValue();
                        if (numValue == Math.floor(numValue)) return String.valueOf((long) numValue);
                        return String.valueOf(numValue);
                    }
                case BOOLEAN: return String.valueOf(cell.getBooleanCellValue());
                case FORMULA:
                    try { return cell.getStringCellValue().trim(); }
                    catch (Exception e) {
                        try {
                            double numValue = cell.getNumericCellValue();
                            if (numValue == Math.floor(numValue)) return String.valueOf((long) numValue);
                            return String.valueOf(numValue);
                        } catch (Exception ex) { return null; }
                    }
                case BLANK:
                default: return null;
            }
        } catch (Exception e) {
            log.warn("[ExcelParser] Error reading cell value: {}", e.getMessage());
            return null;
        }
    }

    @Override
    public LocalDate getCellValueAsDate(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                Date date = cell.getDateCellValue();
                return date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            } else if (cell.getCellType() == CellType.STRING) {
                return LocalDate.parse(cell.getStringCellValue().trim());
            }
        } catch (Exception e) {
            log.warn("[ExcelParser] Error parsing date from cell: {}", e.getMessage());
        }
        return null;
    }

    @Override
    public Integer getCellValueAsInteger(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) return (int) cell.getNumericCellValue();
            else if (cell.getCellType() == CellType.STRING) {
                String val = cell.getStringCellValue().trim();
                return val.isEmpty() ? null : Integer.parseInt(val);
            }
        } catch (Exception e) {
            log.warn("[ExcelParser] Error parsing integer from cell: {}", e.getMessage());
        }
        return null;
    }

    @Override
    public Double getCellValueAsDouble(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) return cell.getNumericCellValue();
            else if (cell.getCellType() == CellType.STRING) {
                String val = cell.getStringCellValue().trim();
                return val.isEmpty() ? null : Double.parseDouble(val);
            }
        } catch (Exception e) {
            log.warn("[ExcelParser] Error parsing double from cell: {}", e.getMessage());
        }
        return null;
    }

    @Override
    public Boolean getCellValueAsBoolean(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.BOOLEAN) return cell.getBooleanCellValue();
            else if (cell.getCellType() == CellType.STRING) {
                String v = cell.getStringCellValue().trim().toLowerCase();
                if (v.equals("true") || v.equals("yes") || v.equals("1") || v.equals("نعم") || v.equals("صحيح")) return true;
                if (v.equals("false") || v.equals("no") || v.equals("0") || v.equals("لا") || v.equals("خطأ")) return false;
            } else if (cell.getCellType() == CellType.NUMERIC) return cell.getNumericCellValue() != 0;
        } catch (Exception e) {
            log.warn("[ExcelParser] Error parsing boolean from cell: {}", e.getMessage());
        }
        return null;
    }

    @Override
    public Integer findColumnIndex(Row headerRow, String... headerNames) {
        if (headerRow == null || headerNames == null || headerNames.length == 0) return null;
        for (int i = 0; i < headerRow.getLastCellNum(); i++) {
            Cell cell = headerRow.getCell(i);
            if (cell == null) continue;
            String val = getCellValueAsString(cell);
            if (val == null) continue;
            val = val.replace("*", "").trim();
            String[] parts = val.split("[\\r\\n]+");
            for (String name : headerNames) {
                String n = name.toLowerCase().trim();
                if (val.equalsIgnoreCase(name) || val.toLowerCase().contains(n) || n.contains(val.toLowerCase())) return i;
                for (String p : parts) {
                    String pt = p.trim();
                    if (pt.equalsIgnoreCase(name) || pt.toLowerCase().contains(n) || n.contains(pt.toLowerCase())) return i;
                }
            }
        }
        return null;
    }
}
