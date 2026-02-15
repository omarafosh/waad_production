package com.waad.tba.common.excel.service;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;

/**
 * واجهة خدمة تحليل ملفات Excel.
 * توفر عمليات عامة لقراءة وفحص ملفات الإكسل بشكل مجرد.
 */
public interface ExcelParserService {

    /**
     * التحقق من صحة ملف Excel.
     */
    void validateExcelFile(MultipartFile file);

    /**
     * فتح كتاب عمل (Workbook) من ملف Multipart.
     */
    Workbook openWorkbook(MultipartFile file) throws IOException;

    /**
     * فتح كتاب عمل (Workbook) من ملف محلي.
     */
    Workbook openWorkbook(java.io.File file) throws IOException;

    /**
     * جلب ورقة البيانات الأولى الصالحة.
     */
    Sheet getDataSheet(Workbook workbook);

    /**
     * التحقق مما إذا كان الصف فارغاً.
     */
    boolean isEmptyRow(Row row);

    /**
     * جلب قيمة الخلية كنص.
     */
    String getCellValueAsString(Cell cell);

    /**
     * جلب قيمة الخلية كـ LocalDate.
     */
    LocalDate getCellValueAsDate(Cell cell);

    /**
     * جلب قيمة الخلية كـ Integer.
     */
    Integer getCellValueAsInteger(Cell cell);

    /**
     * جلب قيمة الخلية كـ Double.
     */
    Double getCellValueAsDouble(Cell cell);

    /**
     * جلب قيمة الخلية كـ Boolean.
     */
    Boolean getCellValueAsBoolean(Cell cell);

    /**
     * البحث عن مؤشر العمود بواسطة اسم الهيدر.
     */
    Integer findColumnIndex(Row headerRow, String... headerNames);
}
