package com.waad.tba.infrastructure.adapter;

import com.waad.tba.infrastructure.port.DocumentService;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.*;

/**
 * محول (Adapter) لمكتبة Apache POI لتنفيذ واجهة DocumentService.
 */
@Slf4j
@Component
public class PoiExcelAdapter implements DocumentService {

    @Override
    public List<Map<String, String>> readExcel(InputStream inputStream, String sheetName) {
        log.info("بدء قراءة ملف Excel من الـ InputStream");
        List<Map<String, String>> data = new ArrayList<>();
        
        try (Workbook workbook = WorkbookFactory.create(inputStream)) {
            Sheet sheet = (sheetName != null && !sheetName.isEmpty()) 
                    ? workbook.getSheet(sheetName) 
                    : workbook.getSheetAt(0);
            
            if (sheet == null) {
                log.warn("لم يتم العثور على ورقة العمل باسم: {}", sheetName);
                return data;
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) return data;

            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                headers.add(getCellValueAsString(cell));
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                Map<String, String> rowData = new HashMap<>();
                for (int j = 0; j < headers.size(); j++) {
                    Cell cell = row.getCell(j);
                    rowData.put(headers.get(j), getCellValueAsString(cell));
                }
                data.add(rowData);
            }
        } catch (Exception e) {
            log.error("خطأ أثناء قراءة ملف Excel", e);
            throw new RuntimeException("Error reading Excel file", e);
        }
        
        return data;
    }

    @Override
    public byte[] createExcel(List<Map<String, Object>> data, String sheetName) {
        log.info("بدء إنشاء ملف Excel لبيانات بحجم: {}", data.size());
        
        try (Workbook workbook = WorkbookFactory.create(true);
             ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            
            Sheet sheet = workbook.createSheet(sheetName != null ? sheetName : "Data");
            
            if (data == null || data.isEmpty()) {
                workbook.write(bos);
                return bos.toByteArray();
            }

            // إنشاء الهيدر
            Row headerRow = sheet.createRow(0);
            Set<String> keys = data.get(0).keySet();
            int colIdx = 0;
            for (String key : keys) {
                headerRow.createCell(colIdx++).setCellValue(key);
            }

            // كتابة البيانات
            int rowIdx = 1;
            for (Map<String, Object> entry : data) {
                Row row = sheet.createRow(rowIdx++);
                int cIdx = 0;
                for (String key : keys) {
                    Object value = entry.get(key);
                    Cell cell = row.createCell(cIdx++);
                    if (value instanceof Number) {
                        cell.setCellValue(((Number) value).doubleValue());
                    } else if (value instanceof Boolean) {
                        cell.setCellValue((Boolean) value);
                    } else if (value instanceof Date) {
                        cell.setCellValue((Date) value);
                    } else {
                        cell.setCellValue(value != null ? value.toString() : "");
                    }
                }
            }

            workbook.write(bos);
            return bos.toByteArray();
        } catch (Exception e) {
            log.error("خطأ أثناء إنشاء ملف Excel", e);
            throw new RuntimeException("Error creating Excel file", e);
        }
    }

    @Override
    public boolean isValidExcelFormat(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase();
        return lower.endsWith(".xlsx") || lower.endsWith(".xls");
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        try {
            DataFormatter formatter = new DataFormatter();
            return formatter.formatCellValue(cell).trim();
        } catch (Exception e) {
            return "";
        }
    }
}
