package com.waad.tba.v3.core.infrastructure.excel;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Unified Excel Service for Version 3.
 * Handles generic Import, Export, and Template Generation using @ExcelColumn annotation.
 */
@Service
public class ExcelService {

    /**
     * Exports a list of data to an Excel byte array.
     */
    public <T> byte[] exportToExcel(List<T> data, Class<T> clazz) throws IOException, IllegalAccessException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Data");
            List<Field> fields = getSortedExcelFields(clazz);

            // Create Header Row
            Row headerRow = sheet.createRow(0);
            CellStyle headerStyle = createHeaderStyle(workbook);

            for (int i = 0; i < fields.size(); i++) {
                Cell cell = headerRow.createCell(i);
                ExcelColumn ann = fields.get(i).getAnnotation(ExcelColumn.class);
                cell.setCellValue(ann.name());
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 20 * 256);
            }

            // Create Data Rows
            int rowIdx = 1;
            for (T item : data) {
                Row row = sheet.createRow(rowIdx++);
                for (int i = 0; i < fields.size(); i++) {
                    Field field = fields.get(i);
                    field.setAccessible(true);
                    Object value = field.get(item);
                    if (value != null) {
                        row.createCell(i).setCellValue(value.toString());
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Generates an empty Excel template based on the DTO structure.
     */
    public <T> byte[] generateTemplate(Class<T> clazz) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Template");
            List<Field> fields = getSortedExcelFields(clazz);

            Row headerRow = sheet.createRow(0);
            CellStyle headerStyle = createHeaderStyle(workbook);

            for (int i = 0; i < fields.size(); i++) {
                Cell cell = headerRow.createCell(i);
                ExcelColumn ann = fields.get(i).getAnnotation(ExcelColumn.class);
                cell.setCellValue(ann.name() + (ann.required() ? " *" : ""));
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 20 * 256);
                
                if (!ann.description().isEmpty()) {
                    // Optional: Add comment/note here
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * Imports data from an Excel stream into a list of DTOs.
     */
    public <T> List<T> importFromExcel(InputStream inputStream, Class<T> clazz) throws Exception {
        List<T> resultList = new ArrayList<>();
        try (Workbook workbook = new XSSFWorkbook(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);
            List<Field> fields = getSortedExcelFields(clazz);
            
            // Map header names to column indices
            Row headerRow = sheet.getRow(0);
            Map<String, Integer> headerMap = new HashMap<>();
            for (Cell cell : headerRow) {
                headerMap.put(cell.getStringCellValue().replace(" *", ""), cell.getColumnIndex());
            }

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                T instance = clazz.getDeclaredConstructor().newInstance();
                boolean hasData = false;

                for (Field field : fields) {
                    ExcelColumn ann = field.getAnnotation(ExcelColumn.class);
                    Integer colIdx = headerMap.get(ann.name());
                    if (colIdx != null) {
                        Cell cell = row.getCell(colIdx);
                        if (cell != null) {
                            Object value = getCellValue(cell, field.getType());
                            if (value != null) {
                                field.setAccessible(true);
                                field.set(instance, value);
                                hasData = true;
                            }
                        }
                    }
                }
                if (hasData) resultList.add(instance);
            }
        }
        return resultList;
    }

    private List<Field> getSortedExcelFields(Class<?> clazz) {
        return Arrays.stream(clazz.getDeclaredFields())
                .filter(f -> f.isAnnotationPresent(ExcelColumn.class))
                .sorted(Comparator.comparingInt(f -> f.getAnnotation(ExcelColumn.class).order()))
                .collect(Collectors.toList());
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        return style;
    }

    private Object getCellValue(Cell cell, Class<?> type) {
        DataFormatter formatter = new DataFormatter();
        String val = formatter.formatCellValue(cell);
        if (val == null || val.trim().isEmpty()) return null;

        if (type == String.class) return val;
        if (type == Long.class || type == long.class) return Long.valueOf(val);
        if (type == Integer.class || type == int.class) return Integer.valueOf(val);
        if (type == Double.class || type == double.class) return Double.valueOf(val);
        if (type == Boolean.class || type == boolean.class) return Boolean.valueOf(val);
        
        return val;
    }
}
